import cron from 'node-cron';
import { prisma } from '../prisma.js';
import { MCPClient } from './mcp.client.js';

export function startScheduler() {
  console.log('⏱️  MailFlow Email Scheduler initialized (running every minute)');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find pending schedules whose target sendAt timestamp has arrived
      const dueSchedules = await prisma.schedule.findMany({
        where: {
          status: 'PENDING',
          sendAt: {
            lte: now
          }
        },
        include: {
          draft: {
            include: {
              user: {
                include: {
                  emailAccounts: true
                }
              }
            }
          }
        }
      });

      if (dueSchedules.length === 0) return;

      console.log(`[Scheduler] Found ${dueSchedules.length} email(s) due for scheduled sending.`);

      for (const sched of dueSchedules) {
        const draft = sched.draft;
        if (!draft || draft.status === 'SENT') {
          await prisma.schedule.update({
            where: { id: sched.id },
            data: { status: 'EXECUTED' }
          });
          continue;
        }

        const emailAccount = draft.user.emailAccounts[0]; // pick first connected email account
        if (!emailAccount) {
          console.error(`[Scheduler Error] User ${draft.userId} has no connected email account.`);
          await prisma.schedule.update({
            where: { id: sched.id },
            data: { status: 'FAILED' }
          });
          continue;
        }

        // Call MCP Server via MCP Client with credentials
        const mcpResult = await MCPClient.sendEmail({
          to: draft.subject.includes('to:') ? draft.subject.split('to:')[1].trim() : 'scheduled-recipient@example.com',
          subject: draft.subject,
          body: draft.body,
          accountId: emailAccount.id,
          provider: emailAccount.provider as any,
          accessTokenEnc: emailAccount.accessTokenEnc,
          refreshTokenEnc: emailAccount.refreshTokenEnc,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        });

        if (mcpResult.success) {
          await prisma.draft.update({
            where: { id: draft.id },
            data: { status: 'SENT' }
          });

          await prisma.schedule.update({
            where: { id: sched.id },
            data: { status: 'EXECUTED' }
          });

          await prisma.emailLog.create({
            data: {
              userId: draft.userId,
              emailAccountId: emailAccount.id,
              subject: draft.subject,
              recipient: 'scheduled-recipient@example.com',
              status: 'SENT'
            }
          });

          console.log(`[Scheduler Success] Scheduled draft ${draft.id} sent successfully.`);
        } else {
          console.error(`[Scheduler Failed] Draft ${draft.id} failed:`, mcpResult.error);
          await prisma.schedule.update({
            where: { id: sched.id },
            data: { status: 'FAILED' }
          });
        }
      }
    } catch (err) {
      console.error('[Scheduler Runner Exception]', err);
    }
  });
}
