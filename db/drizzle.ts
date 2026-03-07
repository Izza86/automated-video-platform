import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "./schema";

config({ path: ".env" });

// ── Singleton pool to prevent connection exhaustion during hot reload ────
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  poolCreatedAt: number | undefined;
};

// Neon (and most cloud Postgres) require SSL — never force ssl:false
const connStr = process.env.DATABASE_URL ?? "";
const isCloudDb = connStr.match(/neon|supabase|railway|render|cockroach/i);

// Validate the connection string has a resolvable host at startup
if (!connStr) {
  console.warn("⚠ DATABASE_URL is empty — database operations will fail.");
} else {
  try {
    const parsed = new URL(connStr);
    if (!parsed.hostname) {
      console.warn(`⚠ DATABASE_URL has no hostname — check your .env file.`);
    }
  } catch {
    console.warn("⚠ DATABASE_URL is not a valid URL — check your .env file.");
  }
}

function createPool(): Pool {
  const p = new Pool({
    connectionString: connStr || undefined,
    ssl: isCloudDb ? { rejectUnauthorized: false } : false,
    max: 5,                        // conservative for Neon free tier
    idleTimeoutMillis: 30_000,     // keep connections warm for 30s
    connectionTimeoutMillis: 10_000, // 10s timeout (Neon cold-starts can be slow)
    allowExitOnIdle: true,
  });

  // Graceful error handler — prevents unhandled 'error' events from crashing
  p.on("error", (err) => {
    console.error("[db/pool] Unexpected pool error:", err.message);
    // If the pool is in a bad state, mark it for replacement
    if (isConnectionError(err)) {
      console.warn("[db/pool] Connection error detected — pool will be replaced on next query.");
      globalForDb.pool = undefined;
    }
  });

  return p;
}

/** Get or create the connection pool (auto-replaces dead pools) */
function getPool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = createPool();
    globalForDb.poolCreatedAt = Date.now();
    console.log("[db/pool] New pool created.");
  }
  return globalForDb.pool;
}

// Initial pool creation
const pool = getPool();

export const db = drizzle(pool, { schema });

/** Check if an error is a DNS / network / connection issue */
export function isConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|connection terminated|Connection terminated|getaddrinfo|Client has encountered a connection error|cannot acquire a client|timeout expired|remaining connection slots|too many clients/i.test(msg);
}

/**
 * Force-replace the connection pool.  Use after repeated connection
 * failures to discard stale TCP sockets.
 */
export async function resetPool(): Promise<void> {
  const oldPool = globalForDb.pool;
  globalForDb.pool = undefined;
  if (oldPool) {
    try {
      await oldPool.end();
    } catch { /* ignore — pool is already dead */ }
  }
  // The next call to getPool() / db query will create a fresh pool
  console.log("[db/pool] Pool reset — fresh connections on next query.");
}

/**
 * Retry a database operation with exponential backoff.
 * On persistent connection failures, replaces the pool and retries.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isConnectionError(err) || attempt === maxRetries) throw err;

      const delay = attempt * 2000; // 2s, 4s, 6s
      console.warn(
        `[db/retry] ${label} attempt ${attempt}/${maxRetries} failed ` +
        `(${err instanceof Error ? err.message : err}). ` +
        `Resetting pool and retrying in ${delay}ms…`
      );

      // Replace the pool with fresh connections before retrying
      await resetPool();
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
