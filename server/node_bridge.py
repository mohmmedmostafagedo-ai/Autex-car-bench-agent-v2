"""
Async bridge to the existing Autex stdin/stdout Node adapter
(scripts/run-carbench-agent-entrypoint.ts).

The reliability kernel + MPAE + LLM verifier logic already lives in
TypeScript and is validated (369 official CAR-bench trials). Rather than
reimplement it in Python, this module keeps one persistent Node child
process per A2A context_id (= one CAR-bench task/trial), writes one
NDJSON request per turn to its stdin, and reads one NDJSON response
from its stdout -- exactly the framing run-carbench-agent-entrypoint.ts
already speaks. The HTTP/A2A layer around this is new; the decision
logic underneath it is untouched.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

AGENT_DIR = Path(__file__).resolve().parent.parent
ENTRYPOINT_SCRIPT = "scripts/run-carbench-agent-entrypoint.ts"


class NodeAdapterProcess:
    """One long-lived `npx tsx run-carbench-agent-entrypoint.ts` process.

    State (turn counter, Track 2 call-budget accumulator, last MPAE/
    reliability decision) lives inside the TS process across turns, exactly
    as the original stdin adapter intended -- one process per task/trial.
    """

    def __init__(self) -> None:
        self._proc: asyncio.subprocess.Process | None = None
        self._lock = asyncio.Lock()

    async def _ensure_started(self) -> asyncio.subprocess.Process:
        if self._proc is not None and self._proc.returncode is None:
            return self._proc

        self._proc = await asyncio.create_subprocess_exec(
            "npx",
            "tsx",
            ENTRYPOINT_SCRIPT,
            cwd=str(AGENT_DIR),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy(),
        )
        return self._proc

    async def generate(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Send one CarBenchGenerateInput line, return one parsed response line."""
        async with self._lock:
            proc = await self._ensure_started()
            assert proc.stdin is not None and proc.stdout is not None

            line = json.dumps(payload) + "\n"
            print("=== PAYLOAD TO NODE ===")
            print(line, flush=True)
            proc.stdin.write(line.encode("utf-8"))
            await proc.stdin.drain()

            raw = await proc.stdout.readline()
            print("=== RESPONSE FROM NODE ===")
            print(raw.decode("utf-8", errors="replace"), flush=True)
            if not raw:
                stderr = b""
                if proc.stderr is not None:
                    stderr = await proc.stderr.read()
                raise RuntimeError(
                    "Node adapter process closed stdout unexpectedly. "
                    f"stderr: {stderr.decode('utf-8', errors='replace')}"
                )
            return json.loads(raw.decode("utf-8"))

    async def reset(self) -> None:
        async with self._lock:
            proc = await self._ensure_started()
            assert proc.stdin is not None and proc.stdout is not None
            proc.stdin.write((json.dumps({"reset": True}) + "\n").encode("utf-8"))
            await proc.stdin.drain()
            await proc.stdout.readline()  # discard the {"ok": true, "reset": true} ack

    async def close(self) -> None:
        async with self._lock:
            if self._proc is None:
                return
            if self._proc.stdin is not None:
                try:
                    self._proc.stdin.close()
                except Exception:
                    pass
            if self._proc.returncode is None:
                try:
                    self._proc.terminate()
                    await asyncio.wait_for(self._proc.wait(), timeout=5)
                except Exception:
                    self._proc.kill()
            self._proc = None


class NodeAdapterPool:
    """One NodeAdapterProcess per A2A context_id (= one CAR-bench conversation)."""

    def __init__(self) -> None:
        self._processes: dict[str, NodeAdapterProcess] = {}
        self._lock = asyncio.Lock()

    async def get(self, context_id: str) -> NodeAdapterProcess:
        async with self._lock:
            proc = self._processes.get(context_id)
            if proc is None:
                proc = NodeAdapterProcess()
                self._processes[context_id] = proc
            return proc

    async def discard(self, context_id: str) -> None:
        async with self._lock:
            proc = self._processes.pop(context_id, None)
        if proc is not None:
            await proc.close()
