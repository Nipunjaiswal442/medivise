import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { ChatMessage } from '@/types/llm';
import styles from './ChatPage.module.css';

/**
 * Chat page for AI Assistant.
 * Currently renders a local-only UI. Wire llmService.sendMessage()
 * once the backend LLM endpoint is available.
 */
export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // TODO: Replace with llmService.sendMessage({ message: text })
    // Simulate a placeholder response for now
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'AI Assistant is not yet connected. Connect the LLM backend to enable clinical decision support.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className={styles.container}>
      <div className={styles.chatHeader}>
        <h1 className={styles.title}>AI Clinical Assistant</h1>
        <p className={styles.subtitle}>
          Ask clinical questions, check drug interactions, or request
          evidence-based protocols.
        </p>
      </div>

      <div className={styles.messageArea}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Start a conversation</p>
            <p className={styles.emptyHint}>
              Ask about drug interactions, treatment protocols, or clinical
              guidelines.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${msg.role === 'user' ? styles.user : styles.assistant}`}
          >
            <div className={styles.bubble}>{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={`${styles.bubble} ${styles.typing}`}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className={styles.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your clinical question..."
          className={styles.input}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={styles.sendBtn}
        >
          Send
        </button>
      </form>
    </div>
  );
}
