import React from 'react';

export function ConversationList({ conversations, activeConversationId, onSelect, onNew }) {
  return (
    <aside className="panel sidebar">
      <div className="row space-between">
        <h2>Chats</h2>
        <button onClick={onNew}>New</button>
      </div>
      <div className="list">
        {conversations.length === 0 ? (
          <p className="muted">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              className={`list-item ${activeConversationId === conv.id ? 'active' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <span>{conv.title}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
