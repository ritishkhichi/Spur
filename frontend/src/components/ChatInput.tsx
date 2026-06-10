import { useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim() || disabled) {
      return;
    }
    onSend(value);
    setValue("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <div className="chat-input__field">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          rows={1}
          disabled={disabled}
          aria-label="Chat message"
        />
        <button
          type="submit"
          className="chat-input__send"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3.4 20.4 21 12 3.4 3.6l2.8 7.2L17 12l-10.8 1.2-2.8 7.2z" />
          </svg>
        </button>
      </div>
      <p className="chat-input__hint">Press Enter to send · Shift+Enter for new line</p>
    </form>
  );
}
