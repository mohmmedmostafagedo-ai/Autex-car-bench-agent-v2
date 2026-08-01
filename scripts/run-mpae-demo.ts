import { runMpaeDecision, type MpaeTelemetry } from '../src/lib/mpae';

const scenarios: Array<{ name: string; telemetry: MpaeTelemetry }> = [
  {
    name: 'Healthy idle',
    telemetry: { vibration: 42, rpm: 850, temp: 86, ltft: 2, healthScore: 96 },
  },
  {
    name: 'Fuel trim drift',
    telemetry: { vibration: 76, rpm: 1320, temp: 94, ltft: 12, healthScore: 78 },
  },
  {
    name: 'Critical overheat vibration',
    telemetry: { vibration: 108, rpm: 3100, temp: 111, ltft: 18, healthScore: 42 },
  },
];

for (const scenario of scenarios) {
  const decision = runMpaeDecision(scenario.telemetry, { horizonSteps: 30 });
  console.log(JSON.stringify({ name: scenario.name, ...decision }, null, 2));
}
