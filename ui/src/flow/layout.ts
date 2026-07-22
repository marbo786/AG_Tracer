import type { Span, ToolCallRecord } from '@ag-tracer/shared';
import type { Node, Edge } from '@xyflow/react';

const ROW_HEIGHT = 150;
const LANE_WIDTH = 250;
const BASE_X = 50;
const MIN_CLUSTER_SIZE = 3;

export function getLayoutElements(
  spans: Span[], 
  toolCalls: ToolCallRecord[],
  expandedClusters: Record<string, boolean>
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let currentY = 0;
  let i = 0;
  let lastRenderedNodeId: string | null = null;

  while (i < spans.length) {
    const span = spans[i];
    if (!span) break;
    
    // Look ahead to find the full cluster size
    let clusterSize = 1;
    while (i + clusterSize < spans.length) {
      const nextSpan = spans[i + clusterSize];
      if (!nextSpan || nextSpan.type !== span.type || nextSpan.source !== span.source) {
        break;
      }
      clusterSize++;
    }

    if (clusterSize >= MIN_CLUSTER_SIZE) {
      const lastSpanInCluster = spans[i + clusterSize - 1];
      if (!lastSpanInCluster) break;
      
      const clusterId = `cluster-${span.stepIndex}-${lastSpanInCluster.stepIndex}`;
      const isExpanded = expandedClusters[clusterId];

      let hasError = false;
      let hasRunning = false;
      for (let j = 0; j < clusterSize; j++) {
        const cSpan = spans[i + j];
        if (cSpan?.status === 'ERROR') hasError = true;
        if (cSpan?.status === 'RUNNING') hasRunning = true;
      }

      if (!isExpanded) {
        // Render a single collapsed cluster node
        nodes.push({
          id: clusterId,
          type: 'clusterNode',
          position: { x: BASE_X, y: currentY },
          data: { 
            clusterId, 
            count: clusterSize, 
            type: span.type, 
            source: span.source,
            hasError,
            hasRunning
          },
        });

        if (lastRenderedNodeId) {
          edges.push({
            id: `edge-${lastRenderedNodeId}-to-${clusterId}`,
            source: lastRenderedNodeId,
            target: clusterId,
            type: 'smoothstep',
            animated: true,
          });
        }

        lastRenderedNodeId = clusterId;
        currentY += ROW_HEIGHT;
        i += clusterSize; // Skip the entire cluster
        continue;
      }
      
      // If expanded, we fall through and render individual nodes
      for (let j = 0; j < clusterSize; j++) {
        const cSpan = spans[i + j];
        if (!cSpan) continue;
        
        const spanNodeId = `span-${cSpan.stepIndex}`;
        
        nodes.push({
          id: spanNodeId,
          type: 'spanNode',
          position: { x: BASE_X, y: currentY },
          data: { span: cSpan },
        });

        if (lastRenderedNodeId) {
          edges.push({
            id: `edge-${lastRenderedNodeId}-to-${spanNodeId}`,
            source: lastRenderedNodeId,
            target: spanNodeId,
            type: 'smoothstep',
            animated: true,
          });
        }
        lastRenderedNodeId = spanNodeId;

        // Tool calls for this span
        const spanToolCalls = toolCalls.filter(tc => tc.stepIndex === cSpan.stepIndex);
        spanToolCalls.forEach((tc) => {
          const tcX = BASE_X + LANE_WIDTH + (tc.toolCallIndex * LANE_WIDTH);
          const tcY = currentY + 20;
          const toolNodeId = `tool-${tc.stepIndex}-${tc.toolCallIndex}`;

          nodes.push({
            id: toolNodeId,
            type: 'toolNode',
            position: { x: tcX, y: tcY },
            data: { toolCall: tc },
          });

          edges.push({
            id: `edge-${spanNodeId}-to-${toolNodeId}`,
            source: spanNodeId,
            target: toolNodeId,
            type: 'smoothstep',
          });
        });

        currentY += ROW_HEIGHT;
      }
      
      i += clusterSize;
      continue;
    }

    // Normal rendering for single nodes (not part of a cluster)
    const spanNodeId = `span-${span.stepIndex}`;
    nodes.push({
      id: spanNodeId,
      type: 'spanNode',
      position: { x: BASE_X, y: currentY },
      data: { span },
    });

    if (lastRenderedNodeId) {
      edges.push({
        id: `edge-${lastRenderedNodeId}-to-${spanNodeId}`,
        source: lastRenderedNodeId,
        target: spanNodeId,
        type: 'smoothstep',
        animated: true,
      });
    }

    lastRenderedNodeId = spanNodeId;

    const spanToolCalls = toolCalls.filter(tc => tc.stepIndex === span.stepIndex);
    spanToolCalls.forEach((tc) => {
      const tcX = BASE_X + LANE_WIDTH + (tc.toolCallIndex * LANE_WIDTH);
      const tcY = currentY + 20;
      const toolNodeId = `tool-${tc.stepIndex}-${tc.toolCallIndex}`;

      nodes.push({
        id: toolNodeId,
        type: 'toolNode',
        position: { x: tcX, y: tcY },
        data: { toolCall: tc },
      });

      edges.push({
        id: `edge-${spanNodeId}-to-${toolNodeId}`,
        source: spanNodeId,
        target: toolNodeId,
        type: 'smoothstep',
      });
    });

    currentY += ROW_HEIGHT;
    i++;
  }

  return { nodes, edges };
}
