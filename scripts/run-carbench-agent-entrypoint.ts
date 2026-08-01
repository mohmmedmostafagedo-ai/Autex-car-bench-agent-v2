/**
 * CAR-bench Track 2 agent entrypoint.
 *
 * Reads newline-delimited JSON requests from stdin, one per turn, of the form
 * CarBenchGenerateInput (see car-bench-agent-adapter.ts), and writes the
 * resulting CarBenchAdapterMessage as newline-delimited JSON to stdout.
 *
 * State is kept in-process across turns for a single task/trial. The
 * evaluator is expected to start one process per task/trial and pipe one
 * line at a time.
 *
 * All model/provider configuration is read from environment variables only
 * (AGENT_LLM, AGENT_API_BASE, AGENT_API_KEY, AGENT_TEMPERATURE,
 * AGENT_REASONING_EFFORT, AGENT_THINKING_BUDGET_TOKENS, AGENT_API_STYLE).
 * See car-bench-agent-adapter.ts for the full interface.
 */
import readline from 'node:readline';
import { generate_next_message, get_init_state, type CarBenchAdapterState, type CarBenchGenerateInput } from '../src/lib/car-bench-agent-adapter';

let state: CarBenchAdapterState = get_init_state();

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const input = JSON.parse(trimmed) as CarBenchGenerateInput | { reset: true };

    if ('reset' in input && input.reset) {
      state = get_init_state();
      process.stdout.write(`${JSON.stringify({ ok: true, reset: true })}\n`);
      return;
    }

    const result = await generate_next_message(state, input as CarBenchGenerateInput);
    state = result.state;
    process.stdout.write(`${JSON.stringify(result.message)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      role: 'assistant',
      content: 'Agent harness error: failed to process turn.',
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })}\n`);
  }
});

rl.on('close', () => {
  process.exit(0);
});
