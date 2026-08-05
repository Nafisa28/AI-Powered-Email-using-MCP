import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  handleGmailSendEmail,
  handleGmailSaveDraft,
  handleGmailReadInbox,
  handleGmailReadSent,
  handleGmailSearchEmails
} from './gmail/gmail.tools.js';

import {
  handleOutlookSendEmail,
  handleOutlookSaveDraft,
  handleOutlookReadInbox,
  handleOutlookReadSent,
  handleOutlookSearchEmails
} from './outlook/outlook.tools.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // standard local fallback

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MCP_SERVER_PORT || 5001;

// Define official MCP Server instance
const mcpServer = new Server(
  {
    name: 'mailflow-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// MCP Available Tools definitions
const TOOLS = [
  {
    name: 'send_email',
    description: 'Send an email through connected Gmail or Outlook account',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        accountId: { type: 'string' },
        provider: { type: 'string', enum: ['GMAIL', 'OUTLOOK'] },
        accessTokenEnc: { type: 'string' },
        refreshTokenEnc: { type: 'string' }
      },
      required: ['to', 'subject', 'body', 'provider', 'accessTokenEnc']
    }
  },
  {
    name: 'save_draft',
    description: 'Save a draft to connected Gmail or Outlook account',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' },
        accountId: { type: 'string' },
        provider: { type: 'string', enum: ['GMAIL', 'OUTLOOK'] },
        accessTokenEnc: { type: 'string' },
        refreshTokenEnc: { type: 'string' }
      },
      required: ['provider', 'accessTokenEnc']
    }
  },
  {
    name: 'read_inbox',
    description: 'Read inbox emails from connected account',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        provider: { type: 'string', enum: ['GMAIL', 'OUTLOOK'] },
        accessTokenEnc: { type: 'string' },
        refreshTokenEnc: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['provider', 'accessTokenEnc']
    }
  },
  {
    name: 'read_sent',
    description: 'Read sent emails from connected account',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        provider: { type: 'string', enum: ['GMAIL', 'OUTLOOK'] },
        accessTokenEnc: { type: 'string' },
        refreshTokenEnc: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['provider', 'accessTokenEnc']
    }
  },
  {
    name: 'search_emails',
    description: 'Search emails in connected account by query string',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        provider: { type: 'string', enum: ['GMAIL', 'OUTLOOK'] },
        accessTokenEnc: { type: 'string' },
        refreshTokenEnc: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['provider', 'accessTokenEnc', 'query']
    }
  }
];

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

async function executeTool(name: string, args: any) {
  const provider = (args.provider || 'GMAIL').toUpperCase();

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

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await executeTool(name, args);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result)
      }
    ]
  };
});

// Direct REST HTTP wrapper for Express API client
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'Flymail MCP Server', version: '1.0.0' });
});

app.get('/tools', (req, res) => {
  res.json({ tools: TOOLS });
});

app.post('/tools/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    const result = await executeTool(name, args || {});
    res.json(result);
  } catch (error: any) {
    console.error(`[MCP Tool Call Error - ${req.body?.name}]`, error);
    res.status(500).json({ success: false, error: error.message || 'MCP Tool Execution Failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Flymail MCP Server running on port ${PORT}`);
});
