import { getSupabaseServer } from "./src/lib/supabase-server";

async function checkStates() {
  const supabase = getSupabaseServer();
  
  // Aggregate view to get unique states
  const { data: cacheData } = await supabase
    .schema("core")
    .from("state_coverage_cache")
    .select("country, state")
    .in("country", ["Argentina", "Chile", "France", "Spain", "Portugal", "Italy", "United Kingdom", "UK"]);
    
  console.log("State Coverage Cache:");
  console.log(cacheData?.map(r => `${r.country}: ${r.state}`));
}

checkStates();
