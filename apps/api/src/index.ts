import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from the monorepo root before any other imports that need env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import oauthRoutes from './routes/oauth.routes.js';
import aiRoutes from './routes/ai.routes.js';
import draftsRoutes from './routes/drafts.routes.js';
import emailsRoutes from './routes/emails.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import { startScheduler } from './services/scheduler.service.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/drafts', draftsRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/schedule', scheduleRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Flymail Express API', version: '1.0.0' });
});

// Initialize background scheduler
startScheduler();

app.listen(PORT, () => {
  console.log(`⚡ Flymail Express API server running on port ${PORT}`);
});
