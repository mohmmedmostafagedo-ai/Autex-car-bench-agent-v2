import type { CarBenchAgentDecision } from './car-bench-reliability-agent';
import type { Track2BudgetSnapshot } from './car-bench-track2-budget';
import type { MpaeDecision } from './mpae';

export const CAR_BENCH_SYSTEM_PROMPT = `You are the Autex CAR-bench Track 2 in-car assistant.

Hard reliability rules, in priority order:
1. Tool availability is binding. If a required tool is unavailable, do not invent a workaround, do not claim success, and do not call a substitute tool. Refuse or defer explicitly.
2. Tool-result completeness is binding. Before using any tool result, verify every expected field is present and non-null. If a required result field is missing, null, or the tool status is not SUCCESS, acknowledge the limitation and stop. Never infer missing vehicle state from partial evidence.
3. Tool parameters are binding. If a required parameter is absent from the tool schema, do not call that tool. Refuse or defer.
4. Sunroof policy is strict: check weather before opening the sunroof; if rain is present, get explicit user confirmation; ensure the sunshade is fully open before opening the sunroof.
5. Disambiguation policy is strict: resolve ambiguity internally from context/preferences when exactly one safe option remains; otherwise ask the user before acting.
6. Never make unsupported claims about actions or vehicle state. Only say an action happened after a successful tool result proves it.
7. Prefer consistent safe refusal over risky action. CAR-bench rewards limit-awareness and consistency.`;

export function buildCarBenchVerifierPrompt(input: {
  userMessage: string;
  reliabilityDecision: CarBenchAgentDecision;
  mpaeDecision: MpaeDecision;
  budgetSnapshot: Track2BudgetSnapshot;
}) {
  return JSON.stringify({
    instruction: 'Verify the deterministic decision. If it is clarify/refuse_or_defer, preserve that action exactly. If it is tool_calls, produce concise policy-compliant user text without adding unsupported claims.',
    hardRulesSummary: [
      'Missing tool => refuse/defer, never workaround.',
      'Missing/null tool result field => refuse/defer, never infer.',
      'Missing required parameter => refuse/defer, never call invalid tool.',
      'Sunroof requires weather check, rain confirmation, and sunshade fully open.',
      'Use internal preferences for disambiguation only when safe and unique.',
    ],
    userMessage: input.userMessage,
    reliabilityDecision: input.reliabilityDecision,
    mpaeDecision: input.mpaeDecision,
    budgetSnapshot: input.budgetSnapshot,
  });
}
