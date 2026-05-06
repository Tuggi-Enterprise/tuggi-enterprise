import { getSupabaseServer } from "./supabase-server";

export interface StateCoverage {
  state: string;
  country: string;
  activeCount: number;
  comingSoonCount: number;
}

export interface CoverageData {
  states: StateCoverage[];
  totalActive: number;
  totalComingSoon: number;
  totalCountries: number;
}

export async function getCoverageData(): Promise<CoverageData> {
  const supabase = getSupabaseServer();

  try {
    await supabase.rpc("refresh_state_coverage_cache");
  } catch (e) {
    console.warn("Could not refresh state coverage cache RPC (might not exist or permission denied):", e);
  }

  // Fetch Aggregated Data from the Materialized View Cache
  const { data, error } = await supabase
    .schema("core")
    .from("state_coverage_cache")
    .select("*");

  if (error) {
    console.error("Error fetching coverage from state cache view:", error);
    return {
      states: [],
      totalActive: 0,
      totalComingSoon: 0,
      totalCountries: 0,
    };
  }

  // PATCH: Fetch Ireland data directly if missing from cache (since Ireland is mostly in homologation)
  const { data: irelandData } = await supabase
    .schema("homolog")
    .from("pois")
    .select("state, city, country")
    .eq("country", "Ireland");

  const combinedData = [...(data || [])];
  
  if (irelandData && irelandData.length > 0) {
    // Group by state (using city as state if null)
    const counts: Record<string, number> = {};
    irelandData.forEach(row => {
      const s = row.state || row.city || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    });
    
    Object.entries(counts).forEach(([state, count]) => {
      combinedData.push({
        state,
        country: "Ireland",
        active_count: 0,
        coming_soon_count: count
      });
    });
  }

  let totalActive = 0;
  let totalComingSoon = 0;
  const countries = new Set<string>();

  // Use a map to merge states that might have different country spellings in DB (e.g. "USA" vs "United States")
  const stateMap = new Map<string, StateCoverage>();

  combinedData.forEach((row: any) => {
    const active = Number(row.active_count || 0);
    const comingSoon = Number(row.coming_soon_count || 0);
    
    totalActive += active;
    totalComingSoon += comingSoon;

    if (!row.state || !row.country) return;

    let country = row.country;
    const lowerCountry = country.toLowerCase();
    
    // Normalize country names to ensure active and homolog merge correctly
    // And also to match the TopoJSON admin boundaries
    if (["usa", "us", "united states", "estados unidos"].includes(lowerCountry)) {
      country = "United States of America";
    } else if (lowerCountry === "brasil") {
      country = "Brazil";
    } else if (lowerCountry === "uk" || lowerCountry === "reino unido") {
      country = "United Kingdom";
    } else if (lowerCountry === "italia" || lowerCountry === "itália" || lowerCountry === "it") {
      country = "Italy";
    } else if (lowerCountry === "españa" || lowerCountry === "espanha") {
      country = "Spain";
    } else if (lowerCountry === "frança" || lowerCountry === "france") {
      country = "France";
    } else if (lowerCountry === "irlanda" || lowerCountry === "ireland") {
      country = "Ireland";
    }

    const stateKey = `${row.state}-${country}`.toLowerCase();
    
    if (stateMap.has(stateKey)) {
      const existing = stateMap.get(stateKey)!;
      existing.activeCount += active;
      existing.comingSoonCount += comingSoon;
    } else {
      stateMap.set(stateKey, {
        state: row.state,
        country: country,
        activeCount: active,
        comingSoonCount: comingSoon,
      });
    }
  });

  const states = Array.from(stateMap.values());

  states.forEach(c => {
    countries.add(c.country);
  });

  return {
    states,
    totalActive,
    totalComingSoon,
    totalCountries: countries.size,
  };
}
