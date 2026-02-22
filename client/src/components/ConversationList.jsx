import React from 'react';

export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDeleteConversation
}) {
  return (
    <aside className="panel sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNew}>
          + New Chat
        </button>
        <h2>History</h2>
      </div>
      <div className="list">
        {conversations.length === 0 ? (
          <p className="muted">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="list-item-wrap">
              <button
                className={`list-item ${activeConversationId === conv.id ? 'active' : ''}`}
                onClick={() => onSelect(conv.id)}
              >
                <span>{conv.title}</span>
              </button>
              <button
                className="delete-chat-btn"
                type="button"
                title="Delete chat"
                aria-label={`Delete chat ${conv.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
