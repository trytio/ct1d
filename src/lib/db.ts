import pg from "pg";
import { readFileSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// PostgreSQL Connection Pool
// ---------------------------------------------------------------------------
// Uses DATABASE_URL from environment (set by Carlos secret interpolation).
// Falls back to local dev defaults for npm run dev.
// ---------------------------------------------------------------------------

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://ct1d:ct1d@localhost:5432/ct1d";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[CT1D DB] Unexpected pool error:", err.message);
});

/** Execute a query with parameters. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

/** Get a client from the pool (for transactions). */
export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

/** Run a function inside a transaction. */
export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Initialize the database schema from init-db.sql. */
export async function initializeSchema(): Promise<void> {
  try {
    const sqlPath = path.join(process.cwd(), "scripts", "init-db.sql");
    const sql = readFileSync(sqlPath, "utf-8");
    await pool.query(sql);
    console.log("[CT1D DB] Schema initialized successfully");
  } catch (err) {
    console.error("[CT1D DB] Schema initialization failed:", err);
    throw err;
  }
}

/** Check if the database is reachable. */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}

/** Graceful shutdown. */
export async function shutdown(): Promise<void> {
  await pool.end();
}

export default pool;
