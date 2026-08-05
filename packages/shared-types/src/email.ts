export type DraftStatus = 'DRAFT' | 'SCHEDULED' | 'SENT';
export type ScheduleStatus = 'PENDING' | 'EXECUTED' | 'FAILED';
export type EmailLogStatus = 'SENT' | 'FAILED';

export interface DraftDto {
  id: string;
  userId: string;
  subject: string;
  body: string;
  tone?: string;
  status: DraftStatus;
  updatedAt: string;
  schedule?: ScheduleDto | null;
}

export interface ScheduleDto {
  id: string;
  draftId: string;
  sendAt: string;
  status: ScheduleStatus;
}

export interface EmailLogDto {
  id: string;
  userId: string;
  emailAccountId: string;
  subject: string;
  recipient: string;
  status: EmailLogStatus;
  sentAt: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  accountId: string;
  draftId?: string;
}

export interface MessageDto {
  id: string;
  threadId?: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  snippet?: string;
}
