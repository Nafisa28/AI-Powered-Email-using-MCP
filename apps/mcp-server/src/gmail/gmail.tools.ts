import { google } from 'googleapis';
import { decryptToken } from '../crypto.js';

interface GmailToolArgs {
  accessTokenEnc: string;
  refreshTokenEnc: string;
  clientId?: string;
  clientSecret?: string;
  to?: string;
  subject?: string;
  body?: string;
  query?: string;
  limit?: number;
}

function getGmailClient(accessTokenEnc: string, refreshTokenEnc: string, customClientId?: string, customClientSecret?: string) {
  const accessToken = decryptToken(accessTokenEnc);
  const refreshToken = decryptToken(refreshTokenEnc);

  if (!accessToken) {
    throw new Error('No valid access token found. Please reconnect your Gmail account via OAuth.');
  }

  const clientId = customClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = customClientSecret || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client ID and client secret are not configured in settings.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function createMimeMessage(to: string, subject: string, body: string): string {
  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body
  ];
  const message = messageParts.join('\r\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function handleGmailSendEmail(args: GmailToolArgs) {
  try {
    if (!args.to || !args.subject || !args.body) {
      return { success: false, error: 'Missing required email fields: to, subject, body' };
    }

    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth in Settings.' };
    }

    console.log(`[MCP Gmail] Sending email to: ${args.to}, subject: "${args.subject}"`);

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const raw = createMimeMessage(args.to, args.subject, args.body);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log(`[MCP Gmail] Email sent successfully. Gmail messageId: ${res.data.id}`);

    return {
      success: true,
      messageId: res.data.id,
      status: 'SENT'
    };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to send email via Gmail';
    console.error('[MCP Gmail Send Error]', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

export async function handleGmailSaveDraft(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const raw = createMimeMessage(args.to || '', args.subject || '', args.body || '');

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw }
      }
    });

    return {
      success: true,
      draftId: res.data.id,
      status: 'SAVED'
    };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to save draft via Gmail';
    console.error('[MCP Gmail Save Draft Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function handleGmailReadInbox(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults: args.limit || 10
    });

    const messages = [];
    if (listRes.data.messages) {
      for (const msg of listRes.data.messages) {
        if (!msg.id) continue;
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = details.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

        messages.push({
          id: details.data.id,
          threadId: details.data.threadId,
          from,
          to,
          subject,
          snippet: details.data.snippet,
          body: details.data.snippet || '',
          date
        });
      }
    }

    return { success: true, messages };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to read Gmail inbox';
    console.error('[MCP Gmail Read Inbox Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function handleGmailReadSent(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:sent',
      maxResults: args.limit || 10
    });

    const messages = [];
    if (listRes.data.messages) {
      for (const msg of listRes.data.messages) {
        if (!msg.id) continue;
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = details.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

        messages.push({
          id: details.data.id,
          threadId: details.data.threadId,
          from,
          to,
          subject,
          snippet: details.data.snippet,
          body: details.data.snippet || '',
          date
        });
      }
    }

    return { success: true, messages };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to read Gmail sent messages';
    console.error('[MCP Gmail Read Sent Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function handleGmailSearchEmails(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: args.query || '',
      maxResults: args.limit || 10
    });

    const messages = [];
    if (listRes.data.messages) {
      for (const msg of listRes.data.messages) {
        if (!msg.id) continue;
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = details.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';

        messages.push({
          id: details.data.id,
          threadId: details.data.threadId,
          from,
          to,
          subject,
          snippet: details.data.snippet,
          body: details.data.snippet || '',
          date
        });
      }
    }

    return { success: true, messages };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to search Gmail messages';
    console.error('[MCP Gmail Search Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}
