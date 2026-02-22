import dotenv from 'dotenv';
import { pool } from './pool.js';

dotenv.config();

async function main() {
  await pool.query(
    `INSERT INTO memories (key, value, priority)
     SELECT v.key, v.value, v.priority
     FROM (
      VALUES
      ('communication_style', 'Keep answers direct and practical.', 10),
      ('goal', 'Build a personal assistant for chat, image, and video workflows.', 9),
      ('tech_stack', 'Node/Express backend with Neon Postgres.', 9)
     ) AS v(key, value, priority)
     WHERE NOT EXISTS (
      SELECT 1 FROM memories m WHERE m.key = v.key
     );`
  );

  console.log('Seed complete.');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
