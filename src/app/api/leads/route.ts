import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Ensure it doesn't crash during build if env vars are missing
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : (null as any);


export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.email || !data.full_name || !data.lead_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase
      .schema('campaign')
      .from('inbound_leads')
      .insert([
        {
          lead_type: data.lead_type,
          full_name: data.full_name,
          email: data.email,
          role: data.role || null,
          city: data.city || null,
          company: data.company || null,
          fleet_size: data.fleet_size || null,
          locale: data.locale || 'en',
        }
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    console.error("Lead Capture Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
