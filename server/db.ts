import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

// Prefer the user-provided Neon database when present, otherwise fall back to
// Replit's built-in database (DATABASE_URL is reserved/runtime-managed by Replit).
const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

export const hasDatabase = Boolean(connectionString);

// Use HTTP-only mode - Replit blocks WebSocket connections
const sql = connectionString ? neon(connectionString) : null;
export const db = sql ? drizzle(sql, { schema }) : null as unknown as ReturnType<typeof drizzle<typeof schema>>;
