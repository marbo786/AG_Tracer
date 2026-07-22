import { DiffEditor } from '@monaco-editor/react';

interface DiffViewerProps {
  original: string;
  modified: string;
  language?: string;
}

export function DiffViewer({ original, modified, language = 'typescript' }: DiffViewerProps) {
  return (
    <DiffEditor
      height="100%"
      language={language}
      theme="vs-dark"
      original={original}
      modified={modified}
      loading={<div style={{ padding: '16px', color: 'var(--vscode-descriptionForeground)' }}>Loading diff editor...</div>}
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
        renderSideBySide: false, // Inline diff is much better for small panels
        scrollbar: {
          useShadows: false,
          vertical: 'visible',
          horizontal: 'visible'
        }
      }}
    />
  );
}
