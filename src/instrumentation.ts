export async function register() {
  // Only run on the server (not edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeSchema, healthCheck } = await import("@/lib/db");

    try {
      const ok = await healthCheck();
      if (ok) {
        await initializeSchema();
        const { seedIfEmpty } = await import("@/lib/db-seed");
        await seedIfEmpty();
        console.log("[CT1D] Database connected and schema ready");
      } else {
        console.warn(
          "[CT1D] Database not reachable — running without persistence. " +
          "Set DATABASE_URL in .env.local for local dev."
        );
      }
    } catch (err) {
      console.warn(
        "[CT1D] Database initialization skipped:",
        err instanceof Error ? err.message : err
      );
    }
  }
}
