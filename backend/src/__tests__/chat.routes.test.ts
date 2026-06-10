import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../services/llm.service.js", () => ({
  generateReply: vi.fn().mockResolvedValue(
    "Returns are accepted within 30 days of delivery.",
  ),
  streamReply: vi.fn(async function* () {
    yield "Returns are ";
    yield "accepted within 30 days of delivery.";
  }),
}));

import { createApp } from "../app.js";
import { resetDatabaseForTests } from "../db/index.js";

describe("chat routes", () => {
  const app = createApp();

  beforeEach(() => {
    resetDatabaseForTests();
  });

  it("POST /chat/message returns a reply and sessionId", async () => {
    const response = await request(app)
      .post("/chat/message")
      .send({ message: "What is your return policy?" });

    expect(response.status).toBe(200);
    expect(response.body.reply).toContain("30 days");
    expect(typeof response.body.sessionId).toBe("string");
  });

  it("POST /chat/message rejects empty messages", async () => {
    const response = await request(app)
      .post("/chat/message")
      .send({ message: "   " });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Message cannot be empty.");
  });

  it("GET /chat/history returns persisted messages", async () => {
    const chatResponse = await request(app)
      .post("/chat/message")
      .send({ message: "What are your support hours?" });

    const historyResponse = await request(app).get(
      `/chat/history/${chatResponse.body.sessionId}`,
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.messages).toHaveLength(2);
    expect(historyResponse.body.messages[0].sender).toBe("user");
    expect(historyResponse.body.messages[1].sender).toBe("ai");
  });

  it("GET /chat/history returns 404 for unknown session", async () => {
    const response = await request(app).get(
      "/chat/history/00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(404);
  });

  it("POST /chat/message/stream emits SSE events", async () => {
    const response = await request(app)
      .post("/chat/message/stream")
      .send({ message: "Tell me about returns" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain("event: session");
    expect(response.text).toContain("event: chunk");
    expect(response.text).toContain("event: done");
    expect(response.text).toContain("30 days");
  });
});
