import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { serverEnv } from "@/lib/env";
import * as schema from "@/server/db/schema";

const globalForDb = globalThis as unknown as {
  allmePool?: Pool;
};

const connectionString = serverEnv.DATABASE_URL;

export const pool =
  globalForDb.allmePool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.allmePool = pool;
}

export const db = drizzle(pool, { schema });
