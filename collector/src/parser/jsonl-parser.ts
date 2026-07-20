import type { RawStep, RawToolCall } from '@ag-tracer/shared';

export interface ParseSuccess {
  success: true;
  step: RawStep;
}

export interface ParseFailure {
  success: false;
  error: 'incomplete_json' | 'invalid_json' | 'missing_required_fields' | 'empty_line';
  rawLine: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

/**
 * Type guard for runtime validation of a parsed JSON object into a RawStep.
 * Ensures all required fields are present and correctly typed.
 */
export function isValidRawStep(value: unknown): value is RawStep {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.step_index !== 'number') return false;
  if (typeof obj.source !== 'string') return false;
  if (typeof obj.type !== 'string') return false;
  if (typeof obj.status !== 'string') return false;
  if (typeof obj.created_at !== 'string') return false;

  if (obj.content !== undefined && typeof obj.content !== 'string') return false;
  if (obj.thinking !== undefined && typeof obj.thinking !== 'string') return false;

  if (obj.tool_calls !== undefined) {
    if (!Array.isArray(obj.tool_calls)) return false;
    for (const item of obj.tool_calls) {
      if (typeof item !== 'object' || item === null) return false;
      const call = item as Record<string, unknown>;
      if (typeof call.name !== 'string') return false;
      if (
        typeof call.args !== 'object' ||
        call.args === null ||
        Array.isArray(call.args)
      ) {
        return false;
      }
    }
  }

  if (obj.truncated_fields !== undefined) {
    if (!Array.isArray(obj.truncated_fields)) return false;
    for (const field of obj.truncated_fields) {
      if (typeof field !== 'string') return false;
    }
  }

  return true;
}

/**
 * Parses a single line from a JSONL file into a RawStep object.
 * Tolerates incomplete lines, empty lines, and unknown fields.
 */
export function parseJsonlLine(line: string): ParseResult {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return { success: false, error: 'empty_line', rawLine: line };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    // If it's a SyntaxError, usually means incomplete or invalid JSON
    return { success: false, error: 'incomplete_json', rawLine: line };
  }

  if (!isValidRawStep(parsed)) {
    return { success: false, error: 'missing_required_fields', rawLine: line };
  }

  const obj = parsed as unknown as Record<string, unknown>;
  const step: RawStep = {
    step_index: obj.step_index as number,
    source: obj.source as string,
    type: obj.type as string,
    status: obj.status as string,
    created_at: obj.created_at as string,
  };

  if (obj.content !== undefined) step.content = obj.content as string;
  if (obj.thinking !== undefined) step.thinking = obj.thinking as string;
  
  if (obj.tool_calls !== undefined) {
    step.tool_calls = (obj.tool_calls as Array<Record<string, unknown>>).map((call) => ({
      name: call.name as string,
      args: call.args as Record<string, unknown>,
    }));
  }

  if (obj.truncated_fields !== undefined) {
    step.truncated_fields = obj.truncated_fields as string[];
  }

  return { success: true, step };
}
