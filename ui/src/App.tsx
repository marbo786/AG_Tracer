import { useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useVsCodeApi } from './hooks/useVsCodeApi';
import { useSpans } from './hooks/useSpans';
import { Timeline } from './timeline/Timeline';
import { ConversationSelector } from './components/ConversationSelector';
import { Inspector } from './inspector/Inspector';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { useTracerStore } from './store/useTracerStore';
import { AgentFlow } from './flow/AgentFlow';
import { AnalyticsView } from './analytics/AnalyticsView';
import { FileEvolutionView } from './files/FileEvolutionView';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css'; // Let's add some styles for the toggle

export function App() {
  const vscodeApi = useVsCodeApi();
  const { selectConversation } = useSpans(vscodeApi);
  
  const { 
    conversations, 
    activeConversationId, 
    spans, 
    toolCalls, 
    fileAccesses, 
    isLoading, 
    error,
    selectedIndex,
    setSelectedIndex,
    viewMode,
    setViewMode,
    isAnalyticsOpen,
    setAnalyticsOpen
  } = useTracerStore();

  // Reset selection when conversation changes
  const handleSelectConversation = useCallback((conversationId: string) => {
    selectConversation(conversationId);
  }, [selectConversation]);

  useKeyboardNav();

  const selectedSpan = selectedIndex !== null ? spans[selectedIndex] ?? null : null;
  const selectedToolCalls = selectedSpan ? toolCalls.filter(t => t.stepIndex === selectedSpan.stepIndex) : [];
  const selectedFileAccesses = selectedSpan ? fileAccesses.filter(f => f.stepIndex === selectedSpan.stepIndex) : [];

  return (
    <div className="panel-layout">
      <div className="panel-header">
        <span className="panel-header-title">Antigravity Tracer</span>
        <div className="panel-header-right">
          <div className="view-toggle">
            <button 
              className={viewMode === 'timeline' ? 'active' : ''} 
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
            <button 
              className={viewMode === 'flow' ? 'active' : ''} 
              onClick={() => setViewMode('flow')}
            >
              Flow
            </button>
            <button 
              className={viewMode === 'files' ? 'active' : ''} 
              onClick={() => setViewMode('files')}
            >
              Files
            </button>
          </div>
          <div className="view-toggle" style={{ marginLeft: '8px' }}>
            <button 
              className={isAnalyticsOpen ? 'active' : ''} 
              onClick={() => setAnalyticsOpen(!isAnalyticsOpen)}
            >
              📊 Analytics
            </button>
          </div>
          <span className="span-count">
            {spans.length > 0 ? `${spans.length} steps` : ''}
          </span>
        </div>
      </div>
      <ConversationSelector
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
      />
      <div className="main-content" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="empty-state-text">Loading...</div>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              className="empty-state error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="empty-state-text">Error: {error}</div>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', height: '100%' }}
            >
              <PanelGroup direction="vertical">
                <Panel defaultSize={isAnalyticsOpen ? 60 : 100} minSize={30}>
                  <PanelGroup direction="horizontal">
                    <Panel defaultSize={50} minSize={20}>
                      {viewMode === 'timeline' ? (
                        <Timeline
                          spans={spans}
                          toolCalls={toolCalls}
                          fileAccesses={fileAccesses}
                          selectedIndex={selectedIndex}
                          onSelect={setSelectedIndex}
                        />
                      ) : viewMode === 'flow' ? (
                        <AgentFlow />
                      ) : (
                        <FileEvolutionView 
                          spans={spans}
                          toolCalls={toolCalls}
                          fileAccesses={fileAccesses}
                        />
                      )}
                    </Panel>
                    
                    {selectedSpan && (
                      <>
                        <PanelResizeHandle className="resize-handle" />
                        <Panel defaultSize={50} minSize={20}>
                          <Inspector
                            span={selectedSpan}
                            toolCalls={selectedToolCalls}
                            fileAccesses={selectedFileAccesses}
                            onClose={() => setSelectedIndex(null)}
                          />
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </Panel>
                
                {isAnalyticsOpen && (
                  <>
                    <PanelResizeHandle className="resize-handle horizontal" style={{ height: '4px', cursor: 'row-resize', background: 'var(--vscode-widget-border)' }} />
                    <Panel defaultSize={40} minSize={20}>
                      <AnalyticsView spans={spans} toolCalls={toolCalls} fileAccesses={fileAccesses} />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
