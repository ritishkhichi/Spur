import type { ChatHistoryResponse, ChatMessageResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }

  return data as T;
}

export async function sendMessage(
  message: string,
  sessionId?: string,
): Promise<ChatMessageResponse> {
  const response = await fetch(`${API_BASE}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  return handleResponse<ChatMessageResponse>(response);
}

export interface StreamHandlers {
  onSession: (sessionId: string) => void;
  onChunk: (text: string) => void;
  onDone: (reply: string, sessionId: string) => void;
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split("\n");
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  if (!data) {
    return null;
  }

  return { event, data };
}

export async function sendMessageStream(
  message: string,
  sessionId: string | undefined,
  handlers: StreamHandlers,
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errorMessage =
      typeof data.error === "string"
        ? data.error
        : "Something went wrong. Please try again.";
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming is not supported in this browser.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const parsed = parseSseBlock(block);
      if (!parsed) {
        continue;
      }

      const payload = JSON.parse(parsed.data) as Record<string, string>;

      if (parsed.event === "session") {
        handlers.onSession(payload.sessionId);
      } else if (parsed.event === "chunk") {
        handlers.onChunk(payload.text);
      } else if (parsed.event === "done") {
        handlers.onDone(payload.reply, payload.sessionId);
      } else if (parsed.event === "error") {
        throw new Error(payload.error ?? "Something went wrong. Please try again.");
      }
    }
  }
}

export async function fetchHistory(
  sessionId: string,
): Promise<ChatHistoryResponse> {
  const response = await fetch(`${API_BASE}/chat/history/${sessionId}`);
  return handleResponse<ChatHistoryResponse>(response);
}
