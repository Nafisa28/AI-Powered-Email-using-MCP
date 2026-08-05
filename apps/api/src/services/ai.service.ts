import Anthropic from '@anthropic-ai/sdk';
import {
  GenerateEmailRequest,
  GeneratedEmailResponse,
  RewriteEmailRequest,
  SummarizeEmailRequest,
  SummarizeEmailResponse
} from '@mailflow/shared-types';

const apiKey = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

const anthropic = apiKey && !apiKey.includes('sample')
  ? new Anthropic({ apiKey })
  : null;

export class AIService {
  /**
   * Generates a structured email draft based on prompt and pill selections
   */
  static async generateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResponse> {
    const tone = req.tone || 'Professional';
    const length = req.length || 'Medium';
    const style = req.style || 'Professional';
    const mood = req.mood || 'Friendly';
    const recipientContext = req.recipientContext ? `Recipient details: ${req.recipientContext}` : '';

    if (!anthropic) {
      console.log('[AI Service Fallback Generator] Prompt:', req.prompt);
      return {
        subject: `Regarding: ${req.prompt.slice(0, 40)}${req.prompt.length > 40 ? '...' : ''}`,
        body: `Dear recipient,\n\n${req.prompt}\n\nPlease let me know your thoughts on this.\n\nBest regards,\nFlymail User`,
        suggestedFollowUp: 'Follow up in 3 business days if no reply.'
      };
    }

    const systemPrompt = `You are Flymail, an elite executive email composition agent.
Your objective is to generate clear, effective, and beautifully structured professional emails.
Strict Rules:
1. Return ONLY valid, minified JSON with keys "subject", "body", and optional "suggestedFollowUp".
2. HTML formatting in "body" is allowed for paragraphs (<p>), lists (<ul>, <li>), and bold tags (<strong>).
3. Do NOT include markdown code fences or conversational preambles in your output.`;

    const userPrompt = `Compose an email based on the following specifications:
- Key Prompt / Core Idea: "${req.prompt}"
- Tone: ${tone}
- Desired Length: ${length}
- Style: ${style}
- Mood / Vibe: ${mood}
${recipientContext}`;

    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[AI Generate Email Error]', error);
      return {
        subject: `Follow-up on ${req.prompt.slice(0, 30)}`,
        body: `Hi there,\n\n${req.prompt}\n\nLooking forward to hearing from you.\n\nBest,`,
        suggestedFollowUp: 'Check back next week.'
      };
    }
  }

  /**
   * Refines or rewrites an existing email based on instruction
   */
  static async rewriteEmail(req: RewriteEmailRequest): Promise<GeneratedEmailResponse> {
    if (!anthropic) {
      return {
        subject: req.subject,
        body: `${req.body}\n\n[Revised based on instruction: "${req.instruction}"]`
      };
    }

    const systemPrompt = `You are an expert email editor. Refine the given email according to the user's instructions. Return JSON with "subject" and "body". No markdown wrap.`;

    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Subject: ${req.subject}\nBody: ${req.body}\nInstruction: ${req.instruction}`
          }
        ]
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[AI Rewrite Error]', error);
      return { subject: req.subject, body: req.body };
    }
  }

  /**
   * Summarizes email threads for quick executive overview
   */
  static async summarizeThread(req: SummarizeEmailRequest): Promise<SummarizeEmailResponse> {
    if (!anthropic) {
      return {
        summary: 'This email thread discusses project updates and upcoming deadlines.',
        keyPoints: [
          'Initial proposal delivered',
          'Awaiting feedback on timeline',
          'Next check-in scheduled for Friday'
        ],
        suggestedAction: 'Send confirmation email with agreed milestones.'
      };
    }

    const threadContent = req.emails
      .map((e: any, idx: number) => `Email #${idx + 1}\nFrom: ${e.from}\nDate: ${e.date}\nSubject: ${e.subject}\nBody: ${e.body}`)
      .join('\n\n---\n\n');

    const systemPrompt = `Analyze the email thread and return ONLY valid JSON with keys: "summary" (string), "keyPoints" (string array), and "suggestedAction" (string).`;

    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: threadContent }]
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const cleanJsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonStr);
    } catch (error) {
      console.error('[AI Summarize Thread Error]', error);
      return {
        summary: 'Summary unavailable due to an error.',
        keyPoints: ['Review email body directly']
      };
    }
  }
}
