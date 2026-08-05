import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

// Get all drafts for current user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const drafts = await prisma.draft.findMany({
      where: { userId: req.user!.id },
      include: { schedule: true },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(drafts);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// Create or auto-save draft
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { id, subject, body, tone, status } = req.body;

    if (id) {
      const updated = await prisma.draft.update({
        where: { id },
        data: {
          subject: subject || '',
          body: body || '',
          tone,
          status: status || 'DRAFT'
        },
        include: { schedule: true }
      });
      return res.json(updated);
    }

    const created = await prisma.draft.create({
      data: {
        userId: req.user!.id,
        subject: subject || '(No Subject)',
        body: body || '',
        tone,
        status: status || 'DRAFT'
      },
      include: { schedule: true }
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('[Save Draft Error]', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// Get single draft
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const draft = await prisma.draft.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { schedule: true }
    });

    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    res.json(draft);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// Delete draft
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.draft.deleteMany({
      where: { id: req.params.id, userId: req.user!.id }
    });
    res.json({ success: true, message: 'Draft deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

export default router;
