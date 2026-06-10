import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  metadata: text("metadata"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  sender: text("sender", { enum: ["user", "ai"] }).notNull(),
  text: text("text").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
