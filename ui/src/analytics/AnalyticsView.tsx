import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Legend 
} from 'recharts';
import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { getThrashInsights } from '../utils/thrashDetection';
import './Analytics.css';

interface Props {
  spans: Span[];
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
}

export function AnalyticsView({ spans, toolCalls, fileAccesses }: Props) {
  // 1. Tool Usage Distribution (Aggregate by Tool Name)
  const toolData = useMemo(() => {
    const counts: Record<string, number> = {};
    toolCalls.forEach(tc => {
      counts[tc.toolName] = (counts[tc.toolName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [toolCalls]);

  // 2. File Access (Top files)
  const fileData = useMemo(() => {
    const files: Record<string, { read: number, write: number, search: number, list: number, total: number }> = {};
    fileAccesses.forEach(fa => {
      if (!fa.filePath) return;
      const path = fa.filePath.split(/[\\/]/).pop() || fa.filePath;
      if (!files[path]) {
        files[path] = { read: 0, write: 0, search: 0, list: 0, total: 0 };
      }
      files[path][fa.accessType]++;
      files[path].total++;
    });
    return Object.entries(files)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15); // Top 15 files
  }, [fileAccesses]);

  // 3. Thrash Detection
  const thrashInsights = useMemo(() => {
    return getThrashInsights(fileAccesses);
  }, [fileAccesses]);

  // 3. Step Duration
  const durationData = useMemo(() => {
    const data = [];
    for (let i = 0; i < spans.length - 1; i++) {
      const span = spans[i];
      const nextSpan = spans[i+1];
      if (!span || !nextSpan) continue;
      
      const current = new Date(span.createdAt).getTime();
      const next = new Date(nextSpan.createdAt).getTime();
      const durationSec = Math.max(0, (next - current) / 1000);
      data.push({
        step: span.stepIndex,
        duration: durationSec,
        source: span.source,
        type: span.type
      });
    }
    return data;
  }, [spans]);

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Session Analytics</h2>
        <div className="analytics-summary">
          <div className="summary-stat">
            <span className="stat-value">{spans.length}</span>
            <span className="stat-label">Total Steps</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{toolCalls.length}</span>
            <span className="stat-label">Tool Calls</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{fileData.length}</span>
            <span className="stat-label">Files Touched</span>
          </div>
        </div>
      </div>
      
      {thrashInsights.length > 0 && (
        <div className="analytics-section">
          <h3>Session Insights</h3>
          <div className="insights-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {thrashInsights.map((insight, idx) => {
              const fileName = insight.filePath.split(/[\\/]/).pop();
              return (
                <div key={idx} style={{ 
                  background: 'var(--vscode-charts-red)', 
                  color: '#fff',
                  padding: '8px 12px', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🔄</span>
                  <span><strong>Thrashing Detected:</strong> Agent rewrote <code>{fileName}</code> {insight.writeCount} times starting at step {insight.stepIndex}.</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Tool Usage Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={toolData} layout="vertical" margin={{ left: 50, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--vscode-widget-border)" horizontal={false} />
              <XAxis type="number" stroke="var(--vscode-descriptionForeground)" tick={{fontSize: 11}} />
              <YAxis dataKey="name" type="category" stroke="var(--vscode-descriptionForeground)" width={100} tick={{fontSize: 11}} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--vscode-editorWidget-background)', borderColor: 'var(--vscode-widget-border)', color: 'var(--vscode-editor-foreground)' }} 
                cursor={{ fill: 'var(--vscode-list-hoverBackground)' }}
              />
              <Bar dataKey="count" fill="var(--vscode-charts-blue, #4fc1ff)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card">
          <h3>File Access Frequency</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fileData} layout="vertical" margin={{ left: 50, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--vscode-widget-border)" horizontal={false} />
              <XAxis type="number" stroke="var(--vscode-descriptionForeground)" tick={{fontSize: 11}} />
              <YAxis dataKey="name" type="category" stroke="var(--vscode-descriptionForeground)" width={100} tick={{fontSize: 11}} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--vscode-editorWidget-background)', borderColor: 'var(--vscode-widget-border)', color: 'var(--vscode-editor-foreground)' }} 
                cursor={{ fill: 'var(--vscode-list-hoverBackground)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }} />
              <Bar dataKey="read" stackId="a" fill="var(--vscode-charts-green, #89d185)" />
              <Bar dataKey="write" stackId="a" fill="var(--vscode-charts-orange, #d18616)" />
              <Bar dataKey="search" stackId="a" fill="var(--vscode-charts-purple, #b180d7)" />
              <Bar dataKey="list" stackId="a" fill="var(--vscode-charts-yellow, #cca700)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-card full-width">
          <h3>Step Duration</h3>
          <p className="analytics-caption">Time until the next step began. Long durations may include idle time waiting for user input.</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={durationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--vscode-widget-border)" vertical={false} />
              <XAxis dataKey="step" stroke="var(--vscode-descriptionForeground)" tick={{fontSize: 11}} />
              <YAxis stroke="var(--vscode-descriptionForeground)" tick={{fontSize: 11}} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--vscode-editorWidget-background)', borderColor: 'var(--vscode-widget-border)', color: 'var(--vscode-editor-foreground)' }} 
                labelFormatter={(label) => `Step ${label}`} 
                formatter={(value: any) => [`${Number(value).toFixed(1)}s`, 'Duration']}
              />
              <Line type="monotone" dataKey="duration" stroke="var(--vscode-charts-red, #f14c4c)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
