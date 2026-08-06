import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Ensure it doesn't crash during build if env vars are missing
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * The web channel of BR-USUARIO-024: the Trust Center form, the one Google Play
 * requires ("a web link resource where users can request app account
 * deletion"). It forwards to the `simple-deletion-request` Edge Function and
 * does nothing else with the address.
 *
 * Nothing else, and that is the change (card #167 item 1): this route used to
 * write the address of whoever asked to be erased into `campaign.inbound_leads`
 * whenever the Edge Function answered anything but 2xx — the request for
 * deletion produced a marketing contact, the exact inverse of BR-USUARIO-024
 * item 4 and of BR-USUARIO-021 item 4. A failure is an error now, and an error
 * is all it is.
 *
 * The address never reaches a log here either: it identifies a person by name
 * in a place that outlives the request and that nobody redacts.
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (typeof data?.email !== "string" || data.email.trim() === "") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    if (!supabase) {
      console.error("data-deletion: Supabase is not configured");
      return NextResponse.json(
        { error: "request_not_accepted" },
        { status: 500 }
      );
    }

    // The address format is checked by the Edge Function and by nothing else:
    // one validator, so the two cannot drift into disagreeing about which
    // addresses the channel accepts (CLAUDE.md §6).
    const { error: efError } = await supabase.functions.invoke(
      "simple-deletion-request",
      {
        body: {
          email: data.email,
          locale: data.locale || "en",
          source: "enterprise-web",
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (efError) {
      // BR-USUARIO-024 item 3 is not at risk here: the Edge Function answers
      // the same status to an address with an account and to one without, so
      // reaching this branch says something about the function, never about
      // the person. What it must not do is answer success — a request that
      // failed and was reported as accepted is a request nobody will ever come
      // back for.
      console.error("data-deletion: edge function refused the request");
      return NextResponse.json(
        { error: "request_not_accepted" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(
      "data-deletion: unexpected failure:",
      error instanceof Error ? error.name : typeof error
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
