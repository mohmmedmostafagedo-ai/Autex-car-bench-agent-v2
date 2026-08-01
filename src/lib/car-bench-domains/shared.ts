import type { CarBenchToolResult } from '../car-bench-tool-result-validator';

export type CarBenchTaskType = 'base' | 'hallucination' | 'disambiguation';

export type CarBenchTool = {
  name: string;
  requiredParameters?: string[];
};

/**
 * Vehicle/session context accumulated across turns. Domain modules read
 * whatever fields they care about; unrelated fields are ignored. Extend
 * this as new domains are added.
 */
export type CarBenchVehicleContext = {
  weatherChecked?: boolean;
  weatherCondition?: string;
  weatherLocationOrPoiId?: string;
  weatherMonth?: number;
  weatherDay?: number;
  weatherHour24?: number;
  userConfirmedWeatherRisk?: boolean;
  sunshadePosition?: number;
  sunroofPosition?: number;
  preferredSunroofPercentage?: number;
  [key: string]: unknown;
};

export type CarBenchAgentInput = {
  taskType: CarBenchTaskType;
  userMessage: string;
  availableTools: CarBenchTool[];
  context: CarBenchVehicleContext;
  removedPart?: string;
  observedToolResults?: CarBenchToolResult[];
};

export type CarBenchToolCall = {
  name: string;
  arguments: Record<string, string | number | boolean>;
};

export type CarBenchAgentDecision = {
  action: 'tool_calls' | 'clarify' | 'refuse_or_defer';
  toolCalls: CarBenchToolCall[];
  message: string;
  reliabilityNotes: string[];
};

export function hasTool(tools: CarBenchTool[], name: string) {
  return tools.some((tool) => tool.name === name);
}

export function getTool(tools: CarBenchTool[], name: string) {
  return tools.find((tool) => tool.name === name);
}

export function toolSupportsParameter(tools: CarBenchTool[], name: string, parameter: string) {
  const tool = getTool(tools, name);
  if (!tool) return false;
  return tool.requiredParameters === undefined || tool.requiredParameters.includes(parameter);
}

export function extractPercentage(message: string) {
  const percentMatch = message.match(/(\d{1,3})\s*%/);
  if (!percentMatch) return undefined;
  const percentage = Number(percentMatch[1]);
  if (!Number.isFinite(percentage)) return undefined;
  return Math.max(0, Math.min(100, percentage));
}

/**
 * A domain module owns one area of vehicle control (sunroof, doors, ...).
 * `matchesIntent` decides whether this domain should handle the current
 * user message; the router tries domains in registration order and stops
 * at the first match. `decide` never receives an input whose intent
 * didn't match, so it can assume relevance.
 */
export type CarBenchDomainModule = {
  name: string;
  matchesIntent(message: string): boolean;
  decide(input: CarBenchAgentInput): CarBenchAgentDecision;
};
