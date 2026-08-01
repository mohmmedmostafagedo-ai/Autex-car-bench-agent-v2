import { validateCarBenchToolResults } from './car-bench-tool-result-validator';
import {
  type CarBenchAgentInput,
  type CarBenchAgentDecision,
  type CarBenchDomainModule,
} from './car-bench-domains/shared';
import { sunroofDomain } from './car-bench-domains/sunroof';
import { doorsDomain } from './car-bench-domains/doors';

export type {
  CarBenchTaskType,
  CarBenchTool,
  CarBenchVehicleContext,
  CarBenchAgentInput,
  CarBenchToolCall,
  CarBenchAgentDecision,
} from './car-bench-domains/shared';

/**
 * Registered domain modules, tried in order. Add a new domain by writing a
 * CarBenchDomainModule (see car-bench-domains/shared.ts) and listing it
 * here -- no changes needed elsewhere in this file.
 */
const DOMAINS: CarBenchDomainModule[] = [sunroofDomain, doorsDomain];

function normaliseRemovedPart(removedPart?: string) {
  return removedPart?.toLowerCase().replace(/[._-]+/g, ' ') ?? '';
}

function isMissingToolResponseTask(input: CarBenchAgentInput) {
  if (input.taskType !== 'hallucination') return false;
  const removed = normaliseRemovedPart(input.removedPart);
  return /result|response|return|field|output/.test(removed);
}

export function generateCarBenchReliabilityDecision(input: CarBenchAgentInput): CarBenchAgentDecision {
  const domain = DOMAINS.find((candidate) => candidate.matchesIntent(input.userMessage));

  if (!domain) {
    return {
      action: 'clarify',
      toolCalls: [],
      message: 'I need a clearer vehicle-control request before taking action.',
      reliabilityNotes: [
        `No supported domain matched this request. Registered domains: ${DOMAINS.map((d) => d.name).join(', ')}.`,
      ],
    };
  }

  // Cross-cutting guards apply regardless of which domain matched.
  const observedResultValidation = validateCarBenchToolResults(input.observedToolResults);
  if (!observedResultValidation.isValid) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot complete this safely because a required tool result is missing, incomplete, or unsuccessful, so I will not infer vehicle state from partial evidence.',
      reliabilityNotes: [
        'Tool result validator blocked unsafe continuation.',
        ...observedResultValidation.missingFields.map((field) => `Missing result field: ${field}.`),
        ...observedResultValidation.invalidResults.map((result) => `${result.toolName}: ${result.reason}`),
      ],
    };
  }

  if (isMissingToolResponseTask(input)) {
    return {
      action: 'refuse_or_defer',
      toolCalls: [],
      message: 'I cannot complete this safely because the benchmark indicates a required tool response or result field is unavailable, so I will not infer or fabricate the missing vehicle state.',
      reliabilityNotes: [
        'Hallucination guard activated for missing tool response/result.',
        `Removed capability: ${input.removedPart ?? 'unspecified tool response'}.`,
      ],
    };
  }

  return domain.decide(input);
}
