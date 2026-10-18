import { useEffect, useState } from 'react';
import { getAssistantStatus, type AssistantStatus } from '@/services/assistant';

/** Whether the AI assistant (ANTHROPIC_API_KEY on the server) is available; null while checking. */
export function useAssistantStatus(): AssistantStatus | null {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    getAssistantStatus().then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
