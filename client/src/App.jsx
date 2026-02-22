import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api';
import { ConversationList } from './components/ConversationList';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  useEffect(() => {
    loadConversations().catch((e) => setError(e.message));
  }, []);

  async function startVoiceMeter() {
    if (analyserRef.current) {
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioCtx();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const sample = () => {
      analyser.getByteFrequencyData(data);
      const sum = data.reduce((acc, value) => acc + value, 0);
      const average = sum / data.length || 0;
      const normalized = Math.min(1, average / 75);
      setVoiceLevel(normalized);
      animationFrameRef.current = requestAnimationFrame(sample);
    };
    sample();
  }

  async function stopVoiceMeter() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setVoiceLevel(0);

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

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

    recognition.onstart = async () => {
      setIsListening(true);
      setError('');
      try {
        await startVoiceMeter();
      } catch (_err) {
        setError('Microphone access failed. Check browser permissions.');
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      await stopVoiceMeter();
    };

    recognition.onerror = async (event) => {
      setIsListening(false);
      await stopVoiceMeter();
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
      stopVoiceMeter();
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

  function handleVoiceToggle() {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      return;
    }
    try {
      recognitionRef.current.start();
    } catch (_err) {
      setError('Voice recognition is already active.');
    }
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
        <div className="voice-stage">
          <div className="chat-header">
            <p className="eyebrow">Adam Voice</p>
            <h1>{activeConversation?.title || 'Adam'}</h1>
            <p className="muted">Tap the orb and speak naturally.</p>
          </div>
          <button
            type="button"
            className={`voice-orb ${isListening ? 'listening' : ''}`}
            style={{ '--level': voiceLevel }}
            onClick={handleVoiceToggle}
            disabled={!speechSupported}
            aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
          >
            <span className="orb-core">{isListening ? 'Stop' : 'Speak'}</span>
            <span className="orb-ring orb-ring-a" />
            <span className="orb-ring orb-ring-b" />
            <span className="orb-ring orb-ring-c" />
          </button>
        </div>

        <form className="composer" onSubmit={handleSend}>
          <div className="composer-bar">
            <button type="button" className="icon-btn plus-btn" aria-label="Add attachment">
              +
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything"
            />
            <div className="composer-trailing">
              <button
                type="button"
                className={`icon-btn mic-btn ${isListening ? 'active' : ''}`}
                onClick={handleVoiceToggle}
                disabled={!speechSupported}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                <span aria-hidden>🎙</span>
              </button>
              <button className="send-btn" disabled={isSending} aria-label="Send message">
                <span aria-hidden>{isSending ? '…' : '↑'}</span>
              </button>
            </div>
          </div>
        </form>
        {speechSupported ? (
          <p className="muted">{isListening ? 'Listening now...' : 'Voice input is ready.'}</p>
        ) : (
          <p className="muted">Voice input is not available in this browser.</p>
        )}

        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
