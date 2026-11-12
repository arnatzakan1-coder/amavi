import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// DATABASE_URL / DATABASE_AUTH_TOKEN, or the names the Turso integration on Vercel sets.
const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./data/amavi.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

const globalForDb = globalThis as unknown as { __amaviClient?: ReturnType<typeof createClient> };

const client = globalForDb.__amaviClient ?? createClient({ url, authToken });

if (process.env.NODE_ENV !== "production") globalForDb.__amaviClient = client;

export const db = drizzle(client, { schema });
export { schema };
