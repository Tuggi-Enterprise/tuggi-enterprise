import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Call the existing Supabase Edge Function
    const { data: efData, error: efError } = await supabase.functions.invoke('simple-deletion-request', {
      body: { 
        email: data.email, 
        locale: data.locale || 'en',
        source: 'enterprise-web',
        timestamp: new Date().toISOString()
      }
    });

    if (efError) {
      console.error("EF Error:", efError);
      // Fallback to recording as lead if EF fails, so we don't lose the request
      await supabase
        .schema('campaign')
        .from('inbound_leads')
        .insert([
          {
            lead_type: 'data_deletion_request_fallback',
            full_name: 'Data Deletion User',
            email: data.email,
            locale: data.locale || 'en',
            company: 'EF Fallback',
          }
        ]);
    }

    // Log to console for Vercel visibility
    console.log(`🗑️ DATA DELETION REQUEST PROCESSED:`);
    console.log(`   Email: ${data.email}`);
    console.log(`   EF Status: ${efError ? 'Failed (using fallback)' : 'Success'}`);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Data Deletion Request Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
