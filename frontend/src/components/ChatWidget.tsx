import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { useChat } from "../hooks/useChat";

function AgentAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className={`agent-avatar agent-avatar--${size}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
        <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      </svg>
    </div>
  );
}

export function ChatWidget() {
  const { messages, isLoading, isStreaming, error, send, dismissError } = useChat();

  return (
    <div className="chat-widget">
      <header className="chat-header">
        <AgentAvatar />
        <div className="chat-header__text">
          <h1>Spur Boutique</h1>
          <p>
            <span className="status-dot" />
            Support agent online
          </p>
        </div>
      </header>

      {error && (
        <div className="chat-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <MessageList
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        onSuggest={send}
      />
      <ChatInput onSend={send} disabled={isLoading} />
    </div>
  );
}
