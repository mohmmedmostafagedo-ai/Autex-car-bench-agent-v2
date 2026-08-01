# CAR-bench Track 2 Adaptation Plan

## Why this matters

Nahed Innovation has been selected for Track 2 of the CAR-bench Challenge @ IJCAI-ECAI 2026. Track 2 now requires direct Cerebras `gpt-oss` inference instead of the previously planned Codex-agent runtime.

The Track 2 design goal for Autex is therefore:

```text
Use fast Cerebras inference for more reliability checks while staying inside strict compute accounting.
```

## External constraints to implement

| Constraint | Project rule |
| --- | --- |
| Provider/runtime | Direct Cerebras-hosted `gpt-oss` inference |
| Sequential LLM calls | At most 5 sequential LLM calls per baseline LLM step |
| Parallel calls | Allowed inside a step; counted as the same sequential depth when grouped |
| Token usage | Average up to 500K tokens per task, including prompt, reasoning/thinking, and output |
| Reporting | Aggregate token usage into A2A `Message.metadata.turn_metrics` |
| Report artifact | Include an architecture diagram for sequential-call audit |

## Proposed Autex / MPAE Track 2 harness

```mermaid
flowchart TD
  A[CAR-bench A2A inbound message] --> B[Policy + tool schema parser]
  B --> C[MPAE deterministic pre-score]
  C --> D1[Step 1: Cerebras planner]
  D1 --> D2[Step 2: Parallel candidate sampling]
  D2 --> D3[Step 3: Policy and hallucination verifier]
  D3 --> D4[Step 4: Tool-call executor decision]
  D4 --> D5[Step 5: Final answer / refusal formatter]
  D5 --> E[A2A outbound text and/or tool_calls]

  C --> M[Budget meter]
  D1 --> M
  D2 --> M
  D3 --> M
  D4 --> M
  D5 --> M
  M --> N[A2A metadata.turn_metrics]
```

## Sequential-call budget

The recommended production harness should reserve the five sequential calls as follows:

1. **Planner**: identify task type, missing info, policy hazards, and candidate action class.
2. **Parallel candidate sampling**: run multiple Cerebras calls in parallel for tool-call candidates or refusal/clarification alternatives.
3. **Verifier**: check hallucination, tool availability, ambiguity, policy compliance, and whether clarification is required.
4. **Executor decision**: emit exactly one benchmark-visible tool-call plan or user-facing response class.
5. **Finalizer**: produce concise A2A output and aggregate token metrics.

Parallel calls in step 2 should share the same `sequentialStep` value so the budget meter counts them as one depth level.

## Token accounting

The project now includes `src/lib/car-bench-track2-budget.ts`, which can:

- summarize prompt/completion/thinking tokens,
- count unique sequential steps,
- enforce the 5-step sequential limit,
- enforce the 500K token-per-task budget,
- produce A2A-compatible `turn_metrics` metadata.

Demo command:

```bash
npm run carbench:budget
```

## Integration with MPAE

MPAE remains deterministic and does not consume LLM budget. It should run before Cerebras calls to:

- classify risk and ambiguity,
- select a context such as normal/critical/fleet/budget,
- lower unnecessary LLM calls for simple safe cases,
- prioritize verifier depth for high-risk or ambiguous user requests.

This preserves Track 2 compute for cases where it improves reliability.


## Reliability kernel for CAR-bench task types

The project now includes `src/lib/car-bench-reliability-agent.ts`, a deterministic pre-agent guard for common CAR-bench failure modes:

- **Base tasks**: checks required observation tools and policies before action.
- **Hallucination tasks**: refuses or defers when required tools, parameters, or observations are unavailable instead of fabricating success.
- **Disambiguation tasks**: resolves internally from preferences/context when possible and asks the user only when unresolved ambiguity remains.

Demo command:

```bash
npm run carbench:reliability
```

The demo currently covers the sunroof examples from the benchmark overview: weather-check policy, removed sunshade-tool hallucination prevention, and stored-preference disambiguation.


## Official adapter surface

The project now exposes a CAR-bench-style adapter in `src/lib/car-bench-agent-adapter.ts` with:

- `get_init_state()`
- `generate_next_message()`

The adapter composes:

- MPAE for deterministic risk and strategy pre-scoring,
- the CAR-bench reliability guard for policy / hallucination / disambiguation handling,
- the Track 2 budget guard for sequential-step and token reporting,
- an optional Cerebras `gpt-oss` call path when `CEREBRAS_API_KEY` is configured,
- a deterministic fallback path when the key is not configured.

Demo command:

```bash
npm run carbench:adapter
```

## Submission configuration for maximum Pass^3 consistency

The strongest submission mode should run the adapter with reasoning enabled and deterministic sampling:

```bash
export CEREBRAS_API_KEY=...
export CEREBRAS_MODEL=gpt-oss-120b
export CEREBRAS_REASONING_EFFORT=high
```

The adapter sends `temperature: 0` and `reasoning_effort: high` by default, then wraps the model with `CAR_BENCH_SYSTEM_PROMPT` from `src/lib/car-bench-system-prompt.ts`.

The prompt encodes the three highest-impact CAR-bench reliability rules as hard requirements:

1. unavailable required tools must produce refusal/defer, never workaround calls;
2. missing/null tool-result fields must produce refusal/defer, never inferred vehicle state;
3. unavailable required parameters must produce refusal/defer, never invalid tool calls.

This is intended to reduce the Pass@3-to-Pass^3 consistency gap by making hallucination and disambiguation behavior stable across repeated trials.
