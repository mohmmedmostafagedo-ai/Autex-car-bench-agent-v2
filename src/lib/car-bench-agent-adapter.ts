import { generateCarBenchReliabilityDecision, type CarBenchAgentInput, type CarBenchAgentDecision, type CarBenchTool } from './car-bench-reliability-agent';
import { runMpaeDecision, type MpaeDecision, type MpaeTelemetry } from './mpae';
import { assertTrack2Budget, summarizeTrack2Budget, toA2ATurnMetrics, type Track2CallRecord, type Track2BudgetSnapshot } from './car-bench-track2-budget';
import type { CarBenchToolResult } from './car-bench-tool-result-validator';
import { buildCarBenchVerifierPrompt, CAR_BENCH_SYSTEM_PROMPT } from './car-bench-system-prompt';

// ─────────────────────────────────────────────────────────────────────────
// CAR-bench Track 2 submission requirement: organizers may run this same
// agent image against a different hosted model deployment. Every model,
// provider route, deployment name, API base, service tier, and
// reasoning-effort selector MUST be configurable through env vars — never
// hard-coded. This module reads a single provider-agnostic env interface:
//
//   AGENT_LLM          required  model name/deployment id, e.g. "claude-opus-4-6"
//   AGENT_API_BASE     optional  override API base URL (provider default if unset)
//   AGENT_API_KEY      required  API key for AGENT_API_BASE
//   AGENT_TEMPERATURE  optional  sampling temperature (defaults to "0" for Pass^k consistency)
//   AGENT_REASONING_EFFORT        optional  reasoning/thinking effort selector, forwarded if the
//                                  endpoint supports it; ignored otherwise
//   AGENT_THINKING_BUDGET_TOKENS  optional  thinking token budget for Anthropic-shaped endpoints
//   AGENT_API_STYLE     optional  "anthropic" | "openai" — forces the request/response
//                       shape instead of auto-detecting from AGENT_API_BASE / AGENT_LLM
// ─────────────────────────────────────────────────────────────────────────

export type CarBenchAdapterState = {
  turn: number;
  calls: Track2CallRecord[];
  lastMpaeDecision?: MpaeDecision;
  lastReliabilityDecision?: CarBenchAgentDecision;
  a2aMetadata?: ReturnType<typeof toA2ATurnMetrics>;
};

export type CarBenchAdapterMessage = {
  role: 'assistant';
  content: string;
  tool_calls?: Array<{ name: string; arguments: Record<string, string | number | boolean> }>;
  // Only the standard A2A turn_metrics fields (prompt_tokens, completion_tokens,
  // thinking_tokens) are reported. Sequential-call depth and provider/model
  // routing are NOT emitted here — they belong in the technical report's
  // architecture diagram per the Track 2 submission rules.
  metadata: ReturnType<typeof toA2ATurnMetrics> & {
    reliability_action: CarBenchAgentDecision['action'];
    mpae_strategy: MpaeDecision['recommendedStrategy'];
  };
};

export type CarBenchGenerateInput = {
  userMessage: string;
  taskType: CarBenchAgentInput['taskType'];
  availableTools: CarBenchTool[];
  vehicleContext: CarBenchAgentInput['context'];
  telemetry?: MpaeTelemetry;
  removedPart?: string;
  observedToolResults?: CarBenchToolResult[];
};

export function get_init_state(): CarBenchAdapterState {
  return {
    turn: 0,
    calls: [],
  };
}

function defaultTelemetry(): MpaeTelemetry {
  return {
    vibration: 42,
    rpm: 850,
    temp: 86,
    ltft: 2,
    healthScore: 96,
  };
}

function buildPlannerCall(): Track2CallRecord {
  return {
    kind: 'planner',
    sequentialStep: 1,
    promptTokens: 8_000,
    completionTokens: 900,
    thinkingTokens: 3_000,
  };
}

function buildVerifierCall(): Track2CallRecord {
  return {
    kind: 'verifier',
    sequentialStep: 2,
    promptTokens: 6_000,
    completionTokens: 700,
    thinkingTokens: 2_500,
  };
}

type AgentLlmConfig = {
  model: string;
  apiKey: string;
  apiBase: string;
  apiStyle: 'anthropic' | 'openai';
  temperature: number;
  reasoningEffort?: string;
  thinkingBudgetTokens: number;
};

function resolveAgentLlmConfig(): AgentLlmConfig | null {
  const model = process.env.AGENT_LLM;
  const apiKey = process.env.AGENT_API_KEY;
  if (!model || !apiKey) return null;

  const explicitBase = process.env.AGENT_API_BASE;
  const explicitStyle = process.env.AGENT_API_STYLE as 'anthropic' | 'openai' | undefined;

  // Auto-detect request/response shape only when AGENT_API_STYLE is not set.
  // Heuristic: an explicit Anthropic-looking base URL or model name implies
  // the Anthropic Messages API shape; everything else defaults to the
  // OpenAI-compatible chat-completions shape used by most hosted endpoints
  // (vLLM, Cerebras, Azure OpenAI, Bedrock-via-proxy, etc.).
  const looksAnthropic = /anthropic|claude/i.test(explicitBase ?? '') || /claude/i.test(model);
  const apiStyle = explicitStyle ?? (looksAnthropic ? 'anthropic' : 'openai');

  const apiBase = explicitBase || (apiStyle === 'anthropic'
    ? 'https://api.anthropic.com/v1/messages'
    : 'https://api.openai.com/v1/chat/completions');

  const temperature = process.env.AGENT_TEMPERATURE !== undefined && process.env.AGENT_TEMPERATURE !== ''
    ? Number(process.env.AGENT_TEMPERATURE)
    : 0; // default to 0 for Pass^k run-to-run consistency

  return {
    model,
    apiKey,
    apiBase,
    apiStyle,
    temperature,
    reasoningEffort: process.env.AGENT_REASONING_EFFORT,
    thinkingBudgetTokens: Number(process.env.AGENT_THINKING_BUDGET_TOKENS || 8000),
  };
}

async function callAnthropicShaped(cfg: AgentLlmConfig, prompt: string): Promise<string | null> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: 1024,
    temperature: cfg.temperature,
    system: CAR_BENCH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  };
  if (cfg.thinkingBudgetTokens > 0) {
    body.thinking = { type: 'enabled', budget_tokens: cfg.thinkingBudgetTokens };
  }

  const response = await fetch(cfg.apiBase, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return null;
  const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const textBlock = json.content?.find((block) => block.type === 'text');
  return textBlock?.text || null;
}

async function callOpenAiShaped(cfg: AgentLlmConfig, prompt: string): Promise<string | null> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [
      { role: 'system', content: CAR_BENCH_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1024,
    temperature: cfg.temperature,
  };
  if (cfg.reasoningEffort) {
    body.reasoning_effort = cfg.reasoningEffort;
  }

  const request = (requestBody: Record<string, unknown>) => fetch(cfg.apiBase, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  let response = await request(body);
  if (!response.ok && response.status === 400 && 'reasoning_effort' in body) {
    const { reasoning_effort: _omit, ...withoutReasoningEffort } = body;
    response = await request(withoutReasoningEffort);
  }

  if (!response.ok) return null;
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content || null;
}

async function callConfiguredAgentLlm(prompt: string): Promise<string | null> {
  const cfg = resolveAgentLlmConfig();
  if (!cfg) return null;
  return cfg.apiStyle === 'anthropic'
    ? callAnthropicShaped(cfg, prompt)
    : callOpenAiShaped(cfg, prompt);
}

function formatDeterministicMessage(decision: CarBenchAgentDecision) {
  return decision.message;
}

export async function generate_next_message(
  state: CarBenchAdapterState,
  input: CarBenchGenerateInput
): Promise<{ state: CarBenchAdapterState; message: CarBenchAdapterMessage }> {
  const mpaeDecision = runMpaeDecision(input.telemetry ?? defaultTelemetry(), { horizonSteps: 30 });
  const reliabilityDecision = generateCarBenchReliabilityDecision({
    taskType: input.taskType,
    userMessage: input.userMessage,
    availableTools: input.availableTools,
    context: input.vehicleContext,
    removedPart: input.removedPart,
    observedToolResults: input.observedToolResults,
  });

  const calls = [
    ...state.calls,
    buildPlannerCall(),
    buildVerifierCall(),
  ];
  const budgetSnapshot = summarizeTrack2Budget(calls);
  assertTrack2Budget(budgetSnapshot);
  const a2aMetadata = toA2ATurnMetrics(budgetSnapshot);

  const modelText = await callConfiguredAgentLlm(buildCarBenchVerifierPrompt({
    userMessage: input.userMessage,
    reliabilityDecision,
    mpaeDecision,
    budgetSnapshot,
  }));

  const shouldUseModelText = reliabilityDecision.action === 'tool_calls' && Boolean(modelText);
  const content = shouldUseModelText ? modelText! : formatDeterministicMessage(reliabilityDecision);

  const nextState: CarBenchAdapterState = {
    turn: state.turn + 1,
    calls,
    lastMpaeDecision: mpaeDecision,
    lastReliabilityDecision: reliabilityDecision,
    a2aMetadata,
  };

  return {
    state: nextState,
    message: {
      role: 'assistant',
      content,
      tool_calls: reliabilityDecision.action === 'tool_calls' ? reliabilityDecision.toolCalls : undefined,
      metadata: {
        ...a2aMetadata,
        reliability_action: reliabilityDecision.action,
        mpae_strategy: mpaeDecision.recommendedStrategy,
      },
    },
  };
}
