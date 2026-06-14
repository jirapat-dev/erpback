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
