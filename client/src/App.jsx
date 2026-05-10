import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './lib/api';
import { ConversationList } from './components/ConversationList';

const PREFERRED_RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4'
];

function getSupportedRecordingMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder?.isTypeSupported) {
    return '';
  }

  return (
    PREFERRED_RECORDING_MIME_TYPES.find((mimeType) =>
      window.MediaRecorder.isTypeSupported(mimeType)
    ) || ''
  );
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isVoiceLanding, setIsVoiceLanding] = useState(true);
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState('');
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingMimeTypeRef = useRef('audio/webm');
  const inputRef = useRef('');
  const shouldProcessRecordingRef = useRef(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const voiceStatus = !speechSupported
    ? 'Voice input is not available in this browser.'
    : isListening
      ? 'Listening now. Tap again when you are done speaking.'
      : isTranscribing
        ? 'Sharpening your words before sending them to Adam...'
        : isSending
          ? 'Sending your voice message into the chat...'
          : 'Voice input is ready.';

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

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  async function startVoiceMeter(stream) {
    if (analyserRef.current) {
      return;
    }

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
    const voiceAvailable = Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
    setSpeechSupported(voiceAvailable);

    return () => {
      shouldProcessRecordingRef.current = false;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
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
    setInput('');
    inputRef.current = '';
    setLastVoiceTranscript('');
    setIsVoiceLanding(true);
  }

  async function handleDeleteConversation(conversationId) {
    try {
      await api.deleteConversation(conversationId);
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== conversationId);
        if (activeConversationId === conversationId) {
          const nextActive = next[0]?.id || null;
          setActiveConversationId(nextActive);
          if (!nextActive) {
            setMessages([]);
            setLastVoiceTranscript('');
            setIsVoiceLanding(true);
          }
        }
        return next;
      });
    } catch (e) {
      setError(e.message);
    }
  }

  function handleSelectConversation(conversationId) {
    setActiveConversationId(conversationId);
    setIsVoiceLanding(false);
  }

  async function sendMessage(messageText, options = {}) {
    const { switchToChat = false } = options;
    const userMessage = messageText.trim();
    if (!userMessage || isSending) {
      return;
    }

    if (switchToChat) {
      setIsVoiceLanding(false);
    }

    setInput('');
    inputRef.current = '';
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

  async function transcribeAndSend(audioBlob) {
    try {
      setIsTranscribing(true);
      setError('');

      const audioBase64 = await blobToBase64(audioBlob);
      const data = await api.transcribeAudio({
        audioBase64,
        mimeType: audioBlob.type || recordingMimeTypeRef.current
      });

      const transcript = data.transcript.trim();
      if (!transcript) {
        setError('I could not clearly make that out. Try again a bit closer to the mic.');
        return;
      }

      setLastVoiceTranscript(transcript);
      setInput(transcript);
      inputRef.current = transcript;

      await sendMessage(transcript, { switchToChat: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  async function startVoiceCapture() {
    if (!speechSupported) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    if (isSending || isTranscribing) {
      return;
    }

    setError('');
    setLastVoiceTranscript('');
    audioChunksRef.current = [];
    shouldProcessRecordingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      micStreamRef.current = stream;
      await startVoiceMeter(stream);

      const mimeType = getSupportedRecordingMimeType();
      recordingMimeTypeRef.current = mimeType || 'audio/webm';

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = async () => {
        shouldProcessRecordingRef.current = false;
        setIsListening(false);
        setError('Voice recording failed. Please try again.');
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        await stopVoiceMeter();
      };

      mediaRecorder.onstop = async () => {
        const shouldProcess = shouldProcessRecordingRef.current;
        const chunks = [...audioChunksRef.current];
        const mimeTypeValue = recordingMimeTypeRef.current;

        shouldProcessRecordingRef.current = false;
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsListening(false);
        await stopVoiceMeter();

        if (!shouldProcess) {
          return;
        }

        const audioBlob = new Blob(chunks, { type: mimeTypeValue || 'audio/webm' });
        if (audioBlob.size < 1024) {
          setError('I did not catch enough audio. Try speaking a little longer.');
          return;
        }

        await transcribeAndSend(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (_err) {
      shouldProcessRecordingRef.current = false;
      setIsListening(false);
      setError('Microphone access failed. Check browser permissions.');
      await stopVoiceMeter();
    }
  }

  function handleVoiceToggle() {
    if (!speechSupported) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    if (isTranscribing || isSending) {
      return;
    }

    if (isListening) {
      mediaRecorderRef.current?.stop();
      return;
    }

    startVoiceCapture().catch((e) => setError(e.message));
  }

  async function handleSend(e) {
    e.preventDefault();
    await sendMessage(input, { switchToChat: true });
  }

  return (
    <main className="layout">
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <section className={`panel chat ${isVoiceLanding ? 'voice-layout' : 'chat-layout'}`}>
        <div className={isVoiceLanding ? 'voice-stage' : 'chat-view'}>
          {isVoiceLanding ? (
            <>
              <div className="chat-header">
                <p className="eyebrow">Adam Voice</p>
                <h1>{activeConversation?.title || 'Adam'}</h1>
                <p className="muted">Tap the orb and speak naturally.</p>
              </div>
              <button
                type="button"
                className={`voice-orb ${isListening ? 'listening' : ''} ${isTranscribing ? 'processing' : ''}`}
                style={{ '--level': voiceLevel }}
                onClick={handleVoiceToggle}
                disabled={!speechSupported || isTranscribing || isSending}
                aria-label={isListening ? 'Stop voice capture' : 'Start voice capture'}
              >
                <span className="orb-core">
                  {isListening ? 'Stop' : isTranscribing ? 'Wait' : isSending ? 'Send' : 'Speak'}
                </span>
                <span className="orb-ring orb-ring-a" />
                <span className="orb-ring orb-ring-b" />
                <span className="orb-ring orb-ring-c" />
              </button>
              <div className={`voice-status-card ${lastVoiceTranscript ? 'has-transcript' : ''}`}>
                <p className="muted">{voiceStatus}</p>
                {lastVoiceTranscript ? <p className="voice-transcript">"{lastVoiceTranscript}"</p> : null}
              </div>
            </>
          ) : (
            <>
              <div className="chat-view-header">
                <h1>Adam</h1>
                <p className="muted">How can I help you today?</p>
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
                {isSending ? (
                  <article className="message assistant pending">
                    <h3>Adam</h3>
                    <p>Thinking...</p>
                  </article>
                ) : null}
              </div>
            </>
          )}
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
              placeholder={isTranscribing ? 'Transcribing your voice...' : 'Ask anything'}
            />
            <div className="composer-trailing">
              <button
                type="button"
                className={`icon-btn mic-btn ${isListening ? 'active' : ''}`}
                onClick={handleVoiceToggle}
                disabled={!speechSupported || isTranscribing || isSending}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                <span aria-hidden>Mic</span>
              </button>
              <button className="send-btn" disabled={isSending || isTranscribing} aria-label="Send message">
                <span aria-hidden>{isSending ? '...' : 'Send'}</span>
              </button>
            </div>
          </div>
        </form>
        <p className="muted">{voiceStatus}</p>

        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
