import { useEffect, useCallback, useRef } from 'react';
import { useTracerStore } from '../store/useTracerStore';

interface VsCodeApi {
  postMessage(message: unknown): void;
}

export function useSpans(vscodeApi: VsCodeApi | null) {
  const { 
    setConversations, 
    setActiveConversation, 
    appendData, 
    setError 
  } = useTracerStore();

  const activeConversationRef = useRef<string | null>(null);

  // Listen for messages from the extension — only set up once
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data;
      switch (message.type) {
        case 'conversations:list':
          setConversations(message.conversations);
          break;
        case 'spans:initial':
          activeConversationRef.current = message.conversationId;
          setActiveConversation(message.conversationId, {
            spans: message.spans,
            toolCalls: message.toolCalls,
            fileAccesses: message.fileAccesses
          });
          break;
        case 'spans:update':
          appendData(message.conversationId, {
            spans: message.spans,
            toolCalls: message.toolCalls,
            fileAccesses: message.fileAccesses
          });
          break;
        case 'error':
          setError(message.message);
          break;
      }
    }

    window.addEventListener('message', handleMessage);
    
    // Request initial data
    vscodeApi?.postMessage({ type: 'request:conversations' });
    
    return () => window.removeEventListener('message', handleMessage);
  }, [vscodeApi, setConversations, setActiveConversation, appendData, setError]);

  const selectConversation = useCallback((conversationId: string) => {
    useTracerStore.getState().setLoading(true);
    useTracerStore.getState().setError(null);
    vscodeApi?.postMessage({ type: 'request:spans', conversationId });
  }, [vscodeApi]);

  return { selectConversation };
}
