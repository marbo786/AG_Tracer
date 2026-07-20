import type { AccessType } from '@ag-tracer/shared';
import { TOOL_ACCESS_TYPE, getFilePathFromToolArgs } from '@ag-tracer/shared';

export function extractFilePath(toolName: string, toolArgs: Record<string, unknown>): string | null {
  const rawPath = getFilePathFromToolArgs(toolName, toolArgs);
  if (rawPath === null) {
    return null;
  }
  
  // Normalize the path: trim whitespace, remove surrounding quotes if present
  let normalized = rawPath.trim();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || 
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  
  return normalized.trim();
}

export function determineAccessType(toolName: string): AccessType | null {
  return TOOL_ACCESS_TYPE[toolName] ?? null;
}
