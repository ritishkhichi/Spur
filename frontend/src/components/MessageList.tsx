import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

const SUGGESTIONS = [
  "What's your return policy?",
  "How long does shipping take?",
  "What are your support hours?",
];

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  onSuggest: (text: string) => void;
}

function AgentAvatarSmall() {
  return (
    <div className="agent-avatar agent-avatar--sm" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      </svg>
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
  isStreaming,
  onSuggest,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStreaming]);

  return (
    <div className="message-list">
      {messages.length === 0 && !isLoading && (
        <div className="message-list__empty">
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2>How can we help?</h2>
            <p>Ask about shipping, returns, or when we're available.</p>
            <div className="suggestion-chips">
              {SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => onSuggest(text)}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isLoading && !isStreaming && (
        <div className="message-row message-row--ai">
          <AgentAvatarSmall />
          <div className="message-bubble message-bubble--ai typing-indicator">
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
            Agent is typing...
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
