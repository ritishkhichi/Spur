import { useCallback, useEffect, useState } from "react";
import { sendMessageStream } from "../api/chat";
import type { ChatMessage } from "../types";

const LEGACY_SESSION_KEY = "spur_chat_session_id";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) {
        return;
      }

      setError(null);
      setIsLoading(true);

      const optimisticId = `temp-${Date.now()}`;
      const streamingId = `stream-${Date.now()}`;

      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        sender: "user",
        text: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      let streamStarted = false;

      try {
        await sendMessageStream(trimmed, sessionId ?? undefined, {
          onSession: (id) => {
            setSessionId(id);
          },
          onChunk: (chunk) => {
            if (!streamStarted) {
              streamStarted = true;
              setIsStreaming(true);
              setMessages((prev) => [
                ...prev,
                {
                  id: streamingId,
                  sender: "ai",
                  text: chunk,
                  timestamp: new Date().toISOString(),
                  streaming: true,
                },
              ]);
              return;
            }

            setMessages((prev) =>
              prev.map((message) =>
                message.id === streamingId
                  ? { ...message, text: message.text + chunk }
                  : message,
              ),
            );
          },
          onDone: (reply, id) => {
            setSessionId(id);
            setMessages((prev) =>
              prev.map((message) =>
                message.id === streamingId
                  ? {
                      ...message,
                      text: reply,
                      streaming: false,
                      timestamp: new Date().toISOString(),
                    }
                  : message,
              ),
            );
          },
        });
      } catch (err) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticId && m.id !== streamingId),
        );
        setError(err instanceof Error ? err.message : "Failed to send message.");
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [isLoading, sessionId],
  );

  const dismissError = useCallback(() => setError(null), []);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    send,
    dismissError,
  };
}
