import { useRef, useMemo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';
import { TimelineRow } from './TimelineRow';
import { TimelineFilterBar } from './TimelineFilterBar';
import { useTracerStore } from '../store/useTracerStore';

interface TimelineProps {
  spans: Span[];
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function Timeline({ spans, toolCalls, fileAccesses, selectedIndex, onSelect }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);

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

  const thrashingSteps = useTracerStore(state => state.thrashingSteps);

  const filters = useTracerStore(state => state.timelineFilters);

  const filteredSpans = useMemo(() => {
    return spans.filter(span => {
      let matches = false;

      // Source-based filters
      if (filters.has('user') && span.source === 'USER_EXPLICIT') matches = true;
      if (filters.has('agent') && span.source === 'MODEL') matches = true;
      if (filters.has('system') && (span.source === 'SYSTEM' || span.type.includes('MESSAGE'))) matches = true;
      
      // Status/Error filter
      if (filters.has('error') && (span.status === 'ERROR' || span.type === 'ERROR_MESSAGE')) matches = true;

      // Tool-based filters
      const tc = toolCallsByStep.get(span.stepIndex) || [];
      const fa = fileAccessesByStep.get(span.stepIndex) || [];
      
      const hasRead = fa.some(f => f.accessType === 'read' || f.accessType === 'list' || f.accessType === 'search');
      const hasWrite = fa.some(f => f.accessType === 'write');
      const hasCmd = tc.some(t => t.toolName === 'run_command');
      
      if (filters.has('read') && hasRead) matches = true;
      if (filters.has('write') && hasWrite) matches = true;
      if (filters.has('cmd') && hasCmd) matches = true;
      
      return matches;
    });
  }, [spans, filters, toolCallsByStep, fileAccessesByStep]);

  const virtualizer = useVirtualizer({
    count: filteredSpans.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20
  });

  const maxIndexRef = useRef(-1);
  const [animationsToRun, setAnimationsToRun] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (spans.length === 0) return;
    const lastSpan = spans[spans.length - 1];
    if (!lastSpan) return;

    if (maxIndexRef.current === -1) {
      // First load, don't animate existing rows
      maxIndexRef.current = lastSpan.stepIndex;
      return;
    }

    if (lastSpan.stepIndex > maxIndexRef.current) {
      // Check burst condition
      let isBurst = false;
      if (spans.length >= 2) {
        const prevSpan = spans[spans.length - 2];
        if (prevSpan) {
          const lastTime = new Date(lastSpan.createdAt).getTime();
          const prevTime = new Date(prevSpan.createdAt).getTime();
          isBurst = (lastTime - prevTime) < 150;
        }
      }

      if (!isBurst) {
        setAnimationsToRun(prev => {
          const next = new Set(prev);
          next.add(lastSpan.stepIndex);
          return next;
        });
      }
      maxIndexRef.current = lastSpan.stepIndex;
    }
  }, [spans]);

  const handleAnimationComplete = (stepIndex: number) => {
    setAnimationsToRun(prev => {
      if (!prev.has(stepIndex)) return prev;
      const next = new Set(prev);
      next.delete(stepIndex);
      return next;
    });
  };

  if (spans.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-text">No spans to display. Select a conversation or wait for new data.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TimelineFilterBar />
      <div ref={parentRef} className="timeline-container" style={{ flex: 1 }}>
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const span = filteredSpans[virtualItem.index]!;
          const stepToolCalls = toolCallsByStep.get(span.stepIndex) ?? [];
          const stepFileAccesses = fileAccessesByStep.get(span.stepIndex) ?? [];
          
          // Map the virtualized index back to the absolute selectedIndex
          const absoluteIndex = spans.findIndex(s => s.stepIndex === span.stepIndex);

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
                isSelected={selectedIndex === absoluteIndex}
                isThrashing={thrashingSteps.has(span.stepIndex)}
                onClick={() => onSelect(absoluteIndex)}
                animateEntrance={animationsToRun.has(span.stepIndex)}
                onAnimationComplete={() => handleAnimationComplete(span.stepIndex)}
              />
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
