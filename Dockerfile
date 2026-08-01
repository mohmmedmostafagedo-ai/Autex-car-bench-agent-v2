# CAR-bench Track 2 — Agent-under-test image.
#
# This image runs ONLY the agent harness (deterministic policy logic +
# configurable LLM call), not the full Autex dashboard application. The
# dashboard's Next.js build, UI components, and Firebase/Genkit integrations
# are unrelated to the evaluation loop and are intentionally excluded to
# keep the image small and the audit surface minimal.
#
# All model/provider selection is environment-driven (see
# src/lib/car-bench-agent-adapter.ts) — nothing here hard-codes a model,
# provider, deployment name, API base, service tier, or reasoning-effort
# value, per the Track 2 submission rules.
#
# Transport: a small persistent A2A HTTP server (server/car_bench_a2a_server.py,
# Python + a2a-sdk — the same SDK the CAR-bench reference Track 2 agents use)
# wraps the existing Node reliability-kernel adapter
# (scripts/run-carbench-agent-entrypoint.ts) as a subprocess. The Node
# decision logic itself is unchanged; only the transport layer around it is
# new. The container now stays running and listens on --host/--port instead
# of exiting when a stdin pipe closes.

FROM node:20-slim AS base
WORKDIR /agent

# Install Python 3 + pip alongside Node, for the A2A server layer.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       python3-pip \
       python3-venv \
       curl \
    && rm -rf /var/lib/apt/lists/*

# --- Node side: only what the agent harness needs (tsx (TS runtime) + node
# types). We intentionally do NOT run `npm install` against the full
# package.json (which pulls in Next.js, Radix UI, Firebase, Genkit, etc.)
# since none of that is reachable from the agent entrypoint.
COPY agent-package.json package.json
RUN npm install --omit=dev

# Copy only the source files the agent entrypoint actually imports.
COPY src/lib/car-bench-agent-adapter.ts ./src/lib/car-bench-agent-adapter.ts
COPY src/lib/car-bench-reliability-agent.ts ./src/lib/car-bench-reliability-agent.ts
COPY src/lib/car-bench-tool-result-validator.ts ./src/lib/car-bench-tool-result-validator.ts
COPY src/lib/car-bench-system-prompt.ts ./src/lib/car-bench-system-prompt.ts
COPY src/lib/car-bench-track2-budget.ts ./src/lib/car-bench-track2-budget.ts
COPY src/lib/mpae.ts ./src/lib/mpae.ts
COPY src/lib/car-bench-domains ./src/lib/car-bench-domains
COPY scripts/run-carbench-agent-entrypoint.ts ./scripts/run-carbench-agent-entrypoint.ts
COPY tsconfig.agent.json ./tsconfig.json

# --- Python side: the A2A HTTP server.
COPY server/requirements.txt ./server/requirements.txt
RUN python3 -m venv /agent/.venv \
    && /agent/.venv/bin/pip install --no-cache-dir -r server/requirements.txt
COPY server/car_bench_a2a_server.py ./server/car_bench_a2a_server.py
COPY server/node_bridge.py ./server/node_bridge.py
COPY server/protocol_bridge.py ./server/protocol_bridge.py

ENV PATH="/agent/.venv/bin:${PATH}"

# Non-root runtime user. Needs ownership of node_modules/.venv it will
# spawn subprocesses from.
RUN useradd --create-home --shell /bin/bash agent \
    && chown -R agent:agent /agent
USER agent

# No secrets are baked in. All required values are supplied by the
# evaluator at run time via [agent_under_test.env] in scenario.toml:
#   AGENT_LLM, AGENT_API_KEY  (required)
#   AGENT_API_BASE, AGENT_TEMPERATURE, AGENT_REASONING_EFFORT,
#   AGENT_THINKING_BUDGET_TOKENS, AGENT_API_STYLE  (optional)
#
# The competition runner passes --host, --port, --card-url on the command
# line; the server stays up and serves the Agent Card + A2A message routes
# until the container is stopped.
ENTRYPOINT ["python3", "server/car_bench_a2a_server.py"]
EXPOSE 9009
