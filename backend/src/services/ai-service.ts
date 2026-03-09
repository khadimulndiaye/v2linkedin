import { config } from '../config';
import { logger } from '../utils/logger';

type ContentType = 'post' | 'comment' | 'message';

export class AIService {
  private provider: 'openai' | 'gemini' | 'deepseek' | 'none';

  constructor() {
    if (config.OPENAI_API_KEY) {
      this.provider = 'openai';
    } else if (config.GEMINI_API_KEY) {
      this.provider = 'gemini';
    } else if (config.DEEPSEEK_API_KEY) {
      this.provider = 'deepseek';
    } else {
      this.provider = 'none';
      logger.warn('No AI API key configured. Set OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY.');
    }
    logger.info(`AI Service initialized with provider: ${this.provider}`);
  }

  // ── OpenAI ────────────────────────────────────────────────────────────────

  private async callOpenAI(prompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenAI error: ${err?.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() ?? '';
  }

  // ── Google Gemini ─────────────────────────────────────────────────────────

  private async callGemini(prompt: string): Promise<string> {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini error: ${err?.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }

  // ── DeepSeek ──────────────────────────────────────────────────────────────

  private async callDeepSeek(prompt: string): Promise<string> {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`DeepSeek error: ${err?.error?.message ?? res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  // ── Router ────────────────────────────────────────────────────────────────

  private async call(prompt: string): Promise<string> {
    if (this.provider === 'openai')   return this.callOpenAI(prompt);
    if (this.provider === 'gemini')   return this.callGemini(prompt);
    if (this.provider === 'deepseek') return this.callDeepSeek(prompt);

    throw new Error(
      'No AI API key is configured on the server. ' +
      'Please set OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY in your environment variables.'
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async generateContent(prompt: string, type: ContentType): Promise<string> {
    logger.info(`Generating ${type} content`);

    const systemContext: Record<ContentType, string> = {
      post: `You are a LinkedIn content expert. Write an engaging, professional LinkedIn post based on the prompt below.
Rules:
- 150–300 words
- Use short paragraphs and line breaks for readability
- Include 3–5 relevant hashtags at the end
- End with a question or call-to-action to drive engagement
- Do NOT include any preamble like "Here is a post:"

Prompt: ${prompt}`,

      comment: `You are a LinkedIn engagement specialist. Write a thoughtful, professional comment for a LinkedIn post.
Rules:
- 2–4 sentences only
- Add genuine insight or value, do not just compliment
- Optionally ask a follow-up question
- Conversational but professional tone
- Do NOT include any preamble

Context: ${prompt}`,

      message: `You are a LinkedIn outreach expert. Write a short, personalized connection request or direct message.
Rules:
- 3–5 sentences maximum
- Mention a specific reason for reaching out
- Friendly, human tone — not salesy
- End with a soft call-to-action
- Do NOT include any preamble

Context: ${prompt}`,
    };

    return this.call(systemContext[type]);
  }

  async generatePostIdeas(topic: string, count: number = 5): Promise<string[]> {
    logger.info(`Generating ${count} post ideas about: ${topic}`);

    const prompt = `Generate exactly ${count} unique LinkedIn post ideas about "${topic}".
Each idea should be a compelling headline or concept (1–2 sentences) that could become a full post.
Return ONLY a valid JSON array of strings — no markdown, no numbering, no extra text.
Example format: ["Idea one", "Idea two"]`;

    const raw = await this.call(prompt);

    try {
      // Strip possible markdown code fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, count).map(String);
      }
    } catch {
      // Fallback: split by newlines and clean up
      const lines = raw
        .split('\n')
        .map((l) => l.replace(/^[\d\-\*\.\s"]+/, '').replace(/[",\]]+$/, '').trim())
        .filter((l) => l.length > 10);
      if (lines.length > 0) return lines.slice(0, count);
    }

    throw new Error('AI returned an unexpected format for post ideas. Please try again.');
  }
}

export const aiService = new AIService();
