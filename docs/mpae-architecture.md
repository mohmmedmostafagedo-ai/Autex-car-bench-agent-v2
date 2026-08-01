# Morphological Predictive Allocation Engine (MPAE)

## Recommendation

For Autex, the stronger addition is the **Morphological Predictive Allocation Engine (MPAE)** concept: Bat Scan, Hermit Stability Test, and Squid Dynamic Objective.

The OGC/Black Dragon stack is more proven for container-yard allocation, but it is domain-specific. MPAE is the better architectural fit for Autex because Autex already behaves like a multi-agent automotive reasoning system: it monitors live telemetry, predicts risk, balances competing objectives, and adapts to changing vehicle states.

## Why MPAE fits Autex better

Autex should not only answer: "What is wrong now?"

It should answer:

1. **What is likely to go wrong soon?**
2. **Which maintenance action stays good for the longest time?**
3. **Which objective matters most right now: safety, cost, uptime, or comfort?**

MPAE maps naturally to that product direction.

## Layers

### 1. Bat Scan: Future Echo

The Bat layer runs a short forward simulation before recommending an action.

For Autex, this means projecting the next telemetry window and estimating:

- failure risk,
- overheating risk,
- fuel-trim drift risk,
- vibration escalation risk,
- expected health-score decay.

Output:

```text
Future Risk Score
```

### 2. Hermit Stability Test: Adaptive Relocation Mind

The Hermit layer avoids recommendations that look good only in the current moment.

For Autex, this means comparing repair or driving recommendations by long-term stability:

- a quick fix that reduces vibration now but raises temperature later should rank lower,
- a slightly slower recommendation that keeps health stable should rank higher,
- recommendations should be judged by persistence, not only instant improvement.

Output:

```text
Stability Score
```

### 3. Squid Dynamic Objective: Shape-Shifting Objective

The Squid layer changes the scoring weights based on the driving/maintenance context.

Example Autex modes:

| Context | Safety | Uptime | Cost | Comfort |
| --- | ---: | ---: | ---: | ---: |
| Normal monitoring | 40% | 25% | 20% | 15% |
| Critical fault | 75% | 15% | 5% | 5% |
| Fleet uptime mode | 45% | 40% | 10% | 5% |
| Budget maintenance | 45% | 20% | 30% | 5% |

Output:

```text
Dynamic Objective Weights
```

## Final decision pipeline

Instead of a static diagnostic flow:

```text
Read Sensors -> Detect Anomaly -> Generate Explanation
```

MPAE turns Autex into a predictive decision engine:

```text
Read Sensors
  ↓
Bat Scan: simulate near-future telemetry risk
  ↓
Hermit Stability Test: prefer recommendations that stay good
  ↓
Squid Dynamic Objective: shift weights by context
  ↓
Select Maintenance Strategy
```

## Relationship to the OGC/Black Dragon algorithm

The OGC/Black Dragon algorithm is still valuable, but as a **proven implementation toolbox**, not as the top-level Autex identity.

Useful pieces to reuse later:

- **Squirrel**: priority by slack/deadline can become urgency-first maintenance ranking.
- **Spider/Bee**: pre-filtering can inspire fast filtering of irrelevant telemetry or diagnostic candidates.
- **LNS**: can become a post-processor that repairs weak recommendation plans.
- **Camel**: can become a safe fallback when the AI budget or runtime budget is exhausted.

Recommended positioning:

```text
MPAE = Autex strategic architecture
Black Dragon/OGC layers = optimization techniques inside selected modules
```

## Product naming

Use the academic name externally:

```text
Morphological Predictive Allocation Engine (MPAE)
```

Use the animal names internally for explainability and demos:

```text
Bat = future risk
Hermit = stability
Squid = adaptive objectives
```

## Implementation note

The safest first implementation is documentation and telemetry scoring, not a full replacement of the current diagnostic flows. Add MPAE gradually as a strategy layer above the existing anomaly detection, explanation, visual scan, and diagnostic chat flows.


## Implemented in this project

MPAE is now implemented as a deterministic scoring module in `src/lib/mpae.ts` and wired into the dashboard telemetry pipeline. Every new reading can produce:

- `futureRiskScore` from Bat Future Echo,
- `stabilityScore` from Hermit Stability Test,
- `dynamicWeights` from Squid Dynamic Objective,
- `maintenancePriority`,
- `recommendedStrategy`.

The dashboard stores the MPAE decision with Firestore readings when persistence is available and includes it in anomaly alert traces when cloud AI diagnostics are triggered. A local demo runner is available with:

```bash
npm run mpae:demo
```
