import { getSupabaseServer } from "./src/lib/supabase-server";

async function checkColumns() {
  const supabase = getSupabaseServer();
  
  // Check attractions columns
  const { data: attractions } = await supabase
    .schema("core")
    .from("attractions")
    .select("*")
    .limit(1);
    
  console.log("Attractions keys:", Object.keys(attractions?.[0] || {}));
  
  // Check homolog pois columns
  const { data: pois } = await supabase
    .schema("homolog")
    .from("pois")
    .select("*")
    .limit(1);
    
  console.log("POIs keys:", Object.keys(pois?.[0] || {}));
}

checkColumns();
