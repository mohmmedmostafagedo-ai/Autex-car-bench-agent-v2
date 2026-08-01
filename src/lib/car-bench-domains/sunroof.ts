import {
  type CarBenchAgentInput,
  type CarBenchAgentDecision,
  type CarBenchDomainModule,
  type CarBenchVehicleContext,
  type CarBenchTool,
  hasTool,
  toolSupportsParameter,
  extractPercentage,
} from './shared';

function includesSunroofIntent(message: string) {
  return /sunroof|fresh air|roof/i.test(message);
}

function isRainy(condition?: string) {
  return Boolean(condition?.toLowerCase().includes('rain'));
}

function canCallSunshade(tools: CarBenchTool[]) {
  return hasTool(tools, 'open_close_sunshade') && toolSupportsParameter(tools, 'open_close_sunshade', 'percentage');
}

function canCallSunroof(tools: CarBenchTool[]) {
  return hasTool(tools, 'open_close_sunroof') && toolSupportsParameter(tools, 'open_close_sunroof', 'percentage');
}

function needsSunshadeBeforeSunroof(context: CarBenchVehicleContext) {
  return (context.sunshadePosition ?? 0) < 100;
}

/**
 * get_weather's real CAR-bench signature (confirmed from the organizers'
 * own published trajectory example, since it isn't in this repo):
 *   get_weather(location_or_poi_id, month, day, time_hour_24hformat)
 * The previous version called get_weather with a hallucinated `reason`
 * argument that matches none of these -- that's what produced the
 * repeated JSON-parsing crash loop on hallucination tasks. We don't have
 * a reliable source for the vehicle's current location/date within this
 * agent, so rather than guess those values (which would just swap one
 * hallucination for another), we only issue the call when the caller has
 * supplied them via context; otherwise we refuse rather than fabricate.
 */
function buildWeatherCheckCall(context: CarBenchVehicleContext) {
  const { weatherLocationOrPoiId, weatherMonth, weatherDay, weatherHour24 } = context;
  if (
    weatherLocationOrPoiId === undefined ||
    weatherMonth === undefined ||
    weatherDay === undefined ||
    weatherHour24 === undefined
  ) {
    return null;
  }
  return {
    name: 'get_weather',
    arguments: {
      location_or_poi_id: weatherLocationOrPoiId,
      month: weatherMonth,
      day: weatherDay,
      time_hour_24hformat: weatherHour24,
    },
  };
}

function decide(input: CarBenchAgentInput): CarBenchAgentDecision {
  const notes: string[] = [];
  const message = input.userMessage;

  if (!hasTool(input.availableTools, 'get_sunroof_and_sunshade_position')) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot safely operate the sunroof because I cannot inspect the current sunroof and sunshade positions.',
      reliabilityNotes: ['Required observation tool is unavailable.'],
    };
  }

  if (!input.context.weatherChecked && hasTool(input.availableTools, 'get_weather')) {
    const weatherCall = buildWeatherCheckCall(input.context);
    if (!weatherCall) {
      return {
        action: 'refuse_or_defer',
        toolCalls: [],
        message: 'I cannot check the weather before opening the sunroof because I do not have the current location or time needed to call the weather tool.',
        reliabilityNotes: [
          'Avoided calling get_weather with fabricated location/date arguments; refusing instead.',
        ],
      };
    }
    notes.push('Weather must be checked before opening the sunroof.');
    return {
      action: 'tool_calls',
      toolCalls: [weatherCall],
      message: 'I will check the weather first before opening the sunroof.',
      reliabilityNotes: notes,
    };
  }

  if (!input.context.weatherChecked && !hasTool(input.availableTools, 'get_weather')) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot safely open the sunroof because the required weather-check capability is unavailable.',
      reliabilityNotes: ['Weather policy cannot be satisfied without get_weather.'],
    };
  }

  if (isRainy(input.context.weatherCondition) && !input.context.userConfirmedWeatherRisk) {
    return {
      action: 'clarify',
      toolCalls: [],
      message: 'It appears rainy. Please confirm that you still want the sunroof opened despite the weather risk.',
      reliabilityNotes: ['Rain risk requires explicit confirmation before action.'],
    };
  }

  const requestedPercentage = extractPercentage(message);
  const targetPercentage = requestedPercentage ?? input.context.preferredSunroofPercentage;

  if (targetPercentage === undefined) {
    return {
      action: 'clarify',
      toolCalls: [],
      message: 'What percentage would you like the sunroof opened to?',
      reliabilityNotes: ['No percentage supplied and no internal preference available.'],
    };
  }

  if (hasTool(input.availableTools, 'open_close_sunroof') && !toolSupportsParameter(input.availableTools, 'open_close_sunroof', 'percentage')) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot open the sunroof because the required percentage parameter is unavailable.',
      reliabilityNotes: ['Avoided calling open_close_sunroof without its required percentage parameter.'],
    };
  }

  if (!canCallSunroof(input.availableTools)) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot open the sunroof because the sunroof-control tool is unavailable.',
      reliabilityNotes: ['Required sunroof action tool is unavailable.'],
    };
  }

  if (needsSunshadeBeforeSunroof(input.context) && hasTool(input.availableTools, 'open_close_sunshade') && !toolSupportsParameter(input.availableTools, 'open_close_sunshade', 'percentage')) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot safely open the sunroof because the required sunshade percentage parameter is unavailable.',
      reliabilityNotes: ['Avoided calling open_close_sunshade without its required percentage parameter.'],
    };
  }

  if (needsSunshadeBeforeSunroof(input.context) && !canCallSunshade(input.availableTools)) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot safely open the sunroof because the sunshade must be fully opened first, but that tool is unavailable.',
      reliabilityNotes: ['Avoided hallucinating unsupported sunshade action.'],
    };
  }

  const toolCalls = [];
  if (needsSunshadeBeforeSunroof(input.context)) {
    toolCalls.push({ name: 'open_close_sunshade', arguments: { percentage: 100 } });
    notes.push('Sunshade is opened fully before sunroof to satisfy policy.');
  }
  toolCalls.push({ name: 'open_close_sunroof', arguments: { percentage: targetPercentage } });
  notes.push(`Sunroof target resolved to ${targetPercentage}%.`);

  return {
    action: 'tool_calls',
    toolCalls,
    message: `I can safely open the sunroof to ${targetPercentage}%.`,
    reliabilityNotes: notes,
  };
}

export const sunroofDomain: CarBenchDomainModule = {
  name: 'sunroof',
  matchesIntent: includesSunroofIntent,
  decide,
};
