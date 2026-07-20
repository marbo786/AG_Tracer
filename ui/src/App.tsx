import { useVsCodeApi } from './hooks/useVsCodeApi';
import { useSpans } from './hooks/useSpans';
import { Timeline } from './timeline/Timeline';
import { ConversationSelector } from './components/ConversationSelector';

export function App() {
  const vscodeApi = useVsCodeApi();
  const { conversationIds, activeConversationId, data, isLoading, selectConversation } = useSpans(vscodeApi);

  return (
    <div className="panel-layout">
      <div className="panel-header">
        <span className="panel-header-title">Antigravity Tracer</span>
        <span className="span-count">
          {data.spans.length > 0 ? `${data.spans.length} steps` : ''}
        </span>
      </div>
      <ConversationSelector
        conversationIds={conversationIds}
        activeConversationId={activeConversationId}
        onSelect={selectConversation}
      />
      {isLoading ? (
        <div className="empty-state">
          <div className="empty-state-text">Loading...</div>
        </div>
      ) : (
        <Timeline
          spans={data.spans}
          toolCalls={data.toolCalls}
          fileAccesses={data.fileAccesses}
        />
      )}
    </div>
  );
}
