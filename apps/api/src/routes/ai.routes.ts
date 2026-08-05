import { Router } from 'express';
import { AIService } from '../services/ai.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/generate', async (req, res) => {
  try {
    const { prompt, tone, length, style, mood, recipientContext } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await AIService.generateEmail({
      prompt,
      tone,
      length,
      style,
      mood,
      recipientContext
    });

    res.json(result);
  } catch (error: any) {
    console.error('[AI Generate Route Error]', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

router.post('/rewrite', async (req, res) => {
  try {
    const { subject, body, instruction } = req.body;
    if (!subject || !body || !instruction) {
      return res.status(400).json({ error: 'Subject, body, and instruction are required' });
    }

    const result = await AIService.rewriteEmail({ subject, body, instruction });
    res.json(result);
  } catch (error: any) {
    console.error('[AI Rewrite Route Error]', error);
    res.status(500).json({ error: 'Failed to rewrite email' });
  }
});

router.post('/summarize', async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    const result = await AIService.summarizeThread({ emails });
    res.json(result);
  } catch (error: any) {
    console.error('[AI Summarize Route Error]', error);
    res.status(500).json({ error: 'Failed to summarize thread' });
  }
});

export default router;
