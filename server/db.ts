import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

function getDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    return `postgresql://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${PGPORT || "5432"}/${PGDATABASE}?sslmode=require`;
  }
  throw new Error("No DATABASE_URL set");
}

export const pool = new Pool({ connectionString: getDbUrl() });
export const db = drizzle(pool, { schema });
