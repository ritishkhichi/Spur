export type Sender = "user" | "ai";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  timestamp: string;
  streaming?: boolean;
}

export interface ChatMessageResponse {
  reply: string;
  sessionId: string;
}

export interface ChatHistoryResponse {
  sessionId: string;
  messages: ChatMessage[];
}
