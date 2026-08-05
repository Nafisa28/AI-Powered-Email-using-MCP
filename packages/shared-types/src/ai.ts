export interface GenerateEmailRequest {
  prompt: string;
  tone?: string;
  length?: 'Short' | 'Medium' | 'Detailed';
  style?: 'Professional' | 'Casual' | 'Persuasive' | 'Direct' | 'Warm';
  mood?: 'Confident' | 'Friendly' | 'Urgent' | 'Formal';
  recipientContext?: string;
}

export interface GeneratedEmailResponse {
  subject: string;
  body: string;
  suggestedFollowUp?: string;
}

export interface RewriteEmailRequest {
  subject: string;
  body: string;
  instruction: string;
}

export interface SummarizeEmailRequest {
  emails: Array<{
    from: string;
    subject: string;
    body: string;
    date: string;
  }>;
}

export interface SummarizeEmailResponse {
  summary: string;
  keyPoints: string[];
  suggestedAction?: string;
}
