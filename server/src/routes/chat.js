import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../db/pool.js';
import {
  buildSystemPrompt,
  createAssistantResponse,
  transcribeVoiceInput
} from '../services/aiService.js';

export const chatRouter = Router();

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000)
});

const transcribeSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().min(1).max(120).optional()
});

async function getTopMemories(limit = 20) {
  const result = await pool.query(
    `SELECT key, value, priority
     FROM memories
     ORDER BY priority DESC, updated_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

chatRouter.post('/transcribe', async (req, res, next) => {
  try {
    const parsed = transcribeSchema.parse(req.body);
    const transcript = await transcribeVoiceInput(parsed);

    res.json({ transcript });
  } catch (err) {
    next(err);
  }
});

chatRouter.post('/', async (req, res, next) => {
  try {
    const parsed = chatSchema.parse(req.body);

    let conversationId = parsed.conversationId;
    if (!conversationId) {
      const conv = await pool.query(
        `INSERT INTO conversations (title)
         VALUES ($1)
         RETURNING id`,
        [parsed.message.slice(0, 60)]
      );
      conversationId = conv.rows[0].id;
    }

    await pool.query(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'user', $2)`,
      [conversationId, parsed.message]
    );

    const messageResult = await pool.query(
      `SELECT role, content
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 30`,
      [conversationId]
    );

    const memories = await getTopMemories(20);
    const systemPrompt = buildSystemPrompt(memories);

    const assistantReply = await createAssistantResponse({
      systemPrompt,
      messages: messageResult.rows
    });

    await pool.query(
      `INSERT INTO messages (conversation_id, role, content)
       VALUES ($1, 'assistant', $2)`,
      [conversationId, assistantReply]
    );

    await pool.query(
      `UPDATE conversations
       SET updated_at = NOW()
       WHERE id = $1`,
      [conversationId]
    );

    res.json({
      conversationId,
      reply: assistantReply
    });
  } catch (err) {
    next(err);
  }
});
