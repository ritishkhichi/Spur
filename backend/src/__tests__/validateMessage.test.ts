import { describe, expect, it } from "vitest";
import { validateMessage, MAX_MESSAGE_LENGTH } from "../services/chat.service.js";
import { AppError } from "../errors/AppError.js";

describe("validateMessage", () => {
  it("accepts a valid message", () => {
    expect(validateMessage("  Hello there  ")).toBe("Hello there");
  });

  it("rejects non-string input", () => {
    expect(() => validateMessage(123)).toThrow(AppError);
    expect(() => validateMessage(123)).toThrow("Message must be a string.");
  });

  it("rejects empty or whitespace-only messages", () => {
    expect(() => validateMessage("")).toThrow("Message cannot be empty.");
    expect(() => validateMessage("   \n\t  ")).toThrow("Message cannot be empty.");
  });

  it("rejects messages over the max length", () => {
    const longMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(() => validateMessage(longMessage)).toThrow("Message is too long.");
  });
});
