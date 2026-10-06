import { createClient, type Client } from "@libsql/client";

const globalDb = globalThis as unknown as { fitDb?: Client };

export function getDb(): Client {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error("Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
  }
  if (!globalDb.fitDb) {
    globalDb.fitDb = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalDb.fitDb;
}
