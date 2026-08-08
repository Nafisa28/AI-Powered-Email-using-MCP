import { google } from 'googleapis';
import crypto from 'node:crypto';

// ─── Crypto helpers (same as mcp-server/src/crypto.ts) ───────────────────────

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 'mailflow-ai-default-32-byte-secret-key-12345!';
  return crypto.createHash('sha256').update(secret).digest();
}

function decryptToken(encryptedText: string): string {
  if (!encryptedText) return '';
  if (!encryptedText.includes(':')) {
    throw new Error('Malformed token format (missing encryption markers)');
  }
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed token format (invalid encryption parts length)');
  }
  const [ivHex, authTagHex, encryptedDataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─── Gmail helpers ───────────────────────────────────────────────────────────

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
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
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

// ─── Outlook helpers ─────────────────────────────────────────────────────────

// Dynamic import for the optional Outlook dependency
let graphClientModule: any = null;

async function getGraphClientModule() {
  if (!graphClientModule) {
    try {
      graphClientModule = await import('@microsoft/microsoft-graph-client');
    } catch {
      throw new Error('Microsoft Graph client is not installed. Please install @microsoft/microsoft-graph-client.');
    }
  }
  return graphClientModule;
}

function getOutlookClient(accessTokenEnc: string) {
  const accessToken = decryptToken(accessTokenEnc);
  // We need the Client class – lazy-loaded so the import doesn't blow up if the
  // package isn't installed (Outlook support is optional).
  const { Client } = graphClientModule;
  return Client.init({
    authProvider: (done: any) => {
      done(null, accessToken);
    }
  });
}

// ─── Tool execution (formerly in mcp-server) ────────────────────────────────

async function executeTool(name: string, args: any) {
  const provider = (args.provider || 'GMAIL').toUpperCase();

  // Pre-load graph client module if needed
  if (provider === 'OUTLOOK') {
    await getGraphClientModule();
  }

  switch (name) {
    case 'send_email':
      return provider === 'OUTLOOK'
        ? await handleOutlookSendEmail(args)
        : await handleGmailSendEmail(args);
    case 'save_draft':
      return provider === 'OUTLOOK'
        ? await handleOutlookSaveDraft(args)
        : await handleGmailSaveDraft(args);
    case 'read_inbox':
      return provider === 'OUTLOOK'
        ? await handleOutlookReadInbox(args)
        : await handleGmailReadInbox(args);
    case 'read_sent':
      return provider === 'OUTLOOK'
        ? await handleOutlookReadSent(args)
        : await handleGmailReadSent(args);
    case 'search_emails':
      return provider === 'OUTLOOK'
        ? await handleOutlookSearchEmails(args)
        : await handleGmailSearchEmails(args);
    default:
      throw new Error(`Unknown MCP Tool: ${name}`);
  }
}

// ─── Gmail tool handlers ─────────────────────────────────────────────────────

async function handleGmailSendEmail(args: GmailToolArgs) {
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
    const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    console.log(`[MCP Gmail] Email sent successfully. Gmail messageId: ${res.data.id}`);
    return { success: true, messageId: res.data.id, status: 'SENT' };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to send email via Gmail';
    console.error('[MCP Gmail Send Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

async function handleGmailSaveDraft(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }
    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const raw = createMimeMessage(args.to || '', args.subject || '', args.body || '');
    const res = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } });
    return { success: true, draftId: res.data.id, status: 'SAVED' };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to save draft via Gmail';
    console.error('[MCP Gmail Save Draft Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

async function handleGmailReadInbox(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }
    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const listRes = await gmail.users.messages.list({ userId: 'me', q: 'in:inbox', maxResults: args.limit || 10 });
    const messages = [];
    if (listRes.data.messages) {
      for (const msg of listRes.data.messages) {
        if (!msg.id) continue;
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const headers = details.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
        messages.push({ id: details.data.id, threadId: details.data.threadId, from, to, subject, snippet: details.data.snippet, body: details.data.snippet || '', date });
      }
    }
    return { success: true, messages };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to read Gmail inbox';
    console.error('[MCP Gmail Read Inbox Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

async function handleGmailReadSent(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }
    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const listRes = await gmail.users.messages.list({ userId: 'me', q: 'in:sent', maxResults: args.limit || 10 });
    const messages = [];
    if (listRes.data.messages) {
      for (const msg of listRes.data.messages) {
        if (!msg.id) continue;
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const headers = details.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
        messages.push({ id: details.data.id, threadId: details.data.threadId, from, to, subject, snippet: details.data.snippet, body: details.data.snippet || '', date });
      }
    }
    return { success: true, messages };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to read Gmail sent messages';
    console.error('[MCP Gmail Read Sent Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

async function handleGmailSearchEmails(args: GmailToolArgs) {
  try {
    if (!args.accessTokenEnc) {
      return { success: false, error: 'No access token provided. Please connect your Gmail account via OAuth.' };
    }
    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc, args.clientId, args.clientSecret);
    const listRes = await gmail.users.messages.list({ userId: 'me', q: args.query || '', maxResults: args.limit || 10 });
    const messages = [];
    if (listRes.data.messages) {
      for (const msg of listRes.data.messages) {
        if (!msg.id) continue;
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const headers = details.data.payload?.headers || [];
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || '';
        messages.push({ id: details.data.id, threadId: details.data.threadId, from, to, subject, snippet: details.data.snippet, body: details.data.snippet || '', date });
      }
    }
    return { success: true, messages };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error.message || 'Failed to search Gmail messages';
    console.error('[MCP Gmail Search Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ─── Outlook tool handlers ───────────────────────────────────────────────────

interface OutlookToolArgs {
  accessTokenEnc: string;
  refreshTokenEnc: string;
  to?: string;
  subject?: string;
  body?: string;
  query?: string;
  limit?: number;
}

async function handleOutlookSendEmail(args: OutlookToolArgs) {
  try {
    if (!args.to || !args.subject || !args.body) {
      throw new Error('Missing required email fields: to, subject, body');
    }
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return { success: true, messageId: `mock-outlook-msg-${Date.now()}`, status: 'SENT (MOCK OUTLOOK)' };
    }
    const client = getOutlookClient(args.accessTokenEnc);
    await client.api('/me/sendMail').post({
      message: {
        subject: args.subject,
        body: { contentType: 'HTML', content: args.body },
        toRecipients: [{ emailAddress: { address: args.to } }]
      },
      saveToSentItems: 'true'
    });
    return { success: true, messageId: `outlook-${Date.now()}`, status: 'SENT' };
  } catch (error: any) {
    console.error('[Outlook Send Email Error]', error);
    return { success: false, error: error.message || 'Failed to send email via Outlook' };
  }
}

async function handleOutlookSaveDraft(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return { success: true, draftId: `mock-outlook-draft-${Date.now()}`, status: 'DRAFT_SAVED (MOCK OUTLOOK)' };
    }
    const client = getOutlookClient(args.accessTokenEnc);
    const res = await client.api('/me/messages').post({
      subject: args.subject || '',
      body: { contentType: 'HTML', content: args.body || '' },
      toRecipients: args.to ? [{ emailAddress: { address: args.to } }] : []
    });
    return { success: true, draftId: res.id, status: 'SAVED' };
  } catch (error: any) {
    console.error('[Outlook Save Draft Error]', error);
    return { success: false, error: error.message || 'Failed to save draft via Outlook' };
  }
}

async function handleOutlookReadInbox(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [{ id: 'mock-outlook-inbox-1', from: 'exec@outlook-corp.com', to: 'me@outlook.com', subject: 'Outlook Integration Test Successful', body: 'Microsoft Graph API tool execution confirmed.', date: new Date().toISOString() }]
      };
    }
    const client = getOutlookClient(args.accessTokenEnc);
    const res = await client.api('/me/mailFolders/inbox/messages').top(args.limit || 10).select('id,subject,bodyPreview,from,toRecipients,receivedDateTime').get();
    const messages = (res.value || []).map((msg: any) => ({
      id: msg.id, from: msg.from?.emailAddress?.address || '', to: msg.toRecipients?.[0]?.emailAddress?.address || '', subject: msg.subject || '', snippet: msg.bodyPreview || '', body: msg.bodyPreview || '', date: msg.receivedDateTime
    }));
    return { success: true, messages };
  } catch (error: any) {
    console.error('[Outlook Read Inbox Error]', error);
    return { success: false, error: error.message || 'Failed to read Outlook inbox' };
  }
}

async function handleOutlookReadSent(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [{ id: 'mock-outlook-sent-1', from: 'me@outlook.com', to: 'client@domain.org', subject: 'Re: Project Kickoff Meeting', body: 'Looking forward to our session tomorrow.', date: new Date().toISOString() }]
      };
    }
    const client = getOutlookClient(args.accessTokenEnc);
    const res = await client.api('/me/mailFolders/sentitems/messages').top(args.limit || 10).select('id,subject,bodyPreview,from,toRecipients,sentDateTime').get();
    const messages = (res.value || []).map((msg: any) => ({
      id: msg.id, from: msg.from?.emailAddress?.address || '', to: msg.toRecipients?.[0]?.emailAddress?.address || '', subject: msg.subject || '', snippet: msg.bodyPreview || '', body: msg.bodyPreview || '', date: msg.sentDateTime
    }));
    return { success: true, messages };
  } catch (error: any) {
    console.error('[Outlook Read Sent Error]', error);
    return { success: false, error: error.message || 'Failed to read Outlook sent messages' };
  }
}

async function handleOutlookSearchEmails(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [{ id: 'mock-outlook-search-1', from: 'team@outlook.com', to: 'me@outlook.com', subject: `Outlook Search: ${args.query}`, body: `Found items matching query: ${args.query}`, date: new Date().toISOString() }]
      };
    }
    const client = getOutlookClient(args.accessTokenEnc);
    const res = await client.api('/me/messages').search(`"${args.query}"`).top(args.limit || 10).select('id,subject,bodyPreview,from,toRecipients,receivedDateTime').get();
    const messages = (res.value || []).map((msg: any) => ({
      id: msg.id, from: msg.from?.emailAddress?.address || '', to: msg.toRecipients?.[0]?.emailAddress?.address || '', subject: msg.subject || '', snippet: msg.bodyPreview || '', body: msg.bodyPreview || '', date: msg.receivedDateTime
    }));
    return { success: true, messages };
  } catch (error: any) {
    console.error('[Outlook Search Error]', error);
    return { success: false, error: error.message || 'Failed to search Outlook messages' };
  }
}

// ─── Public MCPClient class (same interface as before, now in-process) ───────

export class MCPClient {
  static async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    try {
      return await executeTool(toolName, args);
    } catch (error: any) {
      console.error(`[MCP Client Error - ${toolName}]`, error.message);
      return {
        success: false,
        error: error.message || 'MCP tool execution failed'
      };
    }
  }

  static async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    accountId: string;
    provider: 'GMAIL' | 'OUTLOOK';
    accessTokenEnc: string;
    refreshTokenEnc: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    return this.callTool('send_email', params);
  }

  static async saveDraft(params: {
    subject: string;
    body: string;
    accountId: string;
    provider: 'GMAIL' | 'OUTLOOK';
    accessTokenEnc: string;
    refreshTokenEnc: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    return this.callTool('save_draft', params);
  }

  static async readInbox(params: {
    accountId: string;
    provider: 'GMAIL' | 'OUTLOOK';
    accessTokenEnc: string;
    refreshTokenEnc: string;
    limit?: number;
    clientId?: string;
    clientSecret?: string;
  }) {
    return this.callTool('read_inbox', params);
  }

  static async readSent(params: {
    accountId: string;
    provider: 'GMAIL' | 'OUTLOOK';
    accessTokenEnc: string;
    refreshTokenEnc: string;
    limit?: number;
    clientId?: string;
    clientSecret?: string;
  }) {
    return this.callTool('read_sent', params);
  }

  static async searchEmails(params: {
    accountId: string;
    provider: 'GMAIL' | 'OUTLOOK';
    accessTokenEnc: string;
    refreshTokenEnc: string;
    query: string;
    limit?: number;
    clientId?: string;
    clientSecret?: string;
  }) {
    return this.callTool('search_emails', params);
  }
}
