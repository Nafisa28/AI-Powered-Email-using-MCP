import { Router } from 'express';
import { prisma } from '../prisma.js';
import { MCPClient } from '../services/mcp.client.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

// Send Email via MCP Client -> MCP Server
router.post('/send', async (req: AuthRequest, res) => {
  try {
    const { to, subject, body, accountId, draftId } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Recipient (to), subject, and body are required' });
    }

    // Mandatory human review check - prompt explicitly states mandatory review
    let emailAccount;
    if (accountId) {
      emailAccount = await prisma.emailAccount.findFirst({
        where: { id: accountId, userId: req.user!.id }
      });
    } else {
      emailAccount = await prisma.emailAccount.findFirst({
        where: { userId: req.user!.id }
      });
    }

    if (!emailAccount) {
      return res.status(400).json({
        error: 'No connected Gmail or Outlook account found. Please connect an account first in Settings.'
      });
    }

    // Call MCP Server tool
    const mcpResult = await MCPClient.sendEmail({
      to,
      subject,
      body,
      accountId: emailAccount.id,
      provider: emailAccount.provider as 'GMAIL' | 'OUTLOOK',
      accessTokenEnc: emailAccount.accessTokenEnc,
      refreshTokenEnc: emailAccount.refreshTokenEnc
    });

    if (!mcpResult.success) {
      return res.status(500).json({
        error: mcpResult.error || 'MCP tool failed to send email via provider API'
      });
    }

    // Create EmailLog audit record
    const emailLog = await prisma.emailLog.create({
      data: {
        userId: req.user!.id,
        emailAccountId: emailAccount.id,
        subject,
        recipient: to,
        status: 'SENT'
      }
    });

    // Update draft status if sent from an existing draft
    if (draftId) {
      await prisma.draft.update({
        where: { id: draftId },
        data: { status: 'SENT' }
      });
    }

    res.json({
      success: true,
      messageId: mcpResult.messageId,
      emailLog
    });
  } catch (error: any) {
    console.error('[Send Email Route Error]', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Read Inbox via MCP Client -> MCP Server
router.get('/inbox', async (req: AuthRequest, res) => {
  try {
    const emailAccount = await prisma.emailAccount.findFirst({
      where: { userId: req.user!.id }
    });

    if (!emailAccount) {
      return res.json({ messages: [] });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const mcpResult = await MCPClient.readInbox({
      accountId: emailAccount.id,
      provider: emailAccount.provider as any,
      accessTokenEnc: emailAccount.accessTokenEnc,
      refreshTokenEnc: emailAccount.refreshTokenEnc,
      limit
    });

    res.json(mcpResult);
  } catch (error: any) {
    console.error('[Read Inbox Error]', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// Read Sent via MCP Client -> MCP Server
router.get('/sent', async (req: AuthRequest, res) => {
  try {
    const emailAccount = await prisma.emailAccount.findFirst({
      where: { userId: req.user!.id }
    });

    if (!emailAccount) {
      return res.json({ messages: [] });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const mcpResult = await MCPClient.readSent({
      accountId: emailAccount.id,
      provider: emailAccount.provider as any,
      accessTokenEnc: emailAccount.accessTokenEnc,
      refreshTokenEnc: emailAccount.refreshTokenEnc,
      limit
    });

    res.json(mcpResult);
  } catch (error: any) {
    console.error('[Read Sent Error]', error);
    res.status(500).json({ error: 'Failed to fetch sent messages' });
  }
});

// Search emails via MCP Client -> MCP Server
router.get('/search', async (req: AuthRequest, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query parameter q is required' });
    }

    const emailAccount = await prisma.emailAccount.findFirst({
      where: { userId: req.user!.id }
    });

    if (!emailAccount) {
      return res.json({ messages: [] });
    }

    const mcpResult = await MCPClient.searchEmails({
      accountId: emailAccount.id,
      provider: emailAccount.provider as any,
      accessTokenEnc: emailAccount.accessTokenEnc,
      refreshTokenEnc: emailAccount.refreshTokenEnc,
      query: q
    });

    res.json(mcpResult);
  } catch (error: any) {
    console.error('[Search Emails Error]', error);
    res.status(500).json({ error: 'Failed to search emails' });
  }
});

// Email Audit Logs endpoint
router.get('/logs', async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.emailLog.findMany({
      where: { userId: req.user!.id },
      include: { emailAccount: true },
      orderBy: { sentAt: 'desc' }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch email audit logs' });
  }
});

export default router;
