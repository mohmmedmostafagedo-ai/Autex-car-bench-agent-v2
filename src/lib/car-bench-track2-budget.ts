export type Track2CallKind = 'planner' | 'sampler' | 'verifier' | 'executor' | 'finalizer';

export type Track2CallRecord = {
  kind: Track2CallKind;
  sequentialStep: number;
  promptTokens: number;
  completionTokens: number;
  thinkingTokens: number;
  parallelGroup?: string;
};

export type Track2BudgetConfig = {
  maxSequentialCallsPerBaselineStep: number;
  maxAverageTokensPerTask: number;
};

export type Track2BudgetSnapshot = {
  sequentialCalls: number;
  promptTokens: number;
  completionTokens: number;
  thinkingTokens: number;
  totalTokens: number;
  remainingSequentialCalls: number;
  remainingTaskTokens: number;
  isSequentialCompliant: boolean;
  isTokenCompliant: boolean;
};

export const TRACK2_DEFAULT_BUDGET: Track2BudgetConfig = {
  maxSequentialCallsPerBaselineStep: 5,
  maxAverageTokensPerTask: 500_000,
};

export function summarizeTrack2Budget(
  calls: Track2CallRecord[],
  config: Track2BudgetConfig = TRACK2_DEFAULT_BUDGET
): Track2BudgetSnapshot {
  const sequentialCalls = new Set(calls.map((call) => call.sequentialStep)).size;
  const promptTokens = calls.reduce((sum, call) => sum + call.promptTokens, 0);
  const completionTokens = calls.reduce((sum, call) => sum + call.completionTokens, 0);
  const thinkingTokens = calls.reduce((sum, call) => sum + call.thinkingTokens, 0);
  const totalTokens = promptTokens + completionTokens + thinkingTokens;

  return {
    sequentialCalls,
    promptTokens,
    completionTokens,
    thinkingTokens,
    totalTokens,
    remainingSequentialCalls: Math.max(0, config.maxSequentialCallsPerBaselineStep - sequentialCalls),
    remainingTaskTokens: Math.max(0, config.maxAverageTokensPerTask - totalTokens),
    isSequentialCompliant: sequentialCalls <= config.maxSequentialCallsPerBaselineStep,
    isTokenCompliant: totalTokens <= config.maxAverageTokensPerTask,
  };
}

export function toA2ATurnMetrics(snapshot: Track2BudgetSnapshot) {
  // CAR-bench Track 2 submission rule: report token usage through the
  // standard A2A turn_metrics fields only. Sequential-call depth must be
  // documented in the technical report's architecture diagram, not emitted
  // as a custom metadata field on the live agent response.
  return {
    turn_metrics: {
      prompt_tokens: snapshot.promptTokens,
      completion_tokens: snapshot.completionTokens,
      thinking_tokens: snapshot.thinkingTokens,
    },
  };
}

export function assertTrack2Budget(snapshot: Track2BudgetSnapshot) {
  if (!snapshot.isSequentialCompliant) {
    throw new Error(`Track 2 sequential-call budget exceeded: ${snapshot.sequentialCalls} > ${TRACK2_DEFAULT_BUDGET.maxSequentialCallsPerBaselineStep}`);
  }

  if (!snapshot.isTokenCompliant) {
    throw new Error(`Track 2 token budget exceeded: ${snapshot.totalTokens} > ${TRACK2_DEFAULT_BUDGET.maxAverageTokensPerTask}`);
  }
}
