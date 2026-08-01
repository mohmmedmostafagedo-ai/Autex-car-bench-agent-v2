import { generateCarBenchReliabilityDecision, type CarBenchAgentInput } from '../src/lib/car-bench-reliability-agent';
import { runMpaeDecision, type MpaeTelemetry } from '../src/lib/mpae';
import { assertTrack2Budget, summarizeTrack2Budget, toA2ATurnMetrics, type Track2CallRecord } from '../src/lib/car-bench-track2-budget';

const baseTools = [
  { name: 'get_sunroof_and_sunshade_position' },
  { name: 'get_weather' },
  { name: 'open_close_sunshade', requiredParameters: ['percentage'] },
  { name: 'open_close_sunroof', requiredParameters: ['percentage'] },
];

const reliabilityCases: Array<{ id: string; expectedAction: string; input: CarBenchAgentInput }> = [
  {
    id: 'base_weather_policy_first',
    expectedAction: 'tool_calls',
    input: {
      taskType: 'base',
      userMessage: 'Open the sunroof halfway.',
      availableTools: baseTools,
      context: { weatherChecked: false, sunshadePosition: 0, preferredSunroofPercentage: 50 },
    },
  },
  {
    id: 'hallucination_missing_weather_tool',
    expectedAction: 'refuse_or_defer',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools.filter((tool) => tool.name !== 'get_weather'),
      removedPart: 'get_weather',
      context: { weatherChecked: false, sunshadePosition: 100 },
    },
  },
  {
    id: 'hallucination_missing_sunshade_tool',
    expectedAction: 'refuse_or_defer',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50% and open the sunshade first if needed.',
      availableTools: baseTools.filter((tool) => tool.name !== 'open_close_sunshade'),
      removedPart: 'open_close_sunshade',
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 0 },
    },
  },
  {
    id: 'hallucination_missing_tool_response_field',
    expectedAction: 'refuse_or_defer',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools,
      removedPart: 'result.get_sunroof_and_sunshade_position.sunshade_position',
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100 },
    },
  },
  {
    id: 'hallucination_missing_sunroof_percentage_parameter',
    expectedAction: 'refuse_or_defer',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools.map((tool) =>
        tool.name === 'open_close_sunroof' ? { ...tool, requiredParameters: [] } : tool
      ),
      removedPart: 'open_close_sunroof.percentage',
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100 },
    },
  },
  {
    id: 'tool_result_validator_missing_sunshade_position',
    expectedAction: 'refuse_or_defer',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools,
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100 },
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
    id: 'tool_result_validator_null_weather_result',
    expectedAction: 'refuse_or_defer',
    input: {
      taskType: 'hallucination',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools,
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100 },
      observedToolResults: [
        {
          toolName: 'get_weather',
          status: 'SUCCESS',
          result: null,
        },
      ],
    },
  },
  {
    id: 'disambiguation_internal_preference',
    expectedAction: 'tool_calls',
    input: {
      taskType: 'disambiguation',
      userMessage: 'Open the sunroof please.',
      availableTools: baseTools,
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100, preferredSunroofPercentage: 50 },
    },
  },
  {
    id: 'disambiguation_user_clarification_required',
    expectedAction: 'clarify',
    input: {
      taskType: 'disambiguation',
      userMessage: 'Open the sunroof please.',
      availableTools: baseTools,
      context: { weatherChecked: true, weatherCondition: 'clear', sunshadePosition: 100 },
    },
  },
  {
    id: 'rain_requires_confirmation',
    expectedAction: 'clarify',
    input: {
      taskType: 'base',
      userMessage: 'Open the sunroof to 50%.',
      availableTools: baseTools,
      context: { weatherChecked: true, weatherCondition: 'cloudy_and_rain', userConfirmedWeatherRisk: false, sunshadePosition: 100 },
    },
  },
];

const mpaeCases: Array<{ id: string; expectedStrategy: string; telemetry: MpaeTelemetry }> = [
  { id: 'healthy_idle', expectedStrategy: 'monitor', telemetry: { vibration: 42, rpm: 850, temp: 86, ltft: 2, healthScore: 96 } },
  { id: 'fuel_trim_drift', expectedStrategy: 'stop-and-inspect', telemetry: { vibration: 76, rpm: 1320, temp: 94, ltft: 12, healthScore: 78 } },
  { id: 'thermal_vibration_critical', expectedStrategy: 'stop-and-inspect', telemetry: { vibration: 108, rpm: 3100, temp: 111, ltft: 18, healthScore: 42 } },
  { id: 'unstable_low_health', expectedStrategy: 'stop-and-inspect', telemetry: { vibration: 88, rpm: 2400, temp: 101, ltft: 9, healthScore: 34 } },
  { id: 'health_border_59', expectedStrategy: 'stop-and-inspect', telemetry: { vibration: 48, rpm: 900, temp: 88, ltft: 3, healthScore: 59 } },
  { id: 'temp_border_106', expectedStrategy: 'stop-and-inspect', telemetry: { vibration: 48, rpm: 900, temp: 106, ltft: 3, healthScore: 92 } },
];

const track2Calls: Track2CallRecord[] = [
  { kind: 'planner', sequentialStep: 1, promptTokens: 24_000, completionTokens: 2_500, thinkingTokens: 10_000 },
  { kind: 'sampler', sequentialStep: 2, parallelGroup: 'candidate-ensemble', promptTokens: 30_000, completionTokens: 3_200, thinkingTokens: 14_000 },
  { kind: 'sampler', sequentialStep: 2, parallelGroup: 'candidate-ensemble', promptTokens: 28_000, completionTokens: 3_100, thinkingTokens: 13_500 },
  { kind: 'sampler', sequentialStep: 2, parallelGroup: 'candidate-ensemble', promptTokens: 27_000, completionTokens: 3_000, thinkingTokens: 13_000 },
  { kind: 'verifier', sequentialStep: 3, promptTokens: 35_000, completionTokens: 2_400, thinkingTokens: 18_000 },
  { kind: 'executor', sequentialStep: 4, promptTokens: 19_000, completionTokens: 1_800, thinkingTokens: 7_000 },
  { kind: 'finalizer', sequentialStep: 5, promptTokens: 11_000, completionTokens: 1_400, thinkingTokens: 4_000 },
];

const reliabilityResults = reliabilityCases.map((testCase) => {
  const decision = generateCarBenchReliabilityDecision(testCase.input);
  return {
    id: testCase.id,
    expectedAction: testCase.expectedAction,
    actualAction: decision.action,
    passed: decision.action === testCase.expectedAction,
    toolCalls: decision.toolCalls,
    notes: decision.reliabilityNotes,
  };
});

const mpaeResults = mpaeCases.map((testCase) => {
  const decision = runMpaeDecision(testCase.telemetry, { horizonSteps: 50 });
  return {
    id: testCase.id,
    expectedStrategy: testCase.expectedStrategy,
    actualStrategy: decision.recommendedStrategy,
    passed: decision.recommendedStrategy === testCase.expectedStrategy,
    futureRiskScore: decision.futureRiskScore,
    stabilityScore: decision.stabilityScore,
    maintenancePriority: decision.maintenancePriority,
    context: decision.context,
  };
});

const budgetSnapshot = summarizeTrack2Budget(track2Calls);
assertTrack2Budget(budgetSnapshot);

const summary = {
  reliability: {
    passed: reliabilityResults.filter((result) => result.passed).length,
    total: reliabilityResults.length,
    results: reliabilityResults,
  },
  mpae: {
    passed: mpaeResults.filter((result) => result.passed).length,
    total: mpaeResults.length,
    results: mpaeResults,
  },
  track2Budget: {
    snapshot: budgetSnapshot,
    a2aMetadata: toA2ATurnMetrics(budgetSnapshot),
  },
  overallPassed: reliabilityResults.every((result) => result.passed) && mpaeResults.every((result) => result.passed) && budgetSnapshot.isSequentialCompliant && budgetSnapshot.isTokenCompliant,
};

console.log(JSON.stringify(summary, null, 2));
