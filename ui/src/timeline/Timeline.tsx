import { useRef, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { TimelineRow } from './TimelineRow';

interface TimelineProps {
  spans: Span[];
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
}

export function Timeline({ spans, toolCalls, fileAccesses }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Build lookup maps for efficient rendering
  const toolCallsByStep = useMemo(() => {
    const map = new Map<number, ToolCallRecord[]>();
    for (const tc of toolCalls) {
      const existing = map.get(tc.stepIndex) ?? [];
      existing.push(tc);
      map.set(tc.stepIndex, existing);
    }
    return map;
  }, [toolCalls]);

  const fileAccessesByStep = useMemo(() => {
    const map = new Map<number, FileAccessRecord[]>();
    for (const fa of fileAccesses) {
      const existing = map.get(fa.stepIndex) ?? [];
      existing.push(fa);
      map.set(fa.stepIndex, existing);
    }
    return map;
  }, [fileAccesses]);

  const virtualizer = useVirtualizer({
    count: spans.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20
  });

  if (spans.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">No spans to display. Select a conversation or wait for new data.</div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="timeline-container">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const span = spans[virtualItem.index]!;
          const stepToolCalls = toolCallsByStep.get(span.stepIndex) ?? [];
          const stepFileAccesses = fileAccessesByStep.get(span.stepIndex) ?? [];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <TimelineRow
                span={span}
                toolCalls={stepToolCalls}
                fileAccesses={stepFileAccesses}
                isSelected={selectedIndex === virtualItem.index}
                onClick={() => setSelectedIndex(virtualItem.index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
