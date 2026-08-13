import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  businessTypeCode,
  isLeadBusinessType,
  type LeadBusinessType,
} from "@/lib/business-types";
import { toE164 } from "@/lib/phone";
import { PARTNER_LEAD_TYPE } from "@/lib/lead-form";

/**
 * The one lead endpoint of the site — `campaign.inbound_leads`.
 *
 * Two funnels write here and they are not the same conversation:
 *
 *  - **`/contact`** (`ContactRouter`), which triages city halls (`B2G`) and
 *    fleets (`B2B`) and always sends an email.
 *  - **`/partners`** (`PartnerLeadForm`, card #294), which talks to the owner
 *    of a restaurant or a guest house and lets him choose **WhatsApp or
 *    email**. Its `lead_type` is `B2B_PARTNER` and it is deliberately not
 *    `B2B`: reusing that value would mix this funnel with the fleet one and
 *    the number would stop meaning anything.
 *
 * **A second endpoint was ruled out** (#294): one table, one route, one place
 * where the shape of a lead is decided.
 *
 * ---------------------------------------------------------------------------
 * What changed with #295, and why the validation had to move
 * ---------------------------------------------------------------------------
 *
 * `email` stopped being `NOT NULL`; the guarantee is now the CHECK
 * `inbound_leads_contato_minimo` — **at least one** of email and `phone_e164`,
 * neither of them blank. The old guard here (`!data.email || …`) rejected the
 * WhatsApp-only path outright, so it is gone; what replaced it asks the same
 * question the column now asks.
 *
 * **Every refusal is a 400 with a typed code, never a 500.** The three CHECKs
 * on that table answer with SQLSTATE 23514, which arrives here as a thrown
 * error and used to leave as `Internal Server Error` — and a 500 on this route
 * is a lead nobody ever calls back. The shapes the database refuses are
 * checked before the insert: the phone in E.164 (`toE164`), the business type
 * against the closed domain of `inbound_leads_business_type_dominio`.
 *
 * ---------------------------------------------------------------------------
 * The city, and what this route deliberately does not store
 * ---------------------------------------------------------------------------
 *
 * The partnership form does not ask for the city — five fields is the budget,
 * and it is the one field the connection already knows. Vercel sends it as
 * `x-vercel-ip-city`, **percent-encoded per RFC 3986**: without
 * `decodeURIComponent` São Paulo arrives as `S%C3%A3o%20Paulo`
 * (Vercel, *Request headers*, consulted 2026-08-12). It is resolved here and
 * not in the browser because an extra `fetch` before the POST is one more
 * chance for the submission to fail, and the header is on the server anyway.
 *
 * It is read **only** for `B2B_PARTNER`: on `/contact` the city is typed by the
 * visitor, and deriving one there would collect a field that funnel never
 * declared.
 *
 * **The IP and the user agent are never stored, in any field.** The privacy
 * policy says so in four languages (`Legal.Privacy.s1Item4`, BR-USUARIO-028
 * item 1, BR-USUARIO-029), and what the policy denies the payload may not
 * carry.
 */

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Ensure it doesn't crash during build if env vars are missing
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/** A trimmed string, or null — which is what "absent" means to the CHECK. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * The approximate city of the connection. Never the IP, which is read and
 * dropped in the same expression.
 */
function cityFromHeaders(req: Request): string | null {
  const raw = req.headers.get("x-vercel-ip-city");
  if (!raw) return null;
  try {
    return text(decodeURIComponent(raw));
  } catch {
    // A header we cannot decode is a header we do not store — a lead is not
    // worth losing over a city nobody asked for.
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const leadType = text(data.lead_type);
    const fullName = text(data.full_name);
    if (!leadType || !fullName) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const email = text(data.email);
    const rawPhone = text(data.phone_e164);
    // Normalized again on the server: the client already did it, and a client
    // is not a guarantee — the column's CHECK is, and it answers with a 500.
    const phone = rawPhone ? toE164(rawPhone) : null;
    if (rawPhone && !phone) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }
    // The application half of `inbound_leads_contato_minimo`: here for the
    // message, in the database for the guarantee.
    if (!email && !phone) {
      return NextResponse.json({ error: "missing_contact" }, { status: 400 });
    }

    // Validated against the closed domain before it reaches the column, whose
    // own CHECK would answer with a 500.
    let businessType: LeadBusinessType | null = null;
    const declaredType = text(data.business_type);
    if (declaredType) {
      if (!isLeadBusinessType(declaredType)) {
        return NextResponse.json({ error: "invalid_business_type" }, { status: 400 });
      }
      businessType = declaredType;
    }

    if (!supabase) {
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    const { error } = await supabase
      .schema("campaign")
      .from("inbound_leads")
      .insert([
        {
          lead_type: leadType,
          full_name: fullName,
          email,
          phone_e164: phone,
          business_type: businessType ? businessTypeCode(businessType) : null,
          role: text(data.role),
          city:
            leadType === PARTNER_LEAD_TYPE ? cityFromHeaders(req) : text(data.city),
          company: text(data.company),
          fleet_size: text(data.fleet_size),
          locale: text(data.locale) || "en",
        },
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    // Code and message only, and never the object. A PostgREST error carries
    // `details` — "Failing row contains (…)" — which is the whole lead, name
    // and phone included, in a log that is not the place for it.
    const failure = error as { code?: string; message?: string };
    console.error("Lead capture failed", {
      code: failure?.code,
      message: failure?.message,
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
