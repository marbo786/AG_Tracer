import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Span } from '@ag-tracer/shared';
import '../styles/timeline.css'; // Reuse timeline styles for badges
import { TruncationIndicator } from '../timeline/TruncationIndicator';

export const SpanNode = memo(({ data, selected }: NodeProps) => {
  const span = data.span as Span;
  
  // Choose color based on source/type
  let sourceClass = '';
  if (span.source === 'USER_EXPLICIT') sourceClass = 'timeline-row--user';
  else if (span.source === 'MODEL') sourceClass = 'timeline-row--model';
  else if (span.source === 'SYSTEM') sourceClass = 'timeline-row--system';

  if (span.status === 'ERROR') sourceClass = 'timeline-row--error';
  else if (span.status === 'RUNNING') sourceClass = 'timeline-row--running';

  const isError = span.status === 'ERROR';
  const isRunning = span.status === 'RUNNING';

  const dynamicStyle: React.CSSProperties = {
    ...nodeStyle,
    borderColor: isError ? 'var(--vscode-charts-red, #f14c4c)' : isRunning ? 'var(--vscode-charts-yellow, #cca700)' : 'var(--vscode-widget-border, rgba(128, 128, 128, 0.2))',
    backgroundColor: isError ? 'rgba(241, 76, 76, 0.1)' : isRunning ? 'rgba(204, 167, 0, 0.1)' : 'var(--vscode-editor-background)',
    borderWidth: (isError || isRunning) ? '2px' : '1px',
    animation: isRunning ? 'pulse-running 2s infinite ease-in-out' : 'none',
  };

  return (
    <div className={`flow-node ${sourceClass} ${selected ? 'selected' : ''}`} style={dynamicStyle}>
      <Handle type="target" position={Position.Top} />
      <div style={headerStyle}>
        <span className="timeline-step-index">#{span.stepIndex}</span>
        <span className="timeline-type-badge">{span.type}</span>
        <TruncationIndicator truncatedFields={span.truncatedFields} />
      </div>
      <div style={contentStyle}>
        {span.source === 'USER_EXPLICIT' ? 'User Request' : 
         span.type === 'PLANNER_RESPONSE' ? 'Thinking...' : 
         span.content || 'System Step'}
      </div>
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Right} id="tools" />
    </div>
  );
});

const nodeStyle: React.CSSProperties = {
  background: 'var(--vscode-editor-background)',
  border: '1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.2))',
  borderRadius: '4px',
  padding: '8px',
  minWidth: '200px',
  maxWidth: '250px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  borderLeftWidth: '4px', // Standardize on left border for node type indication
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
  gap: '8px',
};

const contentStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--vscode-editor-foreground)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
