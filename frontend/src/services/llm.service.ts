import { llmClient, request } from '@/api/client';
import type { ChatRequest, ChatResponse, ChatSession } from '@/types/llm';

/**
 * LLM service — wire these methods to real endpoints once the backend is ready.
 * All methods are async so callers won't need changes when the real API is added.
 */
export const llmService = {
  /** Send a message and receive a complete response */
  sendMessage: (payload: ChatRequest) =>
    request<ChatResponse>(llmClient, {
      method: 'POST',
      url: '/chat',
      data: payload,
    }),

  /** List past chat sessions for the current user */
  listSessions: () =>
    request<{ sessions: ChatSession[] }>(llmClient, {
      method: 'GET',
      url: '/sessions',
    }),

  /** Load a single session with its full message history */
  getSession: (sessionId: string) =>
    request<ChatSession>(llmClient, {
      method: 'GET',
      url: `/sessions/${sessionId}`,
    }),

  /** Delete a chat session */
  deleteSession: (sessionId: string) =>
    request<{ success: boolean }>(llmClient, {
      method: 'DELETE',
      url: `/sessions/${sessionId}`,
    }),
};
