import { useTracerStore } from '../store/useTracerStore';

export function TimelineFilterBar() {
  const filters = useTracerStore((state) => state.timelineFilters);
  const toggleFilter = useTracerStore((state) => state.toggleTimelineFilter);

  const filterOptions = [
    { id: 'user', label: 'User', icon: '👤' },
    { id: 'agent', label: 'Agent', icon: '🤖' },
    { id: 'system', label: 'System', icon: '⚙️' },
    { id: 'read', label: 'Read', icon: '👀' },
    { id: 'write', label: 'Write', icon: '✏️' },
    { id: 'cmd', label: 'Cmd', icon: '🖥️' },
    { id: 'error', label: 'Error', icon: '⚠️' }
  ];

  return (
    <div className="timeline-filter-bar" style={{
      display: 'flex',
      gap: '8px',
      padding: '8px 16px',
      borderBottom: '1px solid var(--vscode-widget-border)',
      backgroundColor: 'var(--vscode-editor-background)',
      overflowX: 'auto'
    }}>
      {filterOptions.map(opt => (
        <button
          key={opt.id}
          onClick={() => toggleFilter(opt.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            border: `1px solid ${filters.has(opt.id) ? 'var(--vscode-button-background)' : 'var(--vscode-widget-border)'}`,
            backgroundColor: filters.has(opt.id) ? 'var(--vscode-button-background)' : 'transparent',
            color: filters.has(opt.id) ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'var(--font-ui)',
            whiteSpace: 'nowrap'
          }}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
