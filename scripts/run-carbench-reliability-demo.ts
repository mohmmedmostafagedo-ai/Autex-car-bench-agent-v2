import { generateCarBenchReliabilityDecision, type CarBenchAgentInput } from '../src/lib/car-bench-reliability-agent';

const baseTools = [
  { name: 'get_sunroof_and_sunshade_position' },
  { name: 'get_weather' },
  { name: 'open_close_sunshade', requiredParameters: ['percentage'] },
  { name: 'open_close_sunroof', requiredParameters: ['percentage'] },
];

const scenarios: Array<{ name: string; input: CarBenchAgentInput }> = [
  {
    name: 'Base policy: must check weather first',
    input: {
      taskType: 'base',
      userMessage: 'Hey, can you open the sunroof a bit? Like, halfway?',
      availableTools: baseTools,
      context: { weatherChecked: false, sunshadePosition: 0, sunroofPosition: 0, preferredSunroofPercentage: 50 },
    },
  },
  {
    name: 'Hallucination guard: sunshade tool removed',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%. If you need to open the sunshade first, open it fully to 100%.',
      availableTools: baseTools.filter((tool) => tool.name !== 'open_close_sunshade'),
      removedPart: 'open_close_sunshade',
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 0, sunroofPosition: 0 },
    },
  },
  {
    name: 'Hallucination guard: required response field removed',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools,
      removedPart: 'result.get_sunroof_and_sunshade_position.sunshade_position',
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100, sunroofPosition: 0 },
    },
  },
  {
    name: 'Tool result validator: partial observation result',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools,
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100, sunroofPosition: 0 },
      observedToolResults: [
        {
          toolName: 'get_sunroof_and_sunshade_position',
          status: 'SUCCESS',
          result: { sunroof_position: 0 },
        },
      ],
    },
  },
  {
    name: 'Disambiguation: use stored preference after rain confirmation',
    input: {
      taskType: 'disambiguation',
      userMessage: 'I still want to open the sunroof. If the sunshade needs to open first, open it all the way.',
      availableTools: baseTools,
      context: {
        weatherChecked: true,
        weatherCondition: 'cloudy_and_rain',
        userConfirmedWeatherRisk: true,
        sunshadePosition: 0,
        sunroofPosition: 0,
        preferredSunroofPercentage: 50,
      },
    },
  },
];

for (const scenario of scenarios) {
  const decision = generateCarBenchReliabilityDecision(scenario.input);
  console.log(JSON.stringify({ name: scenario.name, decision }, null, 2));
}
