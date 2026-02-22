import OpenAI from 'openai';
import { env } from '../config/env.js';

const client = new OpenAI({ apiKey: env.openaiApiKey });

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
