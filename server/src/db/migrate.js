import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined
  });

  const sqlPath = path.resolve(__dirname, '../../sql/001_init.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');

  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await pool.query(sql);
    console.log('Migration complete: 001_init.sql');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
