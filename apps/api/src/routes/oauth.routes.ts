import { Router } from 'express';
import { google } from 'googleapis';
import { prisma } from '../prisma.js';
import { encryptToken } from '../crypto.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

// OAuth URLs generator
router.get('/google/url', authMiddleware, (req: AuthRequest, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/oauth/google/callback'
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.readonly'
    ],
    state: req.user!.id
  });

  res.json({ url });
});

// OAuth Callback handler
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).send('Authorization code missing');
    }

    const userId = typeof state === 'string' ? state : null;
    if (!userId) {
      return res.status(400).send('Invalid state parameter (user context missing)');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/oauth/google/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const providerEmail = userInfo.data.email || 'user@gmail.com';

    const accessTokenEnc = encryptToken(tokens.access_token || '');
    const refreshTokenEnc = encryptToken(tokens.refresh_token || tokens.access_token || '');

    await prisma.emailAccount.upsert({
      where: {
        userId_provider_providerEmail: {
          userId,
          provider: 'GMAIL',
          providerEmail
        }
      },
      update: {
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      },
      create: {
        userId,
        provider: 'GMAIL',
        providerEmail,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?connected=gmail`);
  } catch (error: any) {
    console.error('[Google OAuth Callback Error]', error);
    res.status(500).send('OAuth Authentication Failed');
  }
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../../.env');

function readEnv(): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq !== -1) {
      const key = trimmed.substring(0, firstEq).trim();
      const val = trimmed.substring(firstEq + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      env[key] = val;
    }
  });
  return env;
}

function writeEnv(updates: Record<string, string>) {
  const current = readEnv();
  const merged = { ...current, ...updates };
  const lines = Object.entries(merged).map(([k, v]) => `${k}="${v}"`);
  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  Object.entries(updates).forEach(([k, v]) => {
    process.env[k] = v;
  });
}

// Disconnect/Delete linked email account
router.delete('/accounts/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.emailAccount.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });
    res.json({ success: true, message: 'Account disconnected successfully' });
  } catch (error: any) {
    console.error('[Disconnect Account Error]', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// Get current Google App settings
router.get('/config', authMiddleware, (req, res) => {
  try {
    const env = readEnv();
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '',
      googleClientSecret: (process.env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET) ? '••••••••' : '',
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/oauth/google/callback',
      anthropicApiKey: (process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY) ? '••••••••' : ''
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read env configurations' });
  }
});

// Update Google App and Anthropic settings in the .env file at runtime
router.post('/config', authMiddleware, (req, res) => {
  try {
    const { googleClientId, googleClientSecret, googleRedirectUri, anthropicApiKey } = req.body;
    const updates: Record<string, string> = {};
    if (googleClientId !== undefined) updates.GOOGLE_CLIENT_ID = googleClientId;
    if (googleClientSecret !== undefined && googleClientSecret !== '••••••••') {
      updates.GOOGLE_CLIENT_SECRET = googleClientSecret;
    }
    if (googleRedirectUri !== undefined) updates.GOOGLE_REDIRECT_URI = googleRedirectUri;
    if (anthropicApiKey !== undefined && anthropicApiKey !== '••••••••') {
      updates.ANTHROPIC_API_KEY = anthropicApiKey;
    }

    writeEnv(updates);
    res.json({ success: true, message: 'Credentials updated successfully' });
  } catch (err: any) {
    console.error('[Update Config Error]', err);
    res.status(500).json({ error: 'Failed to save new credentials to .env file' });
  }
});

export default router;
