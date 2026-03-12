/** A single message in a chat conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/** A chat conversation/session */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/** Request payload for sending a message to the LLM */
export interface ChatRequest {
  sessionId?: string;
  message: string;
  context?: Record<string, unknown>;
}

/** Streamed or complete response from the LLM */
export interface ChatResponse {
  sessionId: string;
  message: ChatMessage;
}
