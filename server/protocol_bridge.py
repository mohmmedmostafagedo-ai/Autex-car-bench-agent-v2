"""
Maps the CAR-bench A2A wire contract (text/data Parts, per
docs/development-guide.md) onto the CarBenchGenerateInput /
CarBenchAdapterMessage JSON shapes already defined in
src/lib/car-bench-agent-adapter.ts.

KNOWN LIMITATION (flagged deliberately, not silently papered over):
The A2A wire protocol does not transmit `taskType` ('base' |
'hallucination' | 'disambiguation') or `removedPart` -- these are Autex's
own internal concepts and are not part of the evaluator's message format.
`isMissingToolResponseTask()` in car-bench-reliability-agent.ts can
therefore never fire through this bridge as written, because it requires
both taskType === 'hallucination' AND a removedPart string. Until the team
decides how (or whether) to infer these from the system-prompt text or
task metadata, this bridge defaults taskType to 'base' and leaves
removedPart unset. This does not change any already-validated behavior on
the sunroof/tool-availability/result-completeness guards, which do not
depend on taskType.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from google.protobuf.json_format import ParseDict

from a2a.helpers.proto_helpers import get_data_parts, get_text_parts, new_data_part, new_text_part
from a2a.types.a2a_pb2 import Message, Part

SOURCE_USER = "user"
SOURCE_ENVIRONMENT = "environment"


@dataclass
class TurnInput:
    user_message: str = ""
    available_tools: list[dict[str, Any]] = field(default_factory=list)
    observed_tool_results: list[dict[str, Any]] = field(default_factory=list)
    has_tools_part: bool = False
    has_tool_results_part: bool = False


def _message_source(message: Message) -> str | None:
    try:
        meta = dict(message.metadata) if message.metadata else {}
    except Exception:
        meta = {}
    return meta.get("source")


def _openai_tool_to_car_bench_tool(openai_tool: dict[str, Any]) -> dict[str, Any] | None:
    """{"type": "function", "function": {"name", "parameters": {...}}} -> {"name", "requiredParameters"}."""
    fn = openai_tool.get("function") if isinstance(openai_tool, dict) else None
    if not isinstance(fn, dict) or not fn.get("name"):
        return None
    params = fn.get("parameters") or {}
    required = params.get("required") if isinstance(params, dict) else None
    tool: dict[str, Any] = {"name": fn["name"]}
    if isinstance(required, list):
        tool["requiredParameters"] = required
    return tool


def _tool_result_to_car_bench_result(raw: dict[str, Any]) -> dict[str, Any]:
    """{"tool_name", "tool_call_id", "content"} -> CarBenchToolResult."""
    tool_name = raw.get("tool_name", "")
    content = raw.get("content")
    parsed_result: Any = None
    status = "SUCCESS"
    error: str | None = None

    if isinstance(content, str):
        try:
            parsed_result = json.loads(content)
        except (json.JSONDecodeError, TypeError):
            # Non-JSON content is still a result; keep as opaque text rather
            # than dropping it, but don't guess at success/failure from prose.
            parsed_result = {"raw": content}
    elif isinstance(content, dict):
        parsed_result = content

    if raw.get("error"):
        status = "ERROR"
        error = str(raw["error"])

    out: dict[str, Any] = {"toolName": tool_name, "status": status, "result": parsed_result}
    if error:
        out["error"] = error
    return out


def parse_inbound_message(message: Message) -> TurnInput:
    """Parse an inbound A2A Message into the fields the Node adapter needs."""
    texts = get_text_parts(message.parts)
    datas = get_data_parts(message.parts)
    source = _message_source(message)

    result = TurnInput()

    # Text part: either "System: ...\n\nUser: ..." (first turn) or a bare
    # follow-up user utterance (subsequent SOURCE_USER turns).
    combined_text = "\n".join(t for t in texts if t)
    if combined_text:
        marker = "\nUser:"
        idx = combined_text.find(marker)
        if idx != -1:
            result.user_message = combined_text[idx + len(marker):].strip()
        else:
            result.user_message = combined_text.strip()

    # Data parts: {"tools": [...]} on turn 1, {"tool_results": [...]} on
    # environment turns. Check both regardless of `source`, since the field
    # shape is unambiguous and `source` is documented as optional/advisory.
    for data in datas:
        if not isinstance(data, dict):
            continue
        if "tools" in data and isinstance(data["tools"], list):
            result.has_tools_part = True
            result.available_tools = [
                t for t in (_openai_tool_to_car_bench_tool(tool) for tool in data["tools"]) if t
            ]
        if "tool_results" in data and isinstance(data["tool_results"], list):
            result.has_tool_results_part = True
            result.observed_tool_results = [
                _tool_result_to_car_bench_result(r) for r in data["tool_results"] if isinstance(r, dict)
            ]

    if source == SOURCE_ENVIRONMENT and not result.has_tool_results_part:
        # Environment turn with no recognizable tool_results data Part --
        # treat as no observed results rather than guessing.
        result.observed_tool_results = []

    return result


def derive_vehicle_context_updates(observed_tool_results: list[dict[str, Any]]) -> dict[str, Any]:
    """Best-effort CarBenchVehicleContext fields from this turn's tool_results.

    NOT part of the already-validated TS reliability kernel -- this is new
    bridge-layer inference, added because generateCarBenchReliabilityDecision()
    only ever reads context.weatherChecked / .sunshadePosition / etc. and
    nothing in the repo (old stdin adapter included) previously derived those
    fields from tool_results across turns. Field-name assumptions for
    get_sunroof_and_sunshade_position/open_close_sunroof/open_close_sunshade
    are based on car-bench-tool-result-validator.ts's REQUIRED_RESULT_FIELDS.
    get_weather's shape (`current_slot` as a nested object containing
    `condition`, not a flat string) is confirmed from CAR-bench's own
    published trajectory example in their README, since third_party/car-bench
    isn't available in this codebase. Not handled: `userConfirmedWeatherRisk`
    (would need to be inferred from user follow-up text after a rain
    clarify) and `preferredSunroofPercentage` (a stored-preference concept
    with no wire signal at all) -- both still require product-level
    decisions, not just wiring.
    """
    updates: dict[str, Any] = {}
    for r in observed_tool_results:
        if r.get("status") != "SUCCESS" or not isinstance(r.get("result"), dict):
            continue
        name = r.get("toolName")
        result = r["result"]
        if name == "get_weather" and isinstance(result.get("current_slot"), dict):
            updates["weatherChecked"] = True
            condition = result["current_slot"].get("condition")
            if isinstance(condition, str):
                updates["weatherCondition"] = condition
        elif name == "get_sunroof_and_sunshade_position":
            if "sunroof_position" in result:
                updates["sunroofPosition"] = result["sunroof_position"]
            if "sunshade_position" in result:
                updates["sunshadePosition"] = result["sunshade_position"]
        elif name == "open_close_sunroof" and "percentage" in result:
            updates["sunroofPosition"] = result["percentage"]
        elif name == "open_close_sunshade" and "percentage" in result:
            updates["sunshadePosition"] = result["percentage"]
    return updates


def build_car_bench_generate_input(
    turn: TurnInput,
    *,
    remembered_tools: list[dict[str, Any]],
    vehicle_context: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Build the CarBenchGenerateInput payload for one turn.

    Tool definitions only arrive on the first A2A turn, so later turns reuse
    the tools remembered from turn 1 (returned back out so the caller can
    persist them per context_id). `vehicle_context` is the caller's
    accumulated-so-far context for this context_id (see
    derive_vehicle_context_updates).
    """
    tools = turn.available_tools if turn.has_tools_part else remembered_tools

    payload: dict[str, Any] = {
        "userMessage": turn.user_message or "none",
        "taskType": "base",  # see module docstring: not derivable from the wire contract
        "availableTools": tools,
        "vehicleContext": vehicle_context,
        "observedToolResults": turn.observed_tool_results,
    }
    return payload, tools


def build_outbound_message(
    adapter_message: dict[str, Any],
    *,
    context_id: str,
    task_id: str | None,
) -> Message:
    """Convert CarBenchAdapterMessage -> an A2A agent Message (text + optional data Part).

    task_id should be None for ordinary conversational responses (the
    common case). Only pass a real task_id if the caller has actually
    created and persisted a corresponding A2A Task -- an unmatched task_id
    causes the evaluator to fail the next turn with TASK_NOT_FOUND, since
    it looks the task up and finds nothing registered.
    """
    from a2a.helpers.proto_helpers import new_message
    from a2a.types.a2a_pb2 import Role

    parts: list[Part] = []

    content = adapter_message.get("content")
    if content:
        parts.append(new_text_part(str(content)))

    tool_calls = adapter_message.get("tool_calls")
    if tool_calls:
        parts.append(new_data_part({
            "tool_calls": [
                {"tool_name": call.get("name"), "arguments": call.get("arguments", {})}
                for call in tool_calls
            ]
        }))

    reasoning = adapter_message.get("metadata", {}).get("reasoning_content")
    if reasoning:
        parts.append(new_data_part({"reasoning_content": reasoning}))

    message = new_message(parts=parts, context_id=context_id, task_id=task_id, role=Role.ROLE_AGENT)

    # Per docs/development-guide.md#response-metadata: attach turn_metrics
    # only on a final (no tool_calls) response; otherwise metrics accumulate
    # internally and land on the later final response.
    if not tool_calls:
        metadata = adapter_message.get("metadata", {})
        turn_metrics = metadata.get("turn_metrics")
        if turn_metrics:
            # Message.metadata is a protobuf Struct, not a plain dict --
            # ParseDict merges JSON-able data into it in place.
            ParseDict(
                {
                    "turn_metrics": {
                        "prompt_tokens": turn_metrics.get("prompt_tokens", 0),
                        "completion_tokens": turn_metrics.get("completion_tokens", 0),
                        "thinking_tokens": turn_metrics.get("thinking_tokens", 0),
                        "cost": 0.0,
                        "model": "autex-carbench-agent",
                        "num_llm_calls": 1,
                        "num_passes": 1,
                        "avg_llm_call_time_ms": turn_metrics.get("avg_llm_call_time_ms", 0.0),
                        "quota_wait_time_ms": 0.0,
                    }
                },
                message.metadata,
            )

    return message
