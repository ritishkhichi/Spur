import { config } from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendEnv = path.resolve(__dirname, "../../.env");
const rootEnv = path.resolve(__dirname, "../../../.env");

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const result = config({ path: filePath });
  if (result.error) {
    console.warn(`Warning: could not load ${filePath}:`, result.error.message);
  }
}

loadEnvFile(backendEnv);
if (!process.env.GEMINI_API_KEY) {
  loadEnvFile(rootEnv);
}
if (!process.env.GEMINI_API_KEY) {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
