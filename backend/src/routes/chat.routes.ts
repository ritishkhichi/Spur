import type { Response } from "express";
import { Router } from "express";
import {
  getChatHistory,
  processChatMessage,
  processChatMessageStream,
  type ChatStreamEvent,
} from "../services/chat.service.js";
import { AppError } from "../errors/AppError.js";

export const chatRouter = Router();

function writeSse(res: Response, event: ChatStreamEvent): void {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

chatRouter.post("/message", async (req, res, next) => {
  try {
    const { message, sessionId } = req.body ?? {};
    const result = await processChatMessage(message, sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

chatRouter.post("/message/stream", async (req, res, next) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const { message, sessionId } = req.body ?? {};

    for await (const event of processChatMessageStream(message, sessionId)) {
      writeSse(res, event);
    }

    res.end();
  } catch (err) {
    const message =
      err instanceof AppError
        ? err.message
        : "Something went wrong. Please try again.";
    const statusCode = err instanceof AppError ? err.statusCode : 500;

    if (!res.headersSent) {
      next(err);
      return;
    }

    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: message, statusCode })}\n\n`);
    res.end();
  }
});

chatRouter.get("/history/:sessionId", async (req, res, next) => {
  try {
    const result = await getChatHistory(req.params.sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
