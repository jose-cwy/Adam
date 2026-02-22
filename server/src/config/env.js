import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'OPENAI_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[warn] Missing required env var: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  assistantName: process.env.ASSISTANT_NAME || 'Adam',
  assistantStyle:
    process.env.ASSISTANT_STYLE || 'Direct, pragmatic, organized, and concise'
};
