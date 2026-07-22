import { ChangeEvent } from 'react';

interface ConversationSelectorProps {
  conversations: { id: string, title: string }[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationSelector({
  conversations,
  activeConversationId,
  onSelect
}: ConversationSelectorProps) {
  
  if (conversations.length === 0) {
    return <div className="conversation-selector-empty">No conversations found</div>;
  }

  return (
    <div className="conversation-selector">
      <select 
        value={activeConversationId ?? ''} 
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onSelect(e.target.value)}
        className="vscode-select"
      >
        <option value="" disabled>Select a conversation...</option>
        {conversations.map(conv => (
          <option key={conv.id} value={conv.id}>
            {conv.title}
          </option>
        ))}
      </select>
    </div>
  );
}
