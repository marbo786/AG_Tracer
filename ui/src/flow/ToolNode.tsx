import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ToolCallRecord } from '@ag-tracer/shared';
import { TOOL_ACCESS_TYPE } from '@ag-tracer/shared';

export const ToolNode = memo(({ data, selected }: NodeProps) => {
  const toolCall = data.toolCall as ToolCallRecord;
  const accessType = TOOL_ACCESS_TYPE[toolCall.toolName];
  
  // Reuse the timeline tool badge styles for borders
  const borderColor = accessType === 'write' ? 'var(--vscode-charts-orange, #d18616)' :
                      accessType === 'read' ? 'var(--vscode-charts-blue, #4fc1ff)' :
                      accessType === 'search' ? 'var(--vscode-charts-purple, #b180d7)' :
                      accessType === 'list' ? 'var(--vscode-charts-yellow, #cca700)' :
                      'var(--vscode-descriptionForeground)';

  return (
    <div style={{...nodeStyle, borderLeft: `3px solid ${borderColor}`, outline: selected ? '1px solid var(--vscode-focusBorder)' : 'none'}}>
      <Handle type="target" position={Position.Left} />
      <div style={titleStyle}>{formatToolName(toolCall.toolName)}</div>
      <div style={targetStyle}>{toolCall.targetFile ? getBasename(toolCall.targetFile) : 'No file target'}</div>
    </div>
  );
});

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ');
}

function getBasename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] ?? filePath;
}

const nodeStyle: React.CSSProperties = {
  background: 'var(--vscode-editorWidget-background)',
  border: '1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.2))',
  borderRadius: '4px',
  padding: '6px 8px',
  minWidth: '150px',
  maxWidth: '200px',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-mono)',
  color: 'var(--vscode-editor-foreground)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: '2px',
};

const targetStyle: React.CSSProperties = {
  color: 'var(--vscode-descriptionForeground)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
