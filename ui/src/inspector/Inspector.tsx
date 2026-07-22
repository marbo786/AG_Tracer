import { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { DiffViewer } from './DiffViewer';
import { useTracerStore } from '../store/useTracerStore';
import { TruncationIndicator } from '../timeline/TruncationIndicator';
import './Inspector.css';

interface InspectorProps {
  span: Span;
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
  onClose: () => void;
}

type TabId = 'content' | 'thinking' | 'tools' | 'diff';

export function Inspector({ span, toolCalls, fileAccesses, onClose }: InspectorProps) {
  const setViewMode = useTracerStore(state => state.setViewMode);
  
  const hasContent = !!span.content;
  const hasThinking = !!span.thinking;
  const hasTools = toolCalls.length > 0;
  
  const writeTools = toolCalls.filter(tc => tc.toolName === 'write_to_file' || tc.toolName === 'replace_file_content' || tc.toolName === 'multi_replace_file_content');
  const hasDiff = writeTools.length > 0;

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (hasDiff) return 'diff'; // auto-select diff if it exists
    if (hasContent) return 'content';
    if (hasThinking) return 'thinking';
    if (hasTools) return 'tools';
    return 'content';
  });

  // Correct the active tab when the selected span changes
  useEffect(() => {
    if (activeTab === 'diff' && !hasDiff) {
      setActiveTab(hasContent ? 'content' : hasThinking ? 'thinking' : hasTools ? 'tools' : 'content');
    } else if (activeTab === 'content' && !hasContent) {
      setActiveTab(hasDiff ? 'diff' : hasThinking ? 'thinking' : hasTools ? 'tools' : 'content');
    } else if (activeTab === 'thinking' && !hasThinking) {
      setActiveTab(hasDiff ? 'diff' : hasContent ? 'content' : hasTools ? 'tools' : 'content');
    } else if (activeTab === 'tools' && !hasTools) {
      setActiveTab(hasDiff ? 'diff' : hasContent ? 'content' : hasThinking ? 'thinking' : 'content');
    }
  }, [span.stepIndex, hasContent, hasThinking, hasTools, hasDiff]);

  const toolsJson = useMemo(() => {
    if (!hasTools) return '';
    return JSON.stringify(toolCalls.map(tc => ({ name: tc.toolName, args: tc.toolArgs })), null, 2);
  }, [toolCalls]);

  let editorValue = '';
  let language = 'markdown';

  if (activeTab === 'content') {
    editorValue = span.content || 'No content available.';
  } else if (activeTab === 'thinking') {
    editorValue = span.thinking || 'No thinking available.';
  } else if (activeTab === 'tools') {
    editorValue = toolsJson;
    language = 'json';
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className="inspector"
        key={span.stepIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.15 }}
      >
        <div className="inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={onClose}
              title="Close Inspector"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--vscode-icon-foreground)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.293 3.586l7.414 7.414-.707.707-7.414-7.414.707-.707z" />
                <path d="M3.586 11.707l7.414-7.414.707.707-7.414 7.414-.707-.707z" />
              </svg>
            </button>
            <div className="inspector-title">Step {span.stepIndex} ({span.source})</div>
            <TruncationIndicator truncatedFields={span.truncatedFields} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            <button
              onClick={() => setViewMode('flow')}
              title="View in Graph"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--vscode-icon-foreground)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 1a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1zm-9 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 1a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1zm7 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0 1a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1z" />
                <path d="M4.8 8.9l4.9 2.7.5-.9-4.9-2.7-.5.9zM4.9 7.3l6.5-2.6-.4-.9-6.5 2.6.4.9z" />
              </svg>
            </button>
          </div>
          <div className="inspector-tabs">
            <button 
              className={`inspector-tab ${activeTab === 'content' ? 'active' : ''} ${!hasContent ? 'disabled' : ''}`}
              onClick={() => hasContent && setActiveTab('content')}
              disabled={!hasContent}
            >
              Content
            </button>
            <button 
              className={`inspector-tab ${activeTab === 'thinking' ? 'active' : ''} ${!hasThinking ? 'disabled' : ''}`}
              onClick={() => hasThinking && setActiveTab('thinking')}
              disabled={!hasThinking}
            >
              Thinking
            </button>
            <button 
              className={`inspector-tab ${activeTab === 'tools' ? 'active' : ''} ${!hasTools ? 'disabled' : ''}`}
              onClick={() => hasTools && setActiveTab('tools')}
              disabled={!hasTools}
            >
              Tool Calls ({toolCalls.length})
            </button>
            <button 
              className={`inspector-tab ${activeTab === 'diff' ? 'active' : ''} ${!hasDiff ? 'disabled' : ''}`}
              onClick={() => hasDiff && setActiveTab('diff')}
              disabled={!hasDiff}
            >
              Diff
            </button>
          </div>
        </div>
        <div className="inspector-body">
          {activeTab === 'thinking' && (
            <div style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--vscode-descriptionForeground)', borderBottom: '1px solid var(--vscode-widget-border)', fontStyle: 'italic' }}>
              Antigravity's own recorded summary — not a verified account of the model's reasoning
            </div>
          )}
          {activeTab === 'diff' && hasDiff ? (() => {
            const writeTool = writeTools[0]!;
            const args = writeTool.toolArgs as any;
            let original = '';
            let modified = '';
            if (writeTool.toolName === 'write_to_file') {
              modified = args.CodeContent || '';
            } else if (writeTool.toolName === 'replace_file_content') {
              original = args.TargetContent || '';
              modified = args.ReplacementContent || '';
            } else if (writeTool.toolName === 'multi_replace_file_content') {
              modified = JSON.stringify(args.ReplacementChunks, null, 2);
            }
            return <DiffViewer original={original} modified={modified} />;
          })() : (
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={editorValue}
              loading={<div style={{ padding: '16px', color: 'var(--vscode-descriptionForeground)' }}>Loading editor...</div>}
              options={{
                readOnly: true,
                wordWrap: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                fontSize: 13,
                lineHeight: 20,
                renderLineHighlight: 'none',
                hideCursorInOverviewRuler: true,
                automaticLayout: true,
                stickyScroll: { enabled: false },
                overviewRulerLanes: 0,
                scrollbar: {
                  useShadows: false,
                  vertical: 'visible',
                  horizontal: 'visible'
                }
              }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
