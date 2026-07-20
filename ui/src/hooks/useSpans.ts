import { useState, useEffect, useCallback } from 'react';
import type { Span, ToolCallRecord, FileAccessRecord } from '@ag-tracer/shared';

// Re-define the message types here to avoid importing from extension/
// (the UI should not depend on the extension package)
interface SpanData {
  spans: Span[];
  toolCalls: ToolCallRecord[];
  fileAccesses: FileAccessRecord[];
}

interface SpanState {
  conversationIds: string[];
  activeConversationId: string | null;
  data: SpanData;
  isLoading: boolean;
}

export function useSpans(vscodeApi: VsCodeApi | null) {
  const [state, setState] = useState<SpanState>({
    conversationIds: [],
    activeConversationId: null,
    data: { spans: [], toolCalls: [], fileAccesses: [] },
    isLoading: true
  });

  // Listen for messages from the extension
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data;
      switch (message.type) {
        case 'conversations:list':
          setState(prev => ({ ...prev, conversationIds: message.conversationIds, isLoading: false }));
          break;
        case 'spans:initial':
          setState(prev => ({
            ...prev,
            activeConversationId: message.conversationId,
            data: {
              spans: message.spans,
              toolCalls: message.toolCalls,
              fileAccesses: message.fileAccesses
            },
            isLoading: false
          }));
          break;
        case 'spans:update':
          setState(prev => {
            if (prev.activeConversationId !== message.conversationId) return prev;
            return {
              ...prev,
              data: {
                spans: [...prev.data.spans, ...message.spans],
                toolCalls: [...prev.data.toolCalls, ...message.toolCalls],
                fileAccesses: [...prev.data.fileAccesses, ...message.fileAccesses]
              }
            };
          });
          break;
      }
    }

    window.addEventListener('message', handleMessage);
    
    // Request initial data
    vscodeApi?.postMessage({ type: 'request:conversations' });
    
    return () => window.removeEventListener('message', handleMessage);
  }, [vscodeApi]);

  const selectConversation = useCallback((conversationId: string) => {
    setState(prev => ({ ...prev, isLoading: true, activeConversationId: conversationId }));
    vscodeApi?.postMessage({ type: 'request:spans', conversationId });
  }, [vscodeApi]);

  return { ...state, selectConversation };
}
