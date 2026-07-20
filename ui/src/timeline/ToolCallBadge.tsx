import type { ToolCallRecord } from '@ag-tracer/shared';
import { TOOL_ACCESS_TYPE } from '@ag-tracer/shared';

interface ToolCallBadgeProps {
  toolCall: ToolCallRecord;
}

export function ToolCallBadge({ toolCall }: ToolCallBadgeProps) {
  const accessType = TOOL_ACCESS_TYPE[toolCall.toolName];
  const badgeClass = accessType ? `tool-badge tool-badge--${accessType}` : 'tool-badge tool-badge--other';
  
  // Display a short, readable label
  const displayName = formatToolName(toolCall.toolName);
  
  return (
    <span className={badgeClass} title={toolCall.toolName}>
      {displayName}
    </span>
  );
}

function formatToolName(name: string): string {
  // Convert snake_case to a readable label
  return name.replace(/_/g, ' ');
}
