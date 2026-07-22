import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { motion } from 'framer-motion';
import { ToolCallBadge } from './ToolCallBadge';
import { FileTouchBadge } from './FileTouchBadge';
import { TruncationIndicator } from './TruncationIndicator';

interface TimelineRowProps {
  span: Span;
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
  isSelected: boolean;
  onClick: () => void;
  animateEntrance?: boolean;
  onAnimationComplete?: () => void;
  isThrashing?: boolean;
}

export function TimelineRow({ span, toolCalls, fileAccesses, isSelected, isThrashing, onClick, animateEntrance, onAnimationComplete }: TimelineRowProps) {
  const sourceClass = getSourceClass(span.source, span.status);
  const rowClass = `timeline-row ${sourceClass} ${isSelected ? 'timeline-row--selected' : ''}`;
  
  // Format timestamp to just show time (HH:MM:SS)
  const time = formatTime(span.createdAt);
  
  // Get a content preview
  const preview = getContentPreview(span);
  
  const content = (
    <>
      <span className="timeline-step-index">{span.stepIndex}</span>
      <span className="timeline-type-badge">{formatStepType(span.type)}</span>
      {isThrashing && <span className="timeline-type-badge" style={{ backgroundColor: 'var(--vscode-charts-red)', color: '#fff' }} title="Thrash Detected: Repeated writes to the same file in a short window">🔄 Thrash</span>}
      <span className="timeline-content-preview">{preview}</span>
      <div className="timeline-tools">
        {toolCalls.slice(0, 4).map((tc, i) => <ToolCallBadge key={i} toolCall={tc} />)}
        {toolCalls.length > 4 && <span className="tool-badge tool-badge--other">+{toolCalls.length - 4} tools</span>}
        {fileAccesses.slice(0, 4).map((fa, i) => <FileTouchBadge key={i} filePath={fa.filePath} accessType={fa.accessType} />)}
        {fileAccesses.length > 4 && <span className="file-badge">+{fileAccesses.length - 4} files</span>}
      </div>
      <TruncationIndicator truncatedFields={span.truncatedFields} />
      <span className="timeline-timestamp">{time}</span>
    </>
  );

  if (animateEntrance) {
    return (
      <motion.div 
        className={rowClass} 
        onClick={onClick} 
        role="button" 
        tabIndex={0}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onAnimationComplete={onAnimationComplete}
      >
        {content}
      </motion.div>
    );
  }
  
  return (
    <div className={rowClass} onClick={onClick} role="button" tabIndex={0}>
      {content}
    </div>
  );
}

function getSourceClass(source: string, status: string): string {
  if (status === 'ERROR') return 'timeline-row--error';
  if (status === 'RUNNING') return 'timeline-row--running';
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
