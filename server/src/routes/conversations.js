import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

export const conversationsRouter = Router();

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional()
});

conversationsRouter.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       ORDER BY updated_at DESC
       LIMIT 100`
    );

    res.json({ conversations: result.rows });
  } catch (err) {
    next(err);
  }
});

conversationsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = createConversationSchema.parse(req.body || {});
    const title = parsed.title || 'New Chat';

    const result = await pool.query(
      `INSERT INTO conversations (title)
       VALUES ($1)
       RETURNING id, title, created_at, updated_at`,
      [title]
    );

    res.status(201).json({ conversation: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

conversationsRouter.get('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, role, content, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    next(err);
  }
});

conversationsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM conversations
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
