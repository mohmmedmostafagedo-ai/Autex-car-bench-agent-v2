import {
  assertTrack2Budget,
  summarizeTrack2Budget,
  toA2ATurnMetrics,
  type Track2CallRecord,
} from '../src/lib/car-bench-track2-budget';

const calls: Track2CallRecord[] = [
  { kind: 'planner', sequentialStep: 1, promptTokens: 18_000, completionTokens: 2_000, thinkingTokens: 8_000 },
  { kind: 'sampler', sequentialStep: 2, parallelGroup: 'tool-choice-ensemble', promptTokens: 22_000, completionTokens: 3_000, thinkingTokens: 12_000 },
  { kind: 'sampler', sequentialStep: 2, parallelGroup: 'tool-choice-ensemble', promptTokens: 21_500, completionTokens: 2_800, thinkingTokens: 11_700 },
  { kind: 'verifier', sequentialStep: 3, promptTokens: 14_000, completionTokens: 1_500, thinkingTokens: 5_000 },
  { kind: 'executor', sequentialStep: 4, promptTokens: 12_000, completionTokens: 1_200, thinkingTokens: 3_000 },
  { kind: 'finalizer', sequentialStep: 5, promptTokens: 8_000, completionTokens: 1_000, thinkingTokens: 2_500 },
];

const snapshot = summarizeTrack2Budget(calls);
assertTrack2Budget(snapshot);

console.log(JSON.stringify({ snapshot, a2aMetadata: toA2ATurnMetrics(snapshot) }, null, 2));
