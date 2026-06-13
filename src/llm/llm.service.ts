import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TyphoonResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMChatOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: AxiosInstance;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    // Brief asks for OPENAI_*; we keep TYPHOON_* as a fallback so the existing
    // OpenTyphoon key keeps working. Key is read from env — never hardcoded.
    const baseURL =
      this.config.get<string>('OPENAI_BASE_URL') ??
      this.config.get<string>('TYPHOON_BASE_URL') ??
      'https://api.opentyphoon.ai/v1';
    const apiKey =
      this.config.get<string>('OPENAI_API_KEY') ??
      this.config.get<string>('TYPHOON_API_KEY');
    this.model =
      this.config.get<string>('OPENAI_MODEL') ??
      this.config.get<string>('TYPHOON_MODEL') ??
      'typhoon-v2.1-12b-instruct';

    if (!apiKey) {
      this.logger.warn(
        'No OPENAI_API_KEY/TYPHOON_API_KEY set — LLM calls will fail and callers must fall back.',
      );
    }

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    this.logger.log(`LLM Service initialized — model: ${this.model}`);
  }

  // ────── Single chat completion ────────────────────────────────────────────
  async chat(
    userMessage: string,
    options: LLMChatOptions = {},
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: userMessage });

    return this.sendMessages(messages, options);
  }

  // ────── Multi-turn conversation ───────────────────────────────────────────
  async conversation(
    history: ChatMessage[],
    options: LLMChatOptions = {},
  ): Promise<string> {
    const messages: ChatMessage[] = options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }, ...history]
      : [...history];

    return this.sendMessages(messages, options);
  }

  // ────── Internal send ─────────────────────────────────────────────────────
  private async sendMessages(
    messages: ChatMessage[],
    options: LLMChatOptions,
  ): Promise<string> {
    try {
      const response = await this.client.post<TyphoonResponse>('/chat/completions', {
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      });

      const content = response.data.choices[0]?.message?.content ?? '';
      this.logger.debug(
        `Tokens used: ${response.data.usage.total_tokens}`,
      );
      
      return content;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenTyphoon API error: ${msg}`);
      throw error;
    }
  }
}
