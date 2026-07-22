import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export const ClusterNode = memo(({ data, selected }: NodeProps) => {
  const { count, type, source, hasError, hasRunning } = data as { count: number, type: string, source: string, hasError?: boolean, hasRunning?: boolean };
  
  let sourceClass = '';
  if (source === 'USER_EXPLICIT') sourceClass = 'timeline-row--user';
  else if (source === 'MODEL') sourceClass = 'timeline-row--model';
  else if (source === 'SYSTEM') sourceClass = 'timeline-row--system';

  const dynamicStyle: React.CSSProperties = {
    ...nodeStyle,
    borderColor: hasError ? 'var(--vscode-charts-red, #f14c4c)' : hasRunning ? 'var(--vscode-charts-yellow, #cca700)' : 'var(--vscode-widget-border, rgba(128, 128, 128, 0.5))',
    backgroundColor: hasError ? 'rgba(241, 76, 76, 0.1)' : hasRunning ? 'rgba(204, 167, 0, 0.1)' : 'var(--vscode-editor-background)',
    animation: hasRunning ? 'pulse-running 2s infinite ease-in-out' : 'none',
  };

  return (
    <div className={`flow-node ${sourceClass} ${selected ? 'selected' : ''}`} style={dynamicStyle}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: hasError ? 'var(--vscode-charts-red, #f14c4c)' : 'inherit' }}>
          {hasError && '⚠️ '}
          {count} Similar Steps
        </div>
        <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>{type}</div>
        <div style={expandButtonStyle}>Click to expand</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

const nodeStyle: React.CSSProperties = {
  background: 'var(--vscode-editor-background)',
  border: '1px dashed var(--vscode-widget-border, rgba(128, 128, 128, 0.5))',
  borderRadius: '8px',
  padding: '12px',
  minWidth: '200px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  opacity: 0.8,
};

const expandButtonStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '4px 8px',
  background: 'var(--vscode-button-background)',
  color: 'var(--vscode-button-foreground)',
  borderRadius: '4px',
  fontSize: '11px',
};
