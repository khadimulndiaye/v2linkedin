import { config } from '../config';
import { logger } from '../utils/logger';

export class AIService {
  private provider: 'openai' | 'gemini' | 'deepseek';

  constructor() {
    if (config.OPENAI_API_KEY) {
      this.provider = 'openai';
    } else if (config.GEMINI_API_KEY) {
      this.provider = 'gemini';
    } else if (config.DEEPSEEK_API_KEY) {
      this.provider = 'deepseek';
    } else {
      this.provider = 'openai';
    }
    logger.info('AI Service initialized with provider: ' + this.provider);
  }

  async generateContent(prompt: string, type: 'post' | 'comment' | 'message'): Promise<string> {
    logger.info('Generating ' + type + ' content with ' + this.provider);
    
    const templates: Record<string, string> = {
      post: 'Here is an engaging LinkedIn post about: ' + prompt,
      comment: 'Great insight! ' + prompt,
      message: 'Hi! I noticed ' + prompt + '. Would love to connect!',
    };

    return templates[type];
  }

  async generatePostIdeas(topic: string, count: number = 5): Promise<string[]> {
    logger.info('Generating ' + count + ' post ideas about: ' + topic);
    return Array(count).fill(null).map((_, i) => 'Post idea ' + (i + 1) + ' about ' + topic);
  }
}

export const aiService = new AIService();
