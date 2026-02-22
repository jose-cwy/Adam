const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getHealth: () => request('/api/health'),
  listConversations: () => request('/api/conversations'),
  createConversation: (title) =>
    request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    }),
  getMessages: (conversationId) => request(`/api/conversations/${conversationId}/messages`),
  sendChat: (body) =>
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  listMemories: () => request('/api/memory'),
  createMemory: (body) =>
    request('/api/memory', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateMemory: (id, body) =>
    request(`/api/memory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  deleteMemory: (id) =>
    request(`/api/memory/${id}`, {
      method: 'DELETE'
    })
};
