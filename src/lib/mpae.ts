export type MpaeContext = 'normal' | 'critical' | 'fleet' | 'budget';

export type MpaeTelemetry = {
  vibration: number;
  rpm: number;
  temp: number;
  ltft: number;
  healthScore: number;
};

export type MpaeWeights = {
  safety: number;
  uptime: number;
  cost: number;
  comfort: number;
};

export type MpaeDecision = {
  context: MpaeContext;
  futureRiskScore: number;
  stabilityScore: number;
  dynamicWeights: MpaeWeights;
  maintenancePriority: number;
  recommendedStrategy: 'monitor' | 'stabilize' | 'service-soon' | 'stop-and-inspect';
  rationale: string;
};

const CONTEXT_WEIGHTS: Record<MpaeContext, MpaeWeights> = {
  normal: { safety: 0.4, uptime: 0.25, cost: 0.2, comfort: 0.15 },
  critical: { safety: 0.75, uptime: 0.15, cost: 0.05, comfort: 0.05 },
  fleet: { safety: 0.45, uptime: 0.4, cost: 0.1, comfort: 0.05 },
  budget: { safety: 0.45, uptime: 0.2, cost: 0.3, comfort: 0.05 },
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(value: number, safeValue: number, criticalValue: number) {
  if (criticalValue === safeValue) return 0;
  return Math.max(0, Math.min(1, (value - safeValue) / (criticalValue - safeValue)));
}

function inferContext(telemetry: MpaeTelemetry, requestedContext?: MpaeContext): MpaeContext {
  if (requestedContext) return requestedContext;

  if (
    telemetry.healthScore < 60 ||
    telemetry.vibration > 95 ||
    telemetry.temp > 105 ||
    Math.abs(telemetry.ltft) > 15
  ) {
    return 'critical';
  }

  return 'normal';
}

export function batFutureEcho(telemetry: MpaeTelemetry, horizonSteps = 20) {
  const horizonMultiplier = Math.max(1, Math.min(2.5, horizonSteps / 20));
  const vibrationRisk = normalize(telemetry.vibration, 45, 110);
  const tempRisk = normalize(telemetry.temp, 88, 112);
  const fuelTrimRisk = normalize(Math.abs(telemetry.ltft), 4, 18);
  const healthDecayRisk = normalize(100 - telemetry.healthScore, 8, 55);
  const rpmStressRisk = normalize(Math.abs(telemetry.rpm - 850), 350, 2200);

  return clampScore(
    100 * horizonMultiplier * (
      vibrationRisk * 0.28 +
      tempRisk * 0.22 +
      fuelTrimRisk * 0.24 +
      healthDecayRisk * 0.2 +
      rpmStressRisk * 0.06
    )
  );
}

export function hermitStabilityTest(telemetry: MpaeTelemetry, futureRiskScore: number) {
  const volatilityPenalty =
    normalize(telemetry.vibration, 55, 110) * 26 +
    normalize(telemetry.temp, 92, 112) * 22 +
    normalize(Math.abs(telemetry.ltft), 6, 18) * 24 +
    normalize(100 - telemetry.healthScore, 10, 60) * 18 +
    normalize(futureRiskScore, 30, 90) * 10;

  return clampScore(100 - volatilityPenalty);
}

export function squidDynamicObjective(context: MpaeContext): MpaeWeights {
  return CONTEXT_WEIGHTS[context];
}

function selectStrategy(priority: number, stabilityScore: number, context: MpaeContext): MpaeDecision['recommendedStrategy'] {
  if (context === 'critical') return 'stop-and-inspect';
  if (priority >= 75 || stabilityScore < 35) return 'stop-and-inspect';
  if (priority >= 55) return 'service-soon';
  if (priority >= 35) return 'stabilize';
  return 'monitor';
}

export function runMpaeDecision(
  telemetry: MpaeTelemetry,
  options: { context?: MpaeContext; horizonSteps?: number } = {}
): MpaeDecision {
  const context = inferContext(telemetry, options.context);
  const dynamicWeights = squidDynamicObjective(context);
  const futureRiskScore = batFutureEcho(telemetry, options.horizonSteps ?? 20);
  const stabilityScore = hermitStabilityTest(telemetry, futureRiskScore);

  const safetyPressure = Math.max(futureRiskScore, 100 - telemetry.healthScore);
  const uptimePressure = normalize(telemetry.vibration, 45, 105) * 100;
  const costPressure = normalize(Math.abs(telemetry.ltft), 4, 18) * 100;
  const comfortPressure = normalize(telemetry.vibration, 35, 85) * 100;

  const maintenancePriority = clampScore(
    safetyPressure * dynamicWeights.safety +
    uptimePressure * dynamicWeights.uptime +
    costPressure * dynamicWeights.cost +
    comfortPressure * dynamicWeights.comfort +
    (100 - stabilityScore) * 0.2
  );

  const recommendedStrategy = selectStrategy(maintenancePriority, stabilityScore, context);

  return {
    context,
    futureRiskScore,
    stabilityScore,
    dynamicWeights,
    maintenancePriority,
    recommendedStrategy,
    rationale: `Bat=${futureRiskScore}, Hermit=${stabilityScore}, Squid=${context}, Priority=${maintenancePriority}`,
  };
}
