import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

function resolveDbPath(): string {
  if (process.env.SQLITE_PATH) {
    return process.env.SQLITE_PATH;
  }

  const dataDir = path.resolve(__dirname, "../../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, "chat.db");
}

const dbPath = resolveDbPath();
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema });

let migrated = false;

export function runMigrations(): void {
  if (migrated) {
    return;
  }
  migrate(db, { migrationsFolder });
  migrated = true;
}

export function resetDatabaseForTests(): void {
  sqlite.exec("DELETE FROM messages");
  sqlite.exec("DELETE FROM conversations");
}
