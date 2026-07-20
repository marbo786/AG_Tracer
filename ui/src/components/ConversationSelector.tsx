interface ConversationSelectorProps {
  conversationIds: string[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
}

export function ConversationSelector({ conversationIds, activeConversationId, onSelect }: ConversationSelectorProps) {
  if (conversationIds.length === 0) {
    return (
      <div className="conversation-selector">
        <label>No conversations found</label>
      </div>
    );
  }

  return (
    <div className="conversation-selector">
      <label htmlFor="conversation-select">Session:</label>
      <select
        id="conversation-select"
        value={activeConversationId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled>Select a conversation...</option>
        {conversationIds.map(id => (
          <option key={id} value={id}>
            {id.slice(0, 8)}...
          </option>
        ))}
      </select>
    </div>
  );
}
