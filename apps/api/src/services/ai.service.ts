import axios from 'axios';
import {
  GenerateEmailRequest,
  GeneratedEmailResponse,
  RewriteEmailRequest,
  SummarizeEmailRequest,
  SummarizeEmailResponse
} from '@mailflow/shared-types';

const GROQ_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class AIService {
  /**
   * Generates a structured email draft using Groq API (llama-3.3-70b-versatile)
   */
  static async generateEmail(req: GenerateEmailRequest): Promise<GeneratedEmailResponse> {
    const apiKey = process.env.GROQ_API_KEY || '';
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const tone = req.tone || 'Professional';
    const length = req.length || 'Medium';
    const style = req.style || 'Professional';
    const mood = req.mood || 'Friendly';
    const recipientContext = req.recipientContext ? `Recipient context: ${req.recipientContext}` : '';

    const systemPrompt = `You are a world-class executive email composition AI assistant.
Your goal is to write a highly relevant, well-structured, professional email based EXACTLY on the user's prompt and specified parameters.

STRICT RULES:
1. Base the email content 100% on the exact user prompt provided. Extract all specific facts, reasons, names, dates, and instructions given.
2. Apply these specific parameters:
   - Tone: ${tone}
   - Length: ${length} (Short = 2-3 concise sentences; Medium = 2-3 paragraphs; Detailed = multi-section with bullet points)
   - Style: ${style}
   - Mood: ${mood}
3. OUTPUT FORMAT: Respond ONLY with valid, raw JSON. Do NOT include markdown blocks (\`\`\`json), no preambles, and no extra conversational text.
JSON Structure:
{
  "subject": "Clear, relevant subject line",
  "body": "Full body copy of the email with appropriate line breaks and formatting",
  "suggestedFollowUp": "Optional short follow-up recommendation"
}`;

    const userPrompt = `User Prompt / Instructions: "${req.prompt}"
${recipientContext}
Tone: ${tone}
Length: ${length}
Style: ${style}
Mood: ${mood}`;

    // Internal helper to call Groq API endpoint
    const callGroqAPI = async (extraSystemInstruction?: string) => {
      const messages = [
        {
          role: 'system',
          content: extraSystemInstruction ? `${systemPrompt}\nCRITICAL: ${extraSystemInstruction}` : systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];

      const response = await axios.post(
        GROQ_COMPLETIONS_URL,
        {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 25000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      return content;
    };

    // Helper to safely parse JSON response
    const parseJSON = (rawContent: string): GeneratedEmailResponse => {
      const cleanJsonStr = rawContent
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJsonStr);
      if (parsed && typeof parsed.subject === 'string' && typeof parsed.body === 'string') {
        return {
          subject: parsed.subject,
          body: parsed.body,
          suggestedFollowUp: parsed.suggestedFollowUp || undefined
        };
      }
      throw new Error('Response JSON missing required subject or body string properties.');
    };

    // Fallback template builder if Groq API key is unconfigured or sample key is present
    const buildFallbackEmail = (): GeneratedEmailResponse => {
      console.log(`[AIService] Utilizing Local Email Synthesis for: "${req.prompt}"`);
      const words = req.prompt.trim().split(/\s+/).filter(Boolean);
      const isShort = length === 'Short';
      const isDetailed = length === 'Detailed';

      const greeting = tone === 'Professional' || mood === 'Formal' ? 'Dear [Recipient],' : 'Hi [Name],';
      const signoff = tone === 'Casual' ? 'Best,\n[Your Name]' : 'Best regards,\n[Your Name]';

      let subject = `Regarding: ${req.prompt.slice(0, 45).replace(/^\w/, (c) => c.toUpperCase())}`;
      let body = '';

      if (req.prompt.toLowerCase().includes('sick leave') || req.prompt.toLowerCase().includes('sick')) {
        subject = `Sick Leave Notification - [Your Name]`;
        body = `${greeting}\n\nI am writing to inform you that I am feeling unwell today and will be taking sick leave to rest and recover.\n\nI expect to return on [Return Date]. I will keep an eye on urgent messages if possible, but please reach out to [Colleague Name] for immediate team inquiries.\n\n${signoff}`;
      } else if (req.prompt.toLowerCase().includes('interview') || req.prompt.toLowerCase().includes('follow up')) {
        subject = `Thank You & Follow-Up - Interview for [Position Name]`;
        body = `${greeting}\n\nThank you for taking the time to speak with me regarding the [Position Name] role. I really enjoyed learning more about the team and upcoming initiatives.\n\nI remain very enthusiastic about this opportunity. Please let me know if you need any additional references or materials from my end.\n\n${signoff}`;
      } else if (words.length > 5) {
        body = `${greeting}\n\nI am reaching out regarding the following matter:\n\n${req.prompt}\n\nPlease review this information and let me know if you have any questions or require adjustments.\n\n${signoff}`;
      } else {
        body = `${greeting}\n\nI am writing to discuss ${req.prompt}.\n\nPlease let me know your thoughts or when you might be available for a brief sync.\n\n${signoff}`;
      }

      return { subject, body, suggestedFollowUp: 'Follow up in 48 hours if no response.' };
    };

    if (!apiKey || apiKey === 'gsk_sample') {
      return buildFallbackEmail();
    }

    try {
      // First Attempt
      const rawContent = await callGroqAPI();
      try {
        return parseJSON(rawContent);
      } catch (parseError) {
        console.warn('[AIService] Groq JSON parse failed on 1st attempt. Retrying with strict JSON instruction...', parseError);
        // Retry ONCE with stricter instruction as required
        const retryRawContent = await callGroqAPI('YOUR PREVIOUS OUTPUT WAS NOT VALID JSON. YOU MUST RETURN ONLY RAW VALID JSON STARTING WITH { AND ENDING WITH }. DO NOT WRAP IN MARKDOWN OR ADD TEXT.');
        return parseJSON(retryRawContent);
      }
    } catch (error: any) {
      console.error('[AIService Groq Error]', error?.response?.data || error?.message || error);
      // Fallback gracefully to synthesiser if network issue occurs, or return generated response
      return buildFallbackEmail();
    }
  }

  /**
   * Refines or rewrites an existing email based on instruction
   */
  static async rewriteEmail(req: RewriteEmailRequest): Promise<GeneratedEmailResponse> {
    const apiKey = process.env.GROQ_API_KEY || '';
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (!apiKey || apiKey === 'gsk_sample') {
      return {
        subject: req.subject,
        body: `${req.body}\n\n[Revised: "${req.instruction}"]`
      };
    }

    try {
      const response = await axios.post(
        GROQ_COMPLETIONS_URL,
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert email editor. Refine the given email according to instructions. Respond ONLY with valid JSON containing "subject" and "body".'
            },
            {
              role: 'user',
              content: `Subject: ${req.subject}\nBody: ${req.body}\nInstruction: ${req.instruction}`
            }
          ],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('[AIService Rewrite Error]', error);
      return { subject: req.subject, body: req.body };
    }
  }

  /**
   * Summarizes email threads for quick executive overview
   */
  static async summarizeThread(req: SummarizeEmailRequest): Promise<SummarizeEmailResponse> {
    const apiKey = process.env.GROQ_API_KEY || '';
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (!apiKey || apiKey === 'gsk_sample') {
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

    try {
      const response = await axios.post(
        GROQ_COMPLETIONS_URL,
        {
          model,
          messages: [
            {
              role: 'system',
              content: 'Analyze the email thread. Respond ONLY with valid JSON containing "summary" (string), "keyPoints" (string array), and "suggestedAction" (string).'
            },
            { role: 'user', content: threadContent }
          ],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('[AIService Summarize Error]', error);
      return {
        summary: 'Summary unavailable due to API error.',
        keyPoints: ['Review thread directly']
      };
    }
  }
}
