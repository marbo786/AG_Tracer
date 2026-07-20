import type { Span, ToolCallRecord, FileAccessRecord, RawStep } from '@ag-tracer/shared';
import { SCHEMA_VERSION } from '@ag-tracer/shared';
import { extractFilePath, determineAccessType } from './file-path-extractor';

export interface NormalizationResult {
  span: Span;
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
}

export function normalizeStep(conversationId: string, rawStep: RawStep): NormalizationResult {
  const span: Span = {
    conversationId,
    stepIndex: rawStep.step_index,
    source: rawStep.source,
    type: rawStep.type,
    status: rawStep.status,
    createdAt: rawStep.created_at,
    content: rawStep.content ?? null,
    thinking: rawStep.thinking ?? null,
    truncatedFields: rawStep.truncated_fields ?? [],
    schemaVersion: SCHEMA_VERSION
  };

  const toolCalls: ToolCallRecord[] = [];
  const fileAccesses: FileAccessRecord[] = [];

  if (rawStep.tool_calls && Array.isArray(rawStep.tool_calls)) {
    rawStep.tool_calls.forEach((toolCall, i) => {
      const targetFile = extractFilePath(toolCall.name, toolCall.args);
      
      const toolCallRecord: ToolCallRecord = {
        conversationId,
        stepIndex: rawStep.step_index,
        toolCallIndex: i,
        toolName: toolCall.name,
        toolArgs: toolCall.args,
        targetFile
      };
      
      toolCalls.push(toolCallRecord);

      if (targetFile !== null) {
        const accessType = determineAccessType(toolCall.name);
        if (accessType !== null) {
          const fileAccessRecord: FileAccessRecord = {
            conversationId,
            stepIndex: rawStep.step_index,
            toolCallIndex: i,
            filePath: targetFile,
            accessType,
            toolName: toolCall.name
          };
          fileAccesses.push(fileAccessRecord);
        }
      }
    });
  }

  return { span, toolCalls, fileAccesses };
}
