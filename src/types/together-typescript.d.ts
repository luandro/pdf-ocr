declare module 'together-typescript' {
  export interface TogetherOptions {
    apiKey: string;
  }

  export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  export interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
  }

  export interface ChatCompletionResponse {
    choices: {
      message?: {
        content: string;
      };
    }[];
  }

  export class Together {
    constructor(options: TogetherOptions);
    
    chat: {
      completions: {
        create(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
      };
    };
  }
}
