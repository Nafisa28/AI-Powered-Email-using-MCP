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

    res.redirect('http://localhost:5173/settings?connected=gmail');
  } catch (error: any) {
    console.error('[Google OAuth Callback Error]', error);
    res.status(500).send('OAuth Authentication Failed');
  }
});

// Dev / Demo Link account endpoint (when testing without live OAuth apps)
router.post('/connect-mock', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { provider, providerEmail } = req.body;
    if (!provider || !providerEmail) {
      return res.status(400).json({ error: 'Provider and providerEmail are required' });
    }

    const accessTokenEnc = encryptToken(`mock_access_token_${Date.now()}`);
    const refreshTokenEnc = encryptToken(`mock_refresh_token_${Date.now()}`);

    const account = await prisma.emailAccount.upsert({
      where: {
        userId_provider_providerEmail: {
          userId: req.user!.id,
          provider,
          providerEmail
        }
      },
      update: {
        accessTokenEnc,
        refreshTokenEnc
      },
      create: {
        userId: req.user!.id,
        provider,
        providerEmail,
        accessTokenEnc,
        refreshTokenEnc
      }
    });

    res.json({
      success: true,
      account: {
        id: account.id,
        provider: account.provider,
        providerEmail: account.providerEmail,
        connectedAt: account.connectedAt
      }
    });
  } catch (error: any) {
    console.error('[Mock Connect Error]', error);
    res.status(500).json({ error: 'Failed to connect email account' });
  }
});

export default router;
