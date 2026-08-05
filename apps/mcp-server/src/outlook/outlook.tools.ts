import { Client } from '@microsoft/microsoft-graph-client';
import { decryptToken } from '../crypto.js';

interface OutlookToolArgs {
  accessTokenEnc: string;
  refreshTokenEnc: string;
  to?: string;
  subject?: string;
  body?: string;
  query?: string;
  limit?: number;
}

function getOutlookClient(accessTokenEnc: string) {
  const accessToken = decryptToken(accessTokenEnc);
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

export async function handleOutlookSendEmail(args: OutlookToolArgs) {
  try {
    if (!args.to || !args.subject || !args.body) {
      throw new Error('Missing required email fields: to, subject, body');
    }

    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messageId: `mock-outlook-msg-${Date.now()}`,
        status: 'SENT (MOCK OUTLOOK)'
      };
    }

    const client = getOutlookClient(args.accessTokenEnc);
    const sendMailPayload = {
      message: {
        subject: args.subject,
        body: {
          contentType: 'HTML',
          content: args.body
        },
        toRecipients: [
          {
            emailAddress: {
              address: args.to
            }
          }
        ]
      },
      saveToSentItems: 'true'
    };

    await client.api('/me/sendMail').post(sendMailPayload);

    return {
      success: true,
      messageId: `outlook-${Date.now()}`,
      status: 'SENT'
    };
  } catch (error: any) {
    console.error('[Outlook Send Email Error]', error);
    return { success: false, error: error.message || 'Failed to send email via Outlook' };
  }
}

export async function handleOutlookSaveDraft(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        draftId: `mock-outlook-draft-${Date.now()}`,
        status: 'DRAFT_SAVED (MOCK OUTLOOK)'
      };
    }

    const client = getOutlookClient(args.accessTokenEnc);
    const draftPayload = {
      subject: args.subject || '',
      body: {
        contentType: 'HTML',
        content: args.body || ''
      },
      toRecipients: args.to ? [{ emailAddress: { address: args.to } }] : []
    };

    const res = await client.api('/me/messages').post(draftPayload);

    return {
      success: true,
      draftId: res.id,
      status: 'SAVED'
    };
  } catch (error: any) {
    console.error('[Outlook Save Draft Error]', error);
    return { success: false, error: error.message || 'Failed to save draft via Outlook' };
  }
}

export async function handleOutlookReadInbox(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [
          {
            id: 'mock-outlook-inbox-1',
            from: 'exec@outlook-corp.com',
            to: 'me@outlook.com',
            subject: 'Outlook Integration Test Successful',
            body: 'Microsoft Graph API tool execution confirmed.',
            date: new Date().toISOString()
          }
        ]
      };
    }

    const client = getOutlookClient(args.accessTokenEnc);
    const res = await client.api('/me/mailFolders/inbox/messages')
      .top(args.limit || 10)
      .select('id,subject,bodyPreview,from,toRecipients,receivedDateTime')
      .get();

    const messages = (res.value || []).map((msg: any) => ({
      id: msg.id,
      from: msg.from?.emailAddress?.address || '',
      to: msg.toRecipients?.[0]?.emailAddress?.address || '',
      subject: msg.subject || '',
      snippet: msg.bodyPreview || '',
      body: msg.bodyPreview || '',
      date: msg.receivedDateTime
    }));

    return { success: true, messages };
  } catch (error: any) {
    console.error('[Outlook Read Inbox Error]', error);
    return { success: false, error: error.message || 'Failed to read Outlook inbox' };
  }
}

export async function handleOutlookReadSent(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [
          {
            id: 'mock-outlook-sent-1',
            from: 'me@outlook.com',
            to: 'client@domain.org',
            subject: 'Re: Project Kickoff Meeting',
            body: 'Looking forward to our session tomorrow.',
            date: new Date().toISOString()
          }
        ]
      };
    }

    const client = getOutlookClient(args.accessTokenEnc);
    const res = await client.api('/me/mailFolders/sentitems/messages')
      .top(args.limit || 10)
      .select('id,subject,bodyPreview,from,toRecipients,sentDateTime')
      .get();

    const messages = (res.value || []).map((msg: any) => ({
      id: msg.id,
      from: msg.from?.emailAddress?.address || '',
      to: msg.toRecipients?.[0]?.emailAddress?.address || '',
      subject: msg.subject || '',
      snippet: msg.bodyPreview || '',
      body: msg.bodyPreview || '',
      date: msg.sentDateTime
    }));

    return { success: true, messages };
  } catch (error: any) {
    console.error('[Outlook Read Sent Error]', error);
    return { success: false, error: error.message || 'Failed to read Outlook sent messages' };
  }
}

export async function handleOutlookSearchEmails(args: OutlookToolArgs) {
  try {
    const accessToken = decryptToken(args.accessTokenEnc);
    if (!accessToken || accessToken.startsWith('mock_')) {
      return {
        success: true,
        messages: [
          {
            id: 'mock-outlook-search-1',
            from: 'team@outlook.com',
            to: 'me@outlook.com',
            subject: `Outlook Search: ${args.query}`,
            body: `Found items matching query: ${args.query}`,
            date: new Date().toISOString()
          }
        ]
      };
    }

    const client = getOutlookClient(args.accessTokenEnc);
    const res = await client.api('/me/messages')
      .search(`"${args.query}"`)
      .top(args.limit || 10)
      .select('id,subject,bodyPreview,from,toRecipients,receivedDateTime')
      .get();

    const messages = (res.value || []).map((msg: any) => ({
      id: msg.id,
      from: msg.from?.emailAddress?.address || '',
      to: msg.toRecipients?.[0]?.emailAddress?.address || '',
      subject: msg.subject || '',
      snippet: msg.bodyPreview || '',
      body: msg.bodyPreview || '',
      date: msg.receivedDateTime
    }));

    return { success: true, messages };
  } catch (error: any) {
    console.error('[Outlook Search Error]', error);
    return { success: false, error: error.message || 'Failed to search Outlook messages' };
  }
}
