
# Autex: Automotive AI Command Center & Maintenance Agent

Autex is a high-fidelity predictive maintenance platform built for automotive smart monitoring. It functions as a **Hybrid AI Agentic System**, combining local Edge AI for real-time engine perception with Cloud-based Generative AI for technical reasoning and diagnostic strategy.

## Core Features

- **Agentic Maintenance Engine**: Powered by Genkit and Google Gemini, the system acts as a master mechanic agent that reasons through engine failures and suggests precise automotive fixes.
- **Interactive Master Mechanic Chat**: A real-time, context-aware AI chat agent that monitors live sensors and can diagnose mechanical issues from sound descriptions.
- **Edge AI Perception (Local Inference)**: Real-time vibration and RPM analysis using Edge Impulse patterns to detect misfires and component fatigue locally.
- **Black Box Ledger**: Firestore Offline Persistence with a 40MB cache limit for reliable, immutable vehicle logging in disconnected environments.
- **HPI (Health Performance Index)**: An aggregate AI score tracking the real-time status of the vehicle engine.
- **Multilingual Command Center**: Fully localized in English and Arabic with automatic RTL layout switching.
- **Proof-of-Condition**: Digital vehicle health certificates documenting performance history to increase asset resale value.
- **PWA Ready**: Installable on mobile devices with offline-first capabilities for "Edge Survival" on the road.

## Strategic Algorithm Direction
Autex should evolve around a **Morphological Predictive Allocation Engine (MPAE)**: a three-layer strategy model that combines future-risk simulation, long-horizon stability scoring, and dynamic objective weighting. This is a better fit for Autex than directly importing the container-yard OGC/Black Dragon optimizer because Autex needs adaptive automotive decisions, not static yard allocation. See [`docs/mpae-architecture.md`](docs/mpae-architecture.md).


## CAR-bench Track 2 Readiness
Nahed Innovation has been selected for CAR-bench Track 2. The agent's primary reasoning route is Anthropic Claude Opus (model `claude-opus-4-6` by default, configurable via `ANTHROPIC_MODEL`), called with `temperature: 0` and extended thinking enabled (`ANTHROPIC_THINKING_BUDGET_TOKENS`, default 8000) for run-to-run consistency on Pass^3. On the public CAR-bench leaderboard, Claude-Opus (thinking) configurations score highest (up to 58% Avg Pass^3); the previous default of Cerebras `gpt-oss-120b` (thinking) scored 28%, second-lowest of all tested models. Cerebras remains available as an explicit fallback route (`CEREBRAS_API_KEY`) only if `ANTHROPIC_API_KEY` is unset. Autex also includes a Track 2 compute-budget helper covering the 5 sequential-call limit, 500K average token budget, and A2A `turn_metrics` reporting. See [`docs/car-bench-track2-architecture.md`](docs/car-bench-track2-architecture.md).

## Agentic Architecture
Autex operates as a two-tier agentic system:
1. **The Sentinel (Local)**: A low-latency perception agent that watches for mechanical anomalies (Misfires, Resonance, Friction).
2. **The Strategist (Cloud)**: A reasoning agent that uses tools to query inventory, analyzes historical trends, and formulates repair plans.
3. **The Consultant (Interactive)**: A real-time chat agent that bridges the gap between driver and machine, providing human-like diagnostics for complex engine issues.

## Competitive Edge (The Unbeatable Tier)
- **Edge Survival**: Unlike competitors who require 5G/4G, Autex runs local inference and buffers data offline, ensuring 100% data integrity in remote areas.
- **Sound-Based Reasoning**: The AI is specifically trained to diagnose "Sound Signatures" (Ticking, Squealing, Clanking), a rare feature that replicates the ears of a master mechanic.
- **Financial Value Retainer**: By issuing "Condition Certificates," the app is not just a tool, but a financial vehicle that protects and increases the asset's resale value.



## Evaluation Results
The latest V3 stress suite reports 37/37 passing cases, and the Toyota Etios OBD2 real-data check shows realistic behavior across 541 samples from roughly 270K rows. See [`docs/car-bench-evaluation-results.md`](docs/car-bench-evaluation-results.md).

## Submission ZIP
Binary archives are intentionally not committed to GitHub because PR views may reject or hide ZIP files. Generate the final local archive when needed with:

```bash
npm run submission:zip
```

The command writes `dist/autex-carbench-final-<commit>.zip`; `dist/` is ignored by Git.

## Getting Started

### 1. Using on Laptop (Direct Connection)
1. Set your `GEMINI_API_KEY` in the environment.
2. Plug your OBD-II to USB cable (ELM327) into your laptop.
3. Use Chrome or Edge browser.
4. Click **"Connect OBD-II"** and select the Serial Port.

### 2. Using on Smartphone (PWA)
1. **Installation**: Open the app in Chrome (Android) or Safari (iOS) and select **"Add to Home Screen"**. Launch the app from your home screen.
2. **Android**: Use a **USB-C OTG adapter** to plug your cable directly into your phone. Click "Connect" in Chrome.
3. **iOS (Remote Command Viewer)**: Since direct USB is restricted by Apple, connect the cable to a laptop. This PWA will automatically sync your dashboard data to your phone via the **Black Box Ledger** in real-time.

## Monetization Model
- **Hardware Tier**: Sale of the high-precision "Green Box" OBD bridge.
- **Agent SaaS**: Subscription-based access to the Cloud Reasoning and Chat engine.
- **Certificate Fee**: Per-issue fee for the Digital Proof-of-Condition certificates.
