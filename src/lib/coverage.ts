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

import snapshot from "@/data/coverage-snapshot.json";

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
  };
}
