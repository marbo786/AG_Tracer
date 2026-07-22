import { useMemo, useState, useEffect } from 'react';
import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { TimelineRow } from '../timeline/TimelineRow';
import { DiffViewer } from '../inspector/DiffViewer';
import { useTracerStore } from '../store/useTracerStore';

interface FileEvolutionViewProps {
  spans: Span[];
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
}

export function FileEvolutionView({ spans, toolCalls, fileAccesses }: FileEvolutionViewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // 1. Get unique files, sorted by access count descending
  const uniqueFiles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const fa of fileAccesses) {
      counts.set(fa.filePath, (counts.get(fa.filePath) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([path]) => path);
  }, [fileAccesses]);

  // 2. Default selection to most touched file
  useEffect(() => {
    if (!selectedFile && uniqueFiles.length > 0) {
      setSelectedFile(uniqueFiles[0]!);
    }
  }, [selectedFile, uniqueFiles]);

  // 3. Filter accesses to the selected file
  const fileEvents = useMemo(() => {
    if (!selectedFile) return [];
    
    // Group accesses by stepIndex to match TimelineRow
    const events: {
      span: Span;
      toolCalls: ToolCallRecord[];
      accesses: FileAccessRecord[];
    }[] = [];

    const accessesForFile = fileAccesses.filter(fa => fa.filePath === selectedFile);
    const stepIndices = Array.from(new Set(accessesForFile.map(fa => fa.stepIndex))).sort((a, b) => a - b);

    for (const stepIndex of stepIndices) {
      const span = spans.find(s => s.stepIndex === stepIndex);
      if (!span) continue;
      
      const stepToolCalls = toolCalls.filter(tc => tc.stepIndex === stepIndex);
      const stepAccesses = accessesForFile.filter(fa => fa.stepIndex === stepIndex);
      
      events.push({ span, toolCalls: stepToolCalls, accesses: stepAccesses });
    }
    
    return events;
  }, [selectedFile, spans, toolCalls, fileAccesses]);

  if (uniqueFiles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-text">No files touched in this session.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        borderRight: '1px solid var(--vscode-widget-border)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}>
        <div style={{ padding: '8px 12px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--vscode-sideBarTitle-foreground)', fontWeight: 600 }}>
          Files Touched ({uniqueFiles.length})
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {uniqueFiles.map(file => {
            const isSelected = file === selectedFile;
            // Get just the filename
            const parts = file.split(/[/\\]/);
            const basename = parts[parts.length - 1];
            return (
              <div 
                key={file}
                onClick={() => setSelectedFile(file)}
                title={file}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                  color: isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-sideBar-foreground)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                📄 {basename}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: 'var(--vscode-editor-background)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--vscode-widget-border)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
          {selectedFile}
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {fileEvents.map((evt, idx) => {
            // Check if this step has a write_to_file or replace_file_content for this file
            const writeTool = evt.toolCalls.find(tc => 
              (tc.toolName === 'write_to_file' || tc.toolName === 'replace_file_content' || tc.toolName === 'multi_replace_file_content') && 
              tc.targetFile === selectedFile
            );

            let diffViewer = null;
            if (writeTool) {
              const args = writeTool.toolArgs as any;
              let original = '';
              let modified = '';

              if (writeTool.toolName === 'write_to_file') {
                modified = args.CodeContent || '';
              } else if (writeTool.toolName === 'replace_file_content') {
                original = args.TargetContent || '';
                modified = args.ReplacementContent || '';
              } else if (writeTool.toolName === 'multi_replace_file_content') {
                // Just stringify the replacement chunks for now
                modified = JSON.stringify(args.ReplacementChunks, null, 2);
              }

              diffViewer = (
                <div style={{ height: '300px', marginTop: '8px', border: '1px solid var(--vscode-widget-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <DiffViewer original={original} modified={modified} />
                </div>
              );
            }

            return (
              <div key={evt.span.stepIndex} style={{ display: 'flex', flexDirection: 'column' }}>
                <TimelineRow 
                  span={evt.span}
                  toolCalls={evt.toolCalls}
                  fileAccesses={evt.accesses}
                  isSelected={false}
                  onClick={() => {}}
                  animateEntrance={false}
                />
                {diffViewer}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
