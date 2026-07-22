import { useMemo, useCallback, useRef, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Panel, type NodeMouseHandler, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTracerStore } from '../store/useTracerStore';
import { getLayoutElements } from './layout';
import { SpanNode } from './SpanNode';
import { ToolNode } from './ToolNode';
import { ClusterNode } from './ClusterNode';

const nodeTypes = {
  spanNode: SpanNode,
  toolNode: ToolNode,
  clusterNode: ClusterNode,
};

export function AgentFlow() {
  const spans = useTracerStore((state) => state.spans);
  const toolCalls = useTracerStore((state) => state.toolCalls);
  const selectedIndex = useTracerStore((state) => state.selectedIndex);
  const setSelectedIndex = useTracerStore((state) => state.setSelectedIndex);
  const expandedClusters = useTracerStore((state) => state.expandedClusters);
  const toggleCluster = useTracerStore((state) => state.toggleCluster);

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const { nodes, edges } = useMemo(() => {
    return getLayoutElements(spans, toolCalls, expandedClusters);
  }, [spans, toolCalls, expandedClusters]);

  // Highlight selected node
  const nodesWithSelection = useMemo(() => {
    if (selectedIndex === null) return nodes;
    
    const selectedSpan = spans[selectedIndex];
    if (!selectedSpan) return nodes;

    return nodes.map(node => ({
      ...node,
      selected: node.id === `span-${selectedSpan.stepIndex}`
    }));
  }, [nodes, selectedIndex, spans]);

  // Fit view ONLY on initial mount/data load, unless we have a selected node to pan to
  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
    if (selectedIndex === null) {
      instance.fitView();
    }
  }, [selectedIndex]);

  // Auto-pan on new spans
  const prevSpansLengthRef = useRef(spans.length);
  useEffect(() => {
    if (spans.length > prevSpansLengthRef.current && rfInstanceRef.current && nodes.length > 0) {
      const latestNode = nodes[nodes.length - 1];
      if (latestNode && latestNode.position) {
        const zoom = rfInstanceRef.current.getZoom();
        rfInstanceRef.current.setCenter(latestNode.position.x, latestNode.position.y, { zoom, duration: 300 });
      }
    }
    prevSpansLengthRef.current = spans.length;
  }, [spans.length, nodes]);

  // Auto-pan when selectedIndex changes (Causal Navigation)
  const initialPanDoneRef = useRef(false);
  const prevSelectedIndexRef = useRef(selectedIndex);
  useEffect(() => {
    const shouldPan = (selectedIndex !== null) && 
                      (selectedIndex !== prevSelectedIndexRef.current || !initialPanDoneRef.current);
                      
    if (shouldPan && rfInstanceRef.current && nodes.length > 0) {
      const selectedSpan = spans[selectedIndex];
      if (selectedSpan) {
        const targetId = `span-${selectedSpan.stepIndex}`;
        let node = nodes.find(n => n.id === targetId);
        
        // If not found, it might be in a collapsed cluster
        if (!node) {
          node = nodes.find(n => {
            if (n.type === 'clusterNode') {
               const parts = n.id.split('-');
               const start = parseInt(parts[1]!, 10);
               const end = parseInt(parts[2]!, 10);
               return selectedSpan.stepIndex >= start && selectedSpan.stepIndex <= end;
            }
            return false;
          });
        }
        
        if (node && node.position) {
          const zoom = Math.max(1, rfInstanceRef.current.getZoom());
          rfInstanceRef.current.setCenter(node.position.x + 100, node.position.y + 100, { zoom, duration: 400 });
          initialPanDoneRef.current = true;
        }
      }
    }
    prevSelectedIndexRef.current = selectedIndex;
  }, [selectedIndex, spans, nodes]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (node.type === 'clusterNode') {
      const clusterId = node.data.clusterId as string;
      const isCurrentlyExpanded = expandedClusters[clusterId] || false;
      const firstSpanStepIndex = clusterId.split('-')[1];
      
      // Target node after React re-renders with the new layout
      const targetNodeId = isCurrentlyExpanded ? clusterId : `span-${firstSpanStepIndex}`;

      if (rfInstanceRef.current) {
        const zoom = rfInstanceRef.current.getZoom();
        const viewport = rfInstanceRef.current.getViewport();
        
        // 1. Record the clicked node's current screen Y position
        const screenY = viewport.y + (node.position.y * zoom);

        // Toggle the cluster
        toggleCluster(clusterId);
        
        // 2. Wait for React to re-render with the new layout, then grab the new positions
        setTimeout(() => {
          if (!rfInstanceRef.current) return;
          
          const updatedNode = rfInstanceRef.current.getNode(targetNodeId);
          if (updatedNode) {
            // 3. Compute new required viewport y such that the target node lands at the same screen Y
            const newViewportY = screenY - (updatedNode.position.y * zoom);
            
            // 4. Apply smooth transition
            rfInstanceRef.current.setViewport(
              { x: viewport.x, y: newViewportY, zoom },
              { duration: 200 }
            );
          }
        }, 50); // Small delay to ensure React Flow has updated its internal node state
      } else {
        toggleCluster(clusterId);
      }
      return;
    }

    if (node.type === 'spanNode' && node.data.span) {
      // @ts-expect-error
      const stepIndex = node.data.span.stepIndex;
      const idx = spans.findIndex(s => s.stepIndex === stepIndex);
      if (idx !== -1) setSelectedIndex(idx);
    } else if (node.type === 'toolNode' && node.data.toolCall) {
      // @ts-expect-error
      const stepIndex = node.data.toolCall.stepIndex;
      const idx = spans.findIndex(s => s.stepIndex === stepIndex);
      if (idx !== -1) setSelectedIndex(idx);
    }
  }, [spans, setSelectedIndex, toggleCluster, expandedClusters]);

  const jumpToLatest = useCallback(() => {
    if (rfInstanceRef.current && nodes.length > 0) {
      const latestNode = nodes[nodes.length - 1];
      if (!latestNode || !latestNode.position) return;
      const zoom = rfInstanceRef.current.getZoom();
      rfInstanceRef.current.setCenter(latestNode.position.x, latestNode.position.y, { zoom, duration: 300 });
    }
  }, [nodes]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onInit={onInit}
        minZoom={0.1}
        maxZoom={1.5}
        colorMode="dark"
        onlyRenderVisibleElements={true}
      >
        <Background color="#333" gap={16} />
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          nodeStrokeColor="#444" 
          nodeColor="var(--vscode-editor-background)" 
          maskColor="rgba(0,0,0,0.5)" 
        />
        <Panel position="bottom-center" style={{ marginBottom: '16px' }}>
          <button 
            onClick={jumpToLatest}
            style={{
              padding: '6px 12px',
              background: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: '1px solid var(--vscode-button-border, transparent)',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'var(--font-ui)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            ↓ Jump to latest
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
