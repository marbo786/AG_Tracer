import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { ToolCallBadge } from './ToolCallBadge';
import { FileTouchBadge } from './FileTouchBadge';
import { TruncationIndicator } from './TruncationIndicator';

interface TimelineRowProps {
  span: Span;
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
  isSelected: boolean;
  onClick: () => void;
}

export function TimelineRow({ span, toolCalls, fileAccesses, isSelected, onClick }: TimelineRowProps) {
  const sourceClass = getSourceClass(span.source, span.status);
  const rowClass = `timeline-row ${sourceClass} ${isSelected ? 'timeline-row--selected' : ''}`;
  
  // Format timestamp to just show time (HH:MM:SS)
  const time = formatTime(span.createdAt);
  
  // Get a content preview
  const preview = getContentPreview(span);
  
  return (
    <div className={rowClass} onClick={onClick} role="button" tabIndex={0}>
      <span className="timeline-step-index">{span.stepIndex}</span>
      <span className="timeline-type-badge">{formatStepType(span.type)}</span>
      <span className="timeline-content-preview">{preview}</span>
      <div className="timeline-tools">
        {toolCalls.map((tc, i) => <ToolCallBadge key={i} toolCall={tc} />)}
        {fileAccesses.map((fa, i) => <FileTouchBadge key={i} filePath={fa.filePath} accessType={fa.accessType} />)}
      </div>
      <TruncationIndicator truncatedFields={span.truncatedFields} />
      <span className="timeline-timestamp">{time}</span>
    </div>
  );
}

function getSourceClass(source: string, status: string): string {
  if (status === 'ERROR') return 'timeline-row--error';
  switch (source) {
    case 'USER_EXPLICIT': return 'timeline-row--user';
    case 'MODEL': return 'timeline-row--model';
    case 'SYSTEM': return 'timeline-row--system';
    default: return '';
  }
}

function formatStepType(type: string): string {
  // Shorten known types for compact display
  const shortNames: Record<string, string> = {
    'USER_INPUT': 'USER',
    'PLANNER_RESPONSE': 'LLM',
    'VIEW_FILE': 'VIEW',
    'LIST_DIRECTORY': 'LIST',
    'RUN_COMMAND': 'CMD',
    'GREP_SEARCH': 'GREP',
    'CODE_ACTION': 'CODE',
    'GENERATE_IMAGE': 'IMG',
    'SEARCH_WEB': 'WEB',
    'INVOKE_SUBAGENT': 'AGENT',
    'ASK_QUESTION': 'ASK',
    'CHECKPOINT': 'CKPT',
    'SYSTEM_MESSAGE': 'SYS',
    'ERROR_MESSAGE': 'ERR',
    'EPHEMERAL_MESSAGE': 'EPH',
    'CONVERSATION_HISTORY': 'HIST',
    'GENERIC': 'GEN'
  };
  return shortNames[type] ?? type;
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function getContentPreview(span: Span): string {
  if (span.content) {
    return span.content.slice(0, 120).replace(/\n/g, ' ');
  }
  if (span.thinking) {
    return span.thinking.slice(0, 120).replace(/\n/g, ' ');
  }
  return '';
}
