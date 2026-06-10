import type { ChatMessage } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
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

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div className={`message-row ${isUser ? "message-row--user" : "message-row--ai"}`}>
      {!isUser && <AgentAvatarSmall />}
      <div
        className={`message-bubble ${isUser ? "message-bubble--user" : "message-bubble--ai"}${message.streaming ? " message-bubble--streaming" : ""}`}
      >
        {!isUser && <span className="message-label">Support Agent</span>}
        <p>
          {message.text}
          {message.streaming && <span className="stream-cursor" aria-hidden="true" />}
        </p>
      </div>
    </div>
  );
}
