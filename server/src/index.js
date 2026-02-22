import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import { healthRouter } from './routes/health.js';
import { conversationsRouter } from './routes/conversations.js';
import { memoryRouter } from './routes/memory.js';
import { chatRouter } from './routes/chat.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  })
);
app.use(express.json({ limit: '2mb' }));

app.use('/api/health', healthRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/chat', chatRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
