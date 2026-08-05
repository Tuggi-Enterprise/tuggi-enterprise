import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PARTNER_ID_PATTERN } from "@/lib/app-meta";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize Supabase admin client
const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

/** Free-text fields are stored as written; cap them so a row stays a row. */
const MAX_FIELD_LENGTH = 512;

function readText(value: unknown, fallback: string): string {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, MAX_FIELD_LENGTH) : fallback;
}

/**
 * The visitor's IP, taken from the edge and from nowhere else.
 *
 * On Vercel `x-forwarded-for` is the client's public IP, and the platform
 * overwrites whatever a caller sends precisely to stop IP spoofing
 * (vercel.com/docs/headers/request-headers); `x-real-ip` is documented as the
 * same value and is the local fallback. This used to accept an IP from the
 * request body instead, which let anyone POST a chosen partner plus a victim's
 * IP and take over the install match the app makes by IP — i.e. move someone
 * else's commission.
 */
function readClientIp(req: Request): string {
    const forwarded =
        req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
    // First entry is the client; Vercel never appends an upstream chain, but a
    // local proxy might.
    const first = forwarded?.split(",")[0]?.trim();
    if (!first) return "127.0.0.1";
    // A Node server in front (self-hosted, or `next start`) reports IPv4 in the
    // IPv6-mapped form. The app sends the plain one, and the install match is a
    // string equality on this column — leaving the prefix in would store a row
    // that can never match.
    return first.replace(/^::ffff:/i, "");
}

export async function POST(req: Request) {
    try {
        if (!supabase) {
            throw new Error("Supabase configuration missing");
        }

        const data = await req.json();
        const partnerId = typeof data?.partner_id === "string" ? data.partner_id.trim() : "";

        // Rejected before the write, not after: a malformed id can never match
        // an install, so the row would only ever be noise in the match window.
        if (!PARTNER_ID_PATTERN.test(partnerId)) {
            return NextResponse.json({ error: "Invalid partner_id" }, {
                status: 400,
            });
        }

        const { error } = await supabase
            .schema("drive")
            .from("click_fingerprints")
            .insert([
                {
                    partner_id: partnerId,
                    ip_address: readClientIp(req),
                    user_agent: readText(data?.user_agent, "Unknown"),
                    language: readText(data?.language, "Unknown"),
                    timezone: readText(data?.timezone, "Unknown"),
                },
            ]);

        if (error) {
            // No IP, no user agent: this log is read on an ordinary support
            // question, and the row it describes is personal data.
            console.error("Attribution Database Error:", error.message);
            throw error;
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: unknown) {
        console.error(
            "Attribution API Error:",
            error instanceof Error ? error.message : "unknown error"
        );
        return NextResponse.json({ error: "Internal Server Error" }, {
            status: 500,
        });
    }
}
