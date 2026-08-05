import axios from 'axios';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:5001';

export class MCPClient {
  /**
   * Invokes an MCP tool on the dedicated MCP Server
   */
  static async callTool(toolName: string, args: Record<string, any>) {
    try {
      const response = await axios.post(`${MCP_SERVER_URL}/tools/call`, {
        name: toolName,
        arguments: args
      });
      return response.data;
    } catch (error: any) {
      console.error(`[MCP Client Error - ${toolName}]`, error?.response?.data || error.message);
      return {
        success: false,
        error: error?.response?.data?.error || error.message || 'MCP tool execution request failed'
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
  }) {
    return this.callTool('save_draft', params);
  }

  static async readInbox(params: {
    accountId: string;
    provider: 'GMAIL' | 'OUTLOOK';
    accessTokenEnc: string;
    refreshTokenEnc: string;
    limit?: number;
  }) {
    return this.callTool('read_inbox', params);
  }

  static async readSent(params: {
    accountId: string;
    provider: 'GMAIL' | 'OUTLOOK';
    accessTokenEnc: string;
    refreshTokenEnc: string;
    limit?: number;
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
  }) {
    return this.callTool('search_emails', params);
  }
}
