import { query } from "@/lib/db";
import { saveHypothesis, saveEvidence } from "@/lib/autonomous/memory";
import type { Hypothesis } from "@/lib/autonomous/memory";
import { readFileSync, existsSync } from "fs";
import path from "path";

/**
 * Seed the database with initial hypotheses from seed.json.
 * Only runs if the hypotheses table is empty (first deployment).
 */
export async function seedIfEmpty(): Promise<void> {
  const result = await query("SELECT needs_seed_data() AS needs_seed");
  if (!result.rows[0]?.needs_seed) {
    return;
  }

  const seedPath = path.join(
    process.cwd(),
    "src",
    "data",
    "memory",
    "hypotheses",
    "seed.json"
  );

  if (!existsSync(seedPath)) {
    console.log("[CT1D Seed] No seed.json found — skipping");
    return;
  }

  try {
    const raw = readFileSync(seedPath, "utf-8");
    const seeds: Hypothesis[] = JSON.parse(raw);

    console.log(`[CT1D Seed] Loading ${seeds.length} seed hypotheses...`);

    for (const h of seeds) {
      // Save the hypothesis (without evidence — those go in the evidence table)
      const evidenceItems = h.evidence ?? [];
      await saveHypothesis({ ...h, evidence: [] });

      // Save each evidence item
      for (const e of evidenceItems) {
        await saveEvidence(e, h.id);
      }
    }

    console.log(`[CT1D Seed] Loaded ${seeds.length} hypotheses with evidence`);
  } catch (err) {
    console.error("[CT1D Seed] Failed to seed:", err);
  }
}
