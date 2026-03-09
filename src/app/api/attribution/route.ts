import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize Supabase admin client
const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export async function POST(req: Request) {
    try {
        if (!supabase) {
            throw new Error("Supabase configuration missing");
        }

        const data = await req.json();
        const { partner_id, user_agent, language, timezone } = data;

        // Get IP from headers (Vercel/Next.js standard)
        const forwarderedFor = req.headers.get("x-forwarded-for");
        const ip_address = forwarderedFor
            ? forwarderedFor.split(",")[0]
            : "127.0.0.1";

        if (!partner_id) {
            return NextResponse.json({ error: "Missing required fields" }, {
                status: 400,
            });
        }

        const { error } = await supabase
            .schema("drive")
            .from("click_fingerprints")
            .insert([
                {
                    partner_id,
                    ip_address,
                    user_agent: user_agent || "Unknown",
                    language: language || "Unknown",
                    timezone: timezone || "Unknown",
                },
            ]);

        if (error) {
            console.error("Attribution Database Error:", error);
            throw error;
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error: any) {
        console.error("Attribution API Error:", error.message);
        return NextResponse.json({ error: "Internal Server Error" }, {
            status: 500,
        });
    }
}
