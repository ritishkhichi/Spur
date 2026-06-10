import express from "express";
import cors from "cors";
import { runMigrations } from "./db/index.js";
import { chatRouter } from "./routes/chat.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  runMigrations();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/chat", chatRouter);
  app.use(errorHandler);

  return app;
}
