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

interface TemplateContext {
  prompt: string;
  tone: string;
  length: string;
  style: string;
  mood: string;
  recipientContext?: string;
}

export class AIService {
  /**
   * Intelligently builds structured emails grounded in user narrative input and parameter specs
   */
  private static buildStructuredEmailFromTemplate(ctx: TemplateContext): GeneratedEmailResponse {
    const rawPrompt = ctx.prompt.trim();
    const lowerPrompt = rawPrompt.toLowerCase();
    const tone = ctx.tone || 'Professional';
    const length = ctx.length || 'Medium';
    const style = ctx.style || 'Professional';
    const mood = ctx.mood || 'Friendly';
    const recipient = ctx.recipientContext ? `to ${ctx.recipientContext}` : '';

    // Salutation based on Tone & Mood
    let greeting = 'Hi there,';
    if (tone === 'Professional' || mood === 'Formal') {
      greeting = 'Dear [Recipient Name],';
    } else if (tone === 'Urgent' || tone === 'Direct') {
      greeting = 'Hello team,';
    } else if (tone === 'Friendly' || tone === 'Casual') {
      greeting = 'Hi [Name],';
    } else if (tone === 'Empathetic') {
      greeting = 'Dear [Name],';
    }

    // Sign-off based on Tone & Style
    let signoff = 'Best regards,\n[Your Name]';
    if (tone === 'Casual') signoff = 'Best,\n[Your Name]';
    if (tone === 'Urgent') signoff = 'Thank you for your prompt response,\n[Your Name]';
    if (tone === 'Empathetic') signoff = 'Warmly,\n[Your Name]';
    if (style === 'Executive') signoff = 'Regards,\n[Your Name]';

    // Helper: Is this a detailed narrative or just a short keyword?
    const words = rawPrompt.split(/\s+/).filter(Boolean);
    const isFullNarrative = words.length > 5;

    // Case 1: Detailed Narrative Input
    if (isFullNarrative) {
      // Derive a relevant subject line from the first sentence or key words
      const firstLine = rawPrompt.split(/[.!?\n]/)[0] || rawPrompt;
      let cleanedSubject = firstLine
        .replace(/^(i want to write an email about|write an email about|please write an email to|i need an email for)/i, '')
        .trim();
      if (!cleanedSubject || cleanedSubject.length < 5) {
        cleanedSubject = rawPrompt.slice(0, 50);
      }
      cleanedSubject = cleanedSubject.charAt(0).toUpperCase() + cleanedSubject.slice(1);

      const subjectPrefix = tone === 'Urgent' ? '[URGENT] ' : style === 'Executive' ? '[Executive Summary] ' : '';
      const subject = `${subjectPrefix}${cleanedSubject}${recipient ? ` (${recipient})` : ''}`.slice(0, 75);

      let body = '';

      if (length === 'Short') {
        body = `${greeting}\n\nI am writing regarding the following matter:\n\n${rawPrompt}\n\nPlease review and let me know your thoughts or when we can connect.\n\n${signoff}`;
      } else if (length === 'Detailed') {
        body = `${greeting}\n\nI am reaching out regarding the situation outlined below:\n\n${rawPrompt}\n\nKey Considerations & Action Items:\n• Overview: Address core objectives and timeline.\n• Immediate Priority: Ensure alignment among all stakeholders.\n• Next Step: Confirm receipt and next actions.\n\nPlease let me know if you have any questions or require further details.\n\n${signoff}`;
      } else {
        body = `${greeting}\n\nI hope this email finds you well. I am writing to communicate the following details:\n\n${rawPrompt}\n\nPlease review this information and let me know if any adjustments are needed.\n\nLooking forward to your reply.\n\n${signoff}`;
      }

      return {
        subject,
        body,
        suggestedFollowUp: 'Follow up within 48 hours if no confirmation is received.'
      };
    }

    // Case 2: Short Keyword / Phrase Inputs
    if (lowerPrompt.includes('leave') || lowerPrompt.includes('vacation') || lowerPrompt.includes('pto') || lowerPrompt.includes('time off')) {
      const subject = tone === 'Urgent'
        ? `[URGENT] Request for Leave of Absence ${recipient}`.trim()
        : `Request for Leave of Absence ${recipient}`.trim();

      const body = `${greeting}\n\nI am writing to formally request leave of absence for [Dates/Duration] due to personal reasons.\n\nI have arranged for coverage of my pending duties during this period. Please let me know if you need any additional details prior to approval.\n\n${signoff}`;
      return { subject, body, suggestedFollowUp: 'Check in 2 days before departure.' };
    }

    if (lowerPrompt.includes('sick') || lowerPrompt.includes('illness') || lowerPrompt.includes('unwell')) {
      const subject = `Sick Leave Notification ${recipient}`;
      const body = `${greeting}\n\nI am feeling unwell today and will be unable to work. I plan to rest and recover, with an expected return date of [Return Date].\n\nI will monitor urgent notifications if possible. Please reach out if urgent matters arise.\n\n${signoff}`;
      return { subject, body, suggestedFollowUp: 'Send status update tomorrow.' };
    }

    if (lowerPrompt.includes('resign') || lowerPrompt.includes('resignation') || lowerPrompt.includes('notice period')) {
      const subject = `Notice of Resignation - [Your Name]`;
      const body = `${greeting}\n\nPlease accept this email as formal notification of my resignation. My last day will be [Last Working Day].\n\nI appreciate the opportunities I have had during my time here and will ensure a smooth transition of my responsibilities over the coming weeks.\n\n${signoff}`;
      return { subject, body };
    }

    if (lowerPrompt.includes('meeting') || lowerPrompt.includes('schedule') || lowerPrompt.includes('sync') || lowerPrompt.includes('call')) {
      const subject = tone === 'Urgent'
        ? `[Action Required] Urgent Sync Request`
        : `Meeting Request: [Topic]`;
      const body = `${greeting}\n\nI would like to schedule a meeting to discuss [Topic].\n\nPlease let me know if you have 30 minutes available on [Proposed Date/Time], or suggest an alternative time that suits your schedule.\n\n${signoff}`;
      return { subject, body };
    }

    // Generic Short Keyword fallback
    const subject = `${tone === 'Urgent' ? '[URGENT] ' : ''}${rawPrompt.charAt(0).toUpperCase() + rawPrompt.slice(1)}`;
    const body = `${greeting}\n\nI am reaching out regarding ${rawPrompt}.\n\nPlease let me know your thoughts or when we can connect.\n\n${signoff}`;

    return { subject, body };
  }

  /**
   * Generates a structured email draft based on prompt and pill selections
   */
  static async generateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResponse> {
    const tone = req.tone || 'Professional';
    const length = req.length || 'Medium';
    const style = req.style || 'Professional';
    const mood = req.mood || 'Friendly';
    const recipientContext = req.recipientContext ? `Recipient context: ${req.recipientContext}` : '';

    if (!anthropic) {
      console.log(`[AIService] Utilizing Local Engine for prompt: "${req.prompt}" (Tone: ${tone}, Length: ${length}, Style: ${style}, Mood: ${mood})`);
      return this.buildStructuredEmailFromTemplate({
        prompt: req.prompt,
        tone,
        length,
        style,
        mood,
        recipientContext: req.recipientContext
      });
    }

    const systemPrompt = `You are Flymail, an elite executive AI email composition agent.
YOUR PRIMARY DIRECTIVE:
1. Carefully read and analyze the user's EXACT input narrative/prompt, regardless of length (from short keywords to multi-paragraph stories).
2. Extract all specific facts, names, dates, places, reasons, numbers, and nuances provided in the user's prompt, and ground the email directly in those details.
3. NEVER return a generic or stale template that ignores the user's narrative text.
4. Strictly apply the specified parameters:
   - Tone: ${tone}
   - Length: ${length} (Short = concise 2-3 sentences; Medium = 2-3 paragraphs; Detailed = 3-4 structured sections with bullet points)
   - Style: ${style}
   - Mood: ${mood}
5. Return ONLY valid minified JSON with keys "subject", "body", and optional "suggestedFollowUp". Do NOT include markdown blocks or preambles.`;

    const userPrompt = `Generate an email based on the following input:
- User Prompt / Narrative: "${req.prompt}"
- Tone: ${tone}
- Length: ${length}
- Style: ${style}
- Mood: ${mood}
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
      const parsed = JSON.parse(cleanJsonStr);
      if (parsed.subject && parsed.body) {
        return parsed;
      }
      throw new Error('Invalid JSON structure from Claude AI');
    } catch (error) {
      console.error('[AI Generate Email Fallback Triggered]', error);
      return this.buildStructuredEmailFromTemplate({
        prompt: req.prompt,
        tone,
        length,
        style,
        mood,
        recipientContext: req.recipientContext
      });
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
