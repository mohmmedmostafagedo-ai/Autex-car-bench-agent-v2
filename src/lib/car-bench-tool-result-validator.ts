export type CarBenchToolResult = {
  toolName: string;
  status?: 'SUCCESS' | 'ERROR' | string;
  result?: Record<string, unknown> | null;
  error?: string;
};

export type CarBenchToolResultValidation = {
  isValid: boolean;
  missingFields: string[];
  invalidResults: Array<{
    toolName: string;
    reason: string;
  }>;
};

const REQUIRED_RESULT_FIELDS: Record<string, string[]> = {
  get_sunroof_and_sunshade_position: ['sunroof_position', 'sunshade_position'],
  get_weather: ['current_slot'],
  open_close_sunroof: ['percentage'],
  open_close_sunshade: ['percentage'],
};

function hasField(result: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(result, field) && result[field] !== undefined && result[field] !== null;
}

export function validateCarBenchToolResults(results: CarBenchToolResult[] = []): CarBenchToolResultValidation {
  const missingFields: string[] = [];
  const invalidResults: CarBenchToolResultValidation['invalidResults'] = [];

  for (const toolResult of results) {
    if (toolResult.status && toolResult.status !== 'SUCCESS') {
      invalidResults.push({
        toolName: toolResult.toolName,
        reason: `Tool returned non-success status: ${toolResult.status}.`,
      });
      continue;
    }

    const requiredFields = REQUIRED_RESULT_FIELDS[toolResult.toolName] ?? [];
    if (requiredFields.length === 0) continue;

    if (!toolResult.result) {
      invalidResults.push({
        toolName: toolResult.toolName,
        reason: 'Tool result is missing or null.',
      });
      missingFields.push(...requiredFields.map((field) => `${toolResult.toolName}.${field}`));
      continue;
    }

    for (const field of requiredFields) {
      if (!hasField(toolResult.result, field)) {
        missingFields.push(`${toolResult.toolName}.${field}`);
      }
    }
  }

  return {
    isValid: missingFields.length === 0 && invalidResults.length === 0,
    missingFields,
    invalidResults,
  };
}
