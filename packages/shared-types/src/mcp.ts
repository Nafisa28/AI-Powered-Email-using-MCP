export interface MCPToolParams {
  send_email: {
    to: string;
    subject: string;
    body: string;
    accountId: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    provider: 'GMAIL' | 'OUTLOOK';
  };
  save_draft: {
    subject: string;
    body: string;
    accountId: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    provider: 'GMAIL' | 'OUTLOOK';
  };
  read_inbox: {
    accountId: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    provider: 'GMAIL' | 'OUTLOOK';
    limit?: number;
  };
  read_sent: {
    accountId: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    provider: 'GMAIL' | 'OUTLOOK';
    limit?: number;
  };
  search_emails: {
    accountId: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    provider: 'GMAIL' | 'OUTLOOK';
    query: string;
    limit?: number;
  };
}

export interface MCPToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
