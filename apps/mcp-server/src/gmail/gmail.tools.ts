import { google } from 'googleapis';
import { decryptToken } from '../crypto.js';

interface GmailToolArgs {
  accessTokenEnc: string;
  refreshTokenEnc: string;
  to?: string;
  subject?: string;
  body?: string;
  query?: string;
  limit?: number;
}

function getGmailClient(accessTokenEnc: string, refreshTokenEnc: string) {
  const accessToken = decryptToken(accessTokenEnc);
  const refreshToken = decryptToken(refreshTokenEnc);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

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
      throw new Error('Missing required email fields: to, subject, body');
    }

    // If running in development/demo without actual OAuth tokens
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      console.log(`[MCP Gmail Mock Send] To: ${args.to}, Subject: ${args.subject}`);
      return {
        success: true,
        messageId: `mock-msg-${Date.now()}`,
        status: 'SENT (MOCK)'
      };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc);
    const raw = createMimeMessage(args.to, args.subject, args.body);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    return {
      success: true,
      messageId: res.data.id,
      status: 'SENT'
    };
  } catch (error: any) {
    console.error('[Gmail Send Email Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to send email via Gmail'
    };
  }
}

export async function handleGmailSaveDraft(args: GmailToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        draftId: `mock-draft-${Date.now()}`,
        status: 'DRAFT_SAVED (MOCK)'
      };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc);
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
    console.error('[Gmail Save Draft Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to save draft via Gmail'
    };
  }
}

export async function handleGmailReadInbox(args: GmailToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [
          {
            id: 'mock-inbox-1',
            from: 'alex@example.com',
            to: 'me@domain.com',
            subject: 'Q3 Product Strategy Review',
            body: 'Hi team, please find attached our Q3 strategy document for review.',
            date: new Date().toISOString(),
            snippet: 'Hi team, please find attached our Q3 strategy...'
          },
          {
            id: 'mock-inbox-2',
            from: 'sarah.engineering@company.org',
            to: 'me@domain.com',
            subject: 'API MCP Server Deployment Update',
            body: 'Hey, the new MCP server deployment was successful. All integration checks passed.',
            date: new Date(Date.now() - 3600000).toISOString(),
            snippet: 'Hey, the new MCP server deployment was successful...'
          }
        ]
      };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc);
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
    console.error('[Gmail Read Inbox Error]', error);
    return { success: false, error: error.message || 'Failed to read Gmail inbox' };
  }
}

export async function handleGmailReadSent(args: GmailToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [
          {
            id: 'mock-sent-1',
            from: 'me@domain.com',
            to: 'client@acme.corp',
            subject: 'Re: MailFlow AI Implementation Proposal',
            body: 'Thanks for reaching out! We are on schedule to deliver the AI email platform by EOD.',
            date: new Date().toISOString()
          }
        ]
      };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc);
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
    console.error('[Gmail Read Sent Error]', error);
    return { success: false, error: error.message || 'Failed to read Gmail sent messages' };
  }
}

export async function handleGmailSearchEmails(args: GmailToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [
          {
            id: 'mock-search-1',
            from: 'support@service.io',
            to: 'me@domain.com',
            subject: `SearchResult for: ${args.query}`,
            body: `Matching email content containing '${args.query}'.`,
            date: new Date().toISOString()
          }
        ]
      };
    }

    const gmail = getGmailClient(args.accessTokenEnc, args.refreshTokenEnc);
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
    console.error('[Gmail Search Error]', error);
    return { success: false, error: error.message || 'Failed to search Gmail messages' };
  }
}
