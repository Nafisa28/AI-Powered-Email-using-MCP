import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

// List scheduled items
router.get('/', async (req: AuthRequest, res) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        draft: {
          userId: req.user!.id
        }
      },
      include: { draft: true },
      orderBy: { sendAt: 'asc' }
    });
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Schedule draft for sending at target ISO date
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { draftId, sendAt } = req.body;
    if (!draftId || !sendAt) {
      return res.status(400).json({ error: 'draftId and sendAt ISO string are required' });
    }

    const draft = await prisma.draft.findFirst({
      where: { id: draftId, userId: req.user!.id }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const parsedSendAt = new Date(sendAt);
    const now = new Date();

    console.log('[Schedule Debug] Received sendAt raw:', sendAt);
    console.log('[Schedule Debug] Parsed sendAt:', parsedSendAt.toISOString());
    console.log('[Schedule Debug] Server now:', now.toISOString());
    console.log('[Schedule Debug] Is in future?', parsedSendAt.getTime() > now.getTime());

    // Reject if the scheduled time is in the past
    if (parsedSendAt.getTime() <= now.getTime()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future.' });
    }

    const schedule = await prisma.schedule.upsert({
      where: { draftId },
      update: {
        sendAt: parsedSendAt,
        status: 'PENDING'
      },
      create: {
        draftId,
        sendAt: parsedSendAt,
        status: 'PENDING'
      }
    });

    await prisma.draft.update({
      where: { id: draftId },
      data: { status: 'SCHEDULED' }
    });

    console.log('[Schedule Debug] Schedule created with id:', schedule.id, 'sendAt:', schedule.sendAt);

    res.status(201).json(schedule);
  } catch (error: any) {
    console.error('[Create Schedule Error]', error);
    res.status(500).json({ error: 'Failed to schedule draft' });
  }
});

// Cancel schedule
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.id },
      include: { draft: true }
    });

    if (schedule) {
      await prisma.draft.update({
        where: { id: schedule.draftId },
        data: { status: 'DRAFT' }
      });
      await prisma.schedule.delete({ where: { id: req.params.id } });
    }

    res.json({ success: true, message: 'Schedule cancelled' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to cancel schedule' });
  }
});

export default router;
