import OpenAI, { toFile } from 'openai';
import { env } from '../config/env.js';

const client = new OpenAI({ apiKey: env.openaiApiKey });

const audioExtensionByMimeType = {
  'audio/m4a': 'm4a',
  'audio/mp3': 'mp3',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mpeg',
  'audio/mpga': 'mpga',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/x-wav': 'wav'
};

function getAudioExtension(mimeType = '') {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return audioExtensionByMimeType[normalized] || 'webm';
}

export function buildSystemPrompt(memories) {
  const memoryText = memories
    .map((m) => `- (${m.priority}) ${m.key}: ${m.value}`)
    .join('\n');

  return [
    `You are ${env.assistantName}, a personal AI assistant.`,
    `Communication style: ${env.assistantStyle}.`,
    'Primary behavior rules:',
    '- Be practical and concise.',
    '- Ask clarifying questions only if necessary.',
    '- Prefer actionable steps over abstract advice.',
    "- Keep continuity with the user's stated preferences and goals.",
    '',
    'Known user memory:',
    memoryText || '- No memories saved yet.'
  ].join('\n');
}

export async function transcribeVoiceInput({ audioBase64, mimeType }) {
  const base64Payload = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
  const audioBuffer = Buffer.from(base64Payload, 'base64');
  const extension = getAudioExtension(mimeType);
  const file = await toFile(audioBuffer, `voice-input.${extension}`, {
    type: mimeType || `audio/${extension}`
  });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: env.openaiTranscribeModel,
    language: 'en',
    prompt:
      'This is a direct voice command for a personal assistant. Prefer accurate punctuation, names, tasks, and numbers.',
    response_format: 'json',
    temperature: 0,
    chunking_strategy: 'auto'
  });

  return transcription.text?.trim() || '';
}

export async function createAssistantResponse({ systemPrompt, messages }) {
  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content
    }))
  ];

  const response = await client.chat.completions.create({
    model: env.openaiModel,
    messages: apiMessages,
    temperature: 0.5
  });

  return response.choices[0]?.message?.content?.trim() || 'I could not generate a response.';
}
