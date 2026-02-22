import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api';
import { ConversationList } from './components/ConversationList';
import { MemoryPanel } from './components/MemoryPanel';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [memories, setMemories] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  async function loadConversations() {
    const data = await api.listConversations();
    setConversations(data.conversations);
    if (!activeConversationId && data.conversations.length > 0) {
      setActiveConversationId(data.conversations[0].id);
    }
  }

  async function loadMessages(conversationId) {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const data = await api.getMessages(conversationId);
    setMessages(data.messages);
  }

  async function loadMemories() {
    const data = await api.listMemories();
    setMemories(data.memories);
  }

  useEffect(() => {
    loadConversations().catch((e) => setError(e.message));
    loadMemories().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Allow mic access to use voice input.');
        return;
      }
      if (event.error !== 'no-speech') {
        setError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    loadMessages(activeConversationId).catch((e) => setError(e.message));
  }, [activeConversationId]);

  async function handleNewConversation() {
    const { conversation } = await api.createConversation('New Chat');
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
    setMessages([]);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) {
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setIsSending(true);
    setError('');

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userMessage }]);

    try {
      const data = await api.sendChat({
        conversationId: activeConversationId || undefined,
        message: userMessage
      });

      if (!activeConversationId) {
        setActiveConversationId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: data.reply }
      ]);

      await loadConversations();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateMemory(memory) {
    await api.createMemory(memory);
    await loadMemories();
  }

  async function handleDeleteMemory(id) {
    await api.deleteMemory(id);
    await loadMemories();
  }

  function handleVoiceToggle() {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      return;
    }
    recognitionRef.current.start();
  }

  return (
    <main className="layout">
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewConversation}
      />

      <section className="panel chat">
        <div className="chat-header">
          <h1>{activeConversation?.title || 'Adam'}</h1>
        </div>

        <div className="messages">
          {messages.length === 0 ? (
            <p className="muted">Start a conversation.</p>
          ) : (
            messages.map((msg) => (
              <article key={msg.id} className={`message ${msg.role}`}>
                <h3>{msg.role === 'assistant' ? 'Adam' : 'You'}</h3>
                <p>{msg.content}</p>
              </article>
            ))
          )}
        </div>

        <form className="composer" onSubmit={handleSend}>
          <div className="composer-input">
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
            />
            <div className="composer-actions">
              <button
                type="button"
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onClick={handleVoiceToggle}
                disabled={!speechSupported}
              >
                {isListening ? 'Stop Listening' : 'Voice Input'}
              </button>
              <button disabled={isSending}>{isSending ? 'Thinking...' : 'Send'}</button>
            </div>
          </div>
        </form>
        {speechSupported ? (
          <p className="muted">{isListening ? 'Listening...' : 'Voice input is ready.'}</p>
        ) : (
          <p className="muted">Voice input is not available in this browser.</p>
        )}

        {error ? <p className="error">{error}</p> : null}
      </section>

      <MemoryPanel memories={memories} onCreate={handleCreateMemory} onDelete={handleDeleteMemory} />
    </main>
  );
}
