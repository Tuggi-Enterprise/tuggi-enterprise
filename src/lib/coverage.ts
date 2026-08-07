/**
 * coverage.ts
 *
 * Reads the pre-generated snapshot produced by `npm run update-coverage`.
 * The snapshot is committed to the repo, so the build never needs a live
 * Supabase connection — keeping deploys fast and deterministic.
 *
 * To refresh the numbers locally:
 *   npm run update-coverage
 *   git add src/data/coverage-snapshot.json && git commit -m "chore: refresh coverage snapshot"
 */

// Relative, not the "@/" alias: this module is read outside the Next build
// too — tests/e2e/product-facts.spec.ts calls it through lib/product-facts —
// and Playwright's transform resolves the alias for TypeScript but not for a
// JSON import.
import snapshot from "../data/coverage-snapshot.json";

export interface StateCoverage {
  state: string;
  country: string;
  activeCount: number;
  comingSoonCount: number;
}

export interface CoverageData {
  states: StateCoverage[];
  totalActive: number;        // sum of states that passed the map threshold (map display)
  totalActiveRaw: number;     // every active attraction in DB — use this for hero stats
  totalComingSoon: number;
  totalCountries: number;
  totalActiveCountries: number;
  totalActiveRegions: number;
  /**
   * ISO 8601 timestamp of the run that produced the snapshot.
   *
   * Exposed because every count above is only true as of that moment, and the
   * one that was published had been frozen for weeks with no way to tell:
   * BR-COMUNICACAO-002, items 4 and 5 — a figure off a frozen snapshot is
   * publishable only with its date, or with the snapshot regenerated in the
   * same delivery. `lib/product-facts.ts` carries it alongside the value so a
   * number can never reach a page without its age.
   */
  generatedAt: string;
}

export async function getCoverageData(): Promise<CoverageData> {
  return {
    states: snapshot.states as StateCoverage[],
    totalActive:          snapshot.totalActive,
    totalActiveRaw:       (snapshot as any).totalActiveRaw ?? snapshot.totalActive,
    totalComingSoon:      snapshot.totalComingSoon,
    totalCountries:       snapshot.totalCountries,
    totalActiveCountries: snapshot.totalActiveCountries,
    totalActiveRegions:   snapshot.totalActiveRegions,
    generatedAt:          snapshot.generatedAt,
  };
}
