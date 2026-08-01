import { generate_next_message, get_init_state } from '../src/lib/car-bench-agent-adapter';

const baseTools = [
  { name: 'get_sunroof_and_sunshade_position' },
  { name: 'get_weather' },
  { name: 'open_close_sunshade', requiredParameters: ['percentage'] },
  { name: 'open_close_sunroof', requiredParameters: ['percentage'] },
];

async function main() {
  const state = get_init_state();
  const result = await generate_next_message(state, {
    taskType: 'base',
    userMessage: 'Open the sunroof halfway.',
    availableTools: baseTools,
    vehicleContext: { weatherChecked: false, sunshadePosition: 0, preferredSunroofPercentage: 50 },
    telemetry: { vibration: 76, rpm: 1320, temp: 94, ltft: 12, healthScore: 78 },
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
