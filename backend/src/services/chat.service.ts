import { eq, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { conversations, messages, type Message } from "../db/schema.js";
import { AppError } from "../errors/AppError.js";
import { generateReply, streamReply } from "./llm.service.js";

export const MAX_MESSAGE_LENGTH = 4000;

export type ChatStreamEvent =
  | { type: "session"; data: { sessionId: string } }
  | { type: "chunk"; data: { text: string } }
  | { type: "done"; data: { reply: string; sessionId: string } };

export function validateMessage(message: unknown): string {
  if (typeof message !== "string") {
    throw new AppError(400, "Message must be a string.");
  }

  const trimmed = message.trim();
  if (!trimmed) {
    throw new AppError(400, "Message cannot be empty.");
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(
      400,
      `Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
    );
  }

  return trimmed;
}

async function getOrCreateConversation(sessionId?: string): Promise<string> {
  if (sessionId) {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, sessionId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }
  }

  const id = uuidv4();
  await db.insert(conversations).values({
    id,
    createdAt: new Date(),
    metadata: null,
  });

  return id;
}

async function getConversationHistory(conversationId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.timestamp));
}

async function saveUserMessage(conversationId: string, message: string): Promise<string> {
  const userMessageId = uuidv4();
  await db.insert(messages).values({
    id: userMessageId,
    conversationId,
    sender: "user",
    text: message,
    timestamp: new Date(),
  });
  return userMessageId;
}

async function saveAiMessage(conversationId: string, reply: string): Promise<void> {
  await db.insert(messages).values({
    id: uuidv4(),
    conversationId,
    sender: "ai",
    text: reply,
    timestamp: new Date(),
  });
}

export async function processChatMessage(
  rawMessage: unknown,
  sessionId?: string,
): Promise<{ reply: string; sessionId: string }> {
  const message = validateMessage(rawMessage);
  const conversationId = await getOrCreateConversation(sessionId);
  const userMessageId = await saveUserMessage(conversationId, message);

  const history = await getConversationHistory(conversationId);
  const historyForLlm = history.filter((m) => m.id !== userMessageId);
  const reply = await generateReply(historyForLlm, message);

  await saveAiMessage(conversationId, reply);
  return { reply, sessionId: conversationId };
}

export async function* processChatMessageStream(
  rawMessage: unknown,
  sessionId?: string,
): AsyncGenerator<ChatStreamEvent> {
  const message = validateMessage(rawMessage);
  const conversationId = await getOrCreateConversation(sessionId);
  const userMessageId = await saveUserMessage(conversationId, message);

  yield { type: "session", data: { sessionId: conversationId } };

  const history = await getConversationHistory(conversationId);
  const historyForLlm = history.filter((m) => m.id !== userMessageId);

  let reply = "";
  for await (const chunk of streamReply(historyForLlm, message)) {
    reply += chunk;
    yield { type: "chunk", data: { text: chunk } };
  }

  const trimmedReply = reply.trim();
  if (!trimmedReply) {
    throw new AppError(502, "Sorry, I couldn't generate a response. Please try again.");
  }

  await saveAiMessage(conversationId, trimmedReply);
  yield { type: "done", data: { reply: trimmedReply, sessionId: conversationId } };
}

export async function getChatHistory(sessionId: string): Promise<{
  sessionId: string;
  messages: Array<{
    id: string;
    sender: "user" | "ai";
    text: string;
    timestamp: string;
  }>;
}> {
  const conversation = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.id, sessionId))
    .limit(1);

  if (conversation.length === 0) {
    throw new AppError(404, "Conversation not found.");
  }

  const rows = await getConversationHistory(sessionId);

  return {
    sessionId,
    messages: rows.map((row) => ({
      id: row.id,
      sender: row.sender,
      text: row.text,
      timestamp: row.timestamp.toISOString(),
    })),
  };
}
