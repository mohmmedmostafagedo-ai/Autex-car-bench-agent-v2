"""A2A HTTP server for the Autex Track 2 CAR-bench agent.

Fixes the "container exits immediately" issue: the previous Docker
ENTRYPOINT ran scripts/run-carbench-agent-entrypoint.ts directly, which is
a stdin/stdout NDJSON adapter that exits as soon as its stdin pipe closes.
The CAR-bench Track 2 runner instead needs a persistent A2A HTTP service
that accepts --host/--port/--card-url and serves the Agent Card + message
endpoints (docs/development-guide.md, "Server Setup" / "Agent Executor
Contract").

This server keeps Autex's existing, already-validated TypeScript
reliability kernel + MPAE + LLM verifier untouched. It only adds the A2A
transport layer around it, using the same a2a-sdk the CAR-bench reference
Track 2 agents (src/track_2_agent_under_test_cerebras/server.py) use, so
the wire behavior (Agent Card shape, JSON-RPC routes, protobuf Message/Part
framing) matches what the organizer's evaluator expects.
"""

from __future__ import annotations

import argparse
import logging
import sys

import uvicorn
from starlette.applications import Starlette

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events.event_queue_v2 import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCard

from node_bridge import NodeAdapterPool
from protocol_bridge import (
    build_car_bench_generate_input,
    build_outbound_message,
    derive_vehicle_context_updates,
    parse_inbound_message,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("autex.a2a_server")

# CarBenchVehicleContext has no wire representation either (see
# protocol_bridge module docstring) -- start from the same neutral defaults
# generateCarBenchReliabilityDecision already assumes when fields are
# omitted, so behavior for the sunroof/weather guards is unaffected.
DEFAULT_VEHICLE_CONTEXT: dict = {}


class AutexAgentExecutor(AgentExecutor):
    """Bridges A2A requests to the existing Node reliability-agent adapter."""

    def __init__(self) -> None:
        self._pool = NodeAdapterPool()
        # Tool definitions only arrive on turn 1; remember them per context.
        self._remembered_tools: dict[str, list[dict]] = {}
        # A "tool_results" turn (development-guide.md, "Alternative A") carries
        # no new user text -- the reliability agent still needs *a* userMessage
        # to re-derive intent each call (it has no memory of its own), so we
        # remember the most recent non-empty user utterance per context and
        # reuse it on tool-result-only turns.
        self._remembered_user_message: dict[str, str] = {}
        # Accumulated CarBenchVehicleContext derived from tool_results seen
        # so far in this context_id. See protocol_bridge.derive_vehicle_context_updates.
        self._vehicle_context: dict[str, dict] = {}

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        message = context.message
        if message is None:
            logger.warning("execute() called with no inbound message; ignoring.")
            return

        context_id = context.context_id or message.context_id
        if not context_id:
            raise RuntimeError("A2A request is missing a context_id; cannot route to an agent process.")

        turn = parse_inbound_message(message)

        # If this turn carried no new user text (a tool_results-only turn),
        # fall back to the last real user utterance for this context so the
        # reliability agent doesn't lose track of what's actually being asked.
        if turn.user_message:
            self._remembered_user_message[context_id] = turn.user_message
        elif context_id in self._remembered_user_message:
            turn.user_message = self._remembered_user_message[context_id]

        # Fold THIS turn's tool_results into the running vehicle context
        # before building the payload: generateCarBenchReliabilityDecision
        # expects context.weatherChecked/etc. to already reflect the results
        # just received, not only results from prior turns. This is what
        # lets the agent proceed past "check weather first" instead of
        # asking again forever.
        updates = derive_vehicle_context_updates(turn.observed_tool_results)
        if updates:
            self._vehicle_context.setdefault(context_id, {}).update(updates)

        remembered = self._remembered_tools.get(context_id, [])
        vehicle_context = {**DEFAULT_VEHICLE_CONTEXT, **self._vehicle_context.get(context_id, {})}
        payload, tools_used = build_car_bench_generate_input(
            turn,
            remembered_tools=remembered,
            vehicle_context=vehicle_context,
        )
        if turn.has_tools_part:
            self._remembered_tools[context_id] = tools_used

        proc = await self._pool.get(context_id)
        try:
            adapter_response = await proc.generate(payload)
        except Exception:
            logger.exception("Node adapter call failed for context_id=%s", context_id)
            raise

        adapter_message = adapter_response.get("message", adapter_response)
        outbound = build_outbound_message(
            adapter_message,
            context_id=context_id,
            # Do NOT echo context.task_id here: the evaluator only accepts a
            # task_id on outbound messages when the sender has actually
            # created and persisted a matching A2A Task. This wrapper never
            # does that (see CAR-bench reference agents, which also omit
            # task_id on plain conversational turns) -- echoing it back
            # produces a dangling reference the evaluator can't resolve on
            # the next turn (TASK_NOT_FOUND).
            task_id=None,
        )
        await event_queue.enqueue_event(outbound)

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        context_id = context.context_id or (context.message.context_id if context.message else None)
        if context_id:
            await self._pool.discard(context_id)
            self._remembered_tools.pop(context_id, None)
            self._remembered_user_message.pop(context_id, None)
            self._vehicle_context.pop(context_id, None)
        logger.info("Canceled and cleaned up context_id=%s", context_id)


def prepare_agent_card(url: str) -> AgentCard:
    card = AgentCard(
        name="autex_car_bench_agent",
        description=(
            "Reliability-first in-car voice assistant agent for CAR-bench: "
            "deterministic reliability kernel + MPAE health scorer, then a "
            "configurable LLM verifier."
        ),
        version="1.0.0",
        default_input_modes=["text/plain", "application/json"],
        default_output_modes=["text/plain", "application/json"],
    )
    iface = card.supported_interfaces.add()
    iface.url = url
    iface.protocol_binding = "JSONRPC"
    iface.protocol_version = "1.0"

    card.capabilities.streaming = False
    card.capabilities.push_notifications = False
    card.capabilities.extended_agent_card = False

    skill = card.skills.add()
    skill.id = "car_assistant"
    skill.name = "In-Car Voice Assistant (Autex)"
    skill.description = "Returns CAR-bench text responses or tool calls through A2A."
    skill.tags.extend(["benchmark", "car-bench", "voice-assistant", "reliability-kernel"])

    return card


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Autex CAR-bench Track 2 agent under test.")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=9009)
    parser.add_argument("--card-url", type=str, default=None)
    # All LLM/provider configuration stays environment-variable-driven
    # (AGENT_LLM, AGENT_API_KEY, ...) per the existing Autex design --
    # no additional CLI flags are needed here.
    args = parser.parse_args()

    logger.info("Starting Autex CAR-bench A2A server host=%s port=%s", args.host, args.port)

    card = prepare_agent_card(args.card_url or f"http://{args.host}:{args.port}/")
    request_handler = DefaultRequestHandler(
        agent_executor=AutexAgentExecutor(),
        task_store=InMemoryTaskStore(),
        agent_card=card,
    )

    routes = create_jsonrpc_routes(request_handler, "/", enable_v0_3_compat=True)
    card_routes = create_agent_card_routes(card)
    app = Starlette(routes=routes + card_routes)

    uvicorn.run(app, host=args.host, port=args.port, timeout_keep_alive=1000)


if __name__ == "__main__":
    sys.path.insert(0, ".")
    main()
