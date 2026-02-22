import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';

export const memoryRouter = Router();

const createMemorySchema = z.object({
  key: z.string().min(1).max(120),
  value: z.string().min(1).max(3000),
  priority: z.number().int().min(1).max(10).optional()
});

const updateMemorySchema = z.object({
  key: z.string().min(1).max(120).optional(),
  value: z.string().min(1).max(3000).optional(),
  priority: z.number().int().min(1).max(10).optional()
});

memoryRouter.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, key, value, priority, created_at, updated_at
       FROM memories
       ORDER BY priority DESC, updated_at DESC`
    );

    res.json({ memories: result.rows });
  } catch (err) {
    next(err);
  }
});

memoryRouter.post('/', async (req, res, next) => {
  try {
    const parsed = createMemorySchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO memories (key, value, priority)
       VALUES ($1, $2, $3)
       RETURNING id, key, value, priority, created_at, updated_at`,
      [parsed.key, parsed.value, parsed.priority ?? 5]
    );

    res.status(201).json({ memory: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

memoryRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = updateMemorySchema.parse(req.body);

    const existing = await pool.query(`SELECT * FROM memories WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE memories
       SET key = $1, value = $2, priority = $3
       WHERE id = $4
       RETURNING id, key, value, priority, created_at, updated_at`,
      [parsed.key ?? current.key, parsed.value ?? current.value, parsed.priority ?? current.priority, id]
    );

    res.json({ memory: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

memoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM memories WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
