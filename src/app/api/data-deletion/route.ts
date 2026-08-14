import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-server";

/**
 * service_role, deliberately — not the publishable key `/api/leads` uses.
 *
 * Two reasons, and the first one is not about the database. This route's real
 * work is `functions.invoke`, and `simple-deletion-request` is deployed with
 * `verify_jwt: true`; a publishable key is not a JWT, and whether the gateway
 * accepts it as a credential is unmeasured. If it does not, the invoke fails
 * on every call and *every* deletion request silently degrades into the lead
 * fallback below instead of sending the email. Second, that fallback is the
 * last thing standing between a request and being lost, so it may not be the
 * part that trips on a permission.
 *
 * Built at module scope: a missing variable fails the build, not the request.
 */
const supabase = getSupabaseClient("serviceRole");


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
