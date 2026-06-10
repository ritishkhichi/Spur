import { GoogleGenAI, type Content } from "@google/genai";
import { env } from "../config/env.js";
import { SYSTEM_INSTRUCTION } from "../config/storeKnowledge.js";
import { AppError } from "../errors/AppError.js";
import type { Message } from "../db/schema.js";

const HISTORY_LIMIT = 20;
const LLM_TIMEOUT_MS = 15_000;

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

function buildContents(history: Message[], userMessage: string): Content[] {
  const recentHistory = history.slice(-HISTORY_LIMIT);
  return [
    ...recentHistory.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ] as Content[];
}

function getModelConfig() {
  return {
    systemInstruction: SYSTEM_INSTRUCTION,
    maxOutputTokens: 512,
    temperature: 0.7,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError(502, "The agent is taking too long to respond. Please try again."));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function mapGeminiError(err: unknown): AppError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes("api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("invalid authentication")
  ) {
    return new AppError(
      502,
      "Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env and restart the server.",
    );
  }
  if (
    lower.includes("quota") ||
    lower.includes("rate") ||
    lower.includes("429") ||
    lower.includes("resource_exhausted")
  ) {
    return new AppError(
      502,
      "Gemini API quota exceeded. Wait a few minutes or enable billing at aistudio.google.com, then try again.",
    );
  }
  if (lower.includes("safety") || lower.includes("blocked")) {
    return new AppError(502, "I couldn't generate a response for that message. Please rephrase and try again.");
  }

  return new AppError(502, "Sorry, I'm having trouble responding right now. Please try again.");
}

export async function generateReply(
  history: Message[],
  userMessage: string,
): Promise<string> {
  const contents = buildContents(history, userMessage);

  try {
    const result = await withTimeout(
      ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents,
        config: getModelConfig(),
      }),
      LLM_TIMEOUT_MS,
    );

    const reply = result.text?.trim();
    if (!reply) {
      throw new AppError(502, "Sorry, I couldn't generate a response. Please try again.");
    }

    return reply;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw mapGeminiError(err);
  }
}

export async function* streamReply(
  history: Message[],
  userMessage: string,
): AsyncGenerator<string> {
  const contents = buildContents(history, userMessage);

  try {
    const stream = await ai.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents,
      config: getModelConfig(),
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw mapGeminiError(err);
  }
}
