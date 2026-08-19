import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The one place in the site that builds a Supabase client.
 *
 * ---------------------------------------------------------------------------
 * Why the key is an argument and not a default
 * ---------------------------------------------------------------------------
 *
 * There used to be four independent constructions (the three `/api/*` routes
 * and this module), all reading the same environment variable. One variable
 * for four consumers means the key cannot be narrowed for one of them without
 * being narrowed for all four — and the four do not want the same power:
 *
 *  - `/api/leads` writes one row into `campaign.inbound_leads` and reads
 *    nothing. It runs on the **publishable** key, so the row is accepted by an
 *    RLS policy instead of by a key that ignores RLS.
 *  - `/api/attribution`, `/api/data-deletion`, and the reads behind
 *    `/d/<slug>`, the sitemap and `/unsubscribe` still need **service_role**:
 *    `partner.clients` has no policy that lets `anon` read it (it would answer
 *    zero rows, with no error, and every partner landing would 404), and
 *    `marketing.email_unsubscribes` has RLS on with no policies at all (it
 *    would answer 42501, and the opt-out would silently not be recorded).
 *
 * So the caller names the power it needs, at the call site, where whoever
 * reads the route can see it.
 *
 * ---------------------------------------------------------------------------
 * The names of the variables
 * ---------------------------------------------------------------------------
 *
 * Both names say what the key **can do in the database**, which is the only
 * thing that differs between them, and both use the vocabulary of the Supabase
 * dashboard the operator copies the value from (Supabase, *Understanding API
 * keys*, consulted 2026-08-14):
 *
 *  - a **publishable** key resolves to the Postgres role `anon` (or
 *    `authenticated`, with a user JWT) — "access to your project's data is
 *    guarded by Postgres via the built-in `anon` and `authenticated` roles";
 *  - a **service_role** key — the legacy JWT, and equally the new secret key —
 *    "has full access to your project's data. It also uses the `BYPASSRLS`
 *    attribute, skipping any and all Row Level Security policies."
 *
 * A name like `SUPABASE_API_KEY` says neither, matches nothing in the
 * dashboard, and is how a key silently changed power once already.
 */
export const SUPABASE_KEY_ENV = {
    /** Guarded by RLS as `anon`. Safe for a route that only writes what a policy accepts. */
    publishable: "SUPABASE_PUBLISHABLE_KEY",
    /** Bypasses RLS entirely. Never leaves the server, never reaches a bundle. */
    serviceRole: "SUPABASE_SERVICE_ROLE_KEY",
} as const;

/** Which of the two keys a caller is asking for. */
export type SupabasePower = keyof typeof SUPABASE_KEY_ENV;

/**
 * Reads a required variable, or throws naming it.
 *
 * Configuration that is missing has to fail here, at initialization, and not
 * later as a 500. The previous shape — `process.env.X || ""` and then a `null`
 * client — turned an unset variable into a runtime error on the request path,
 * and on `/api/leads` a runtime error is a lead nobody ever calls back. Thrown
 * from module scope, the same mistake fails the build instead, before a deploy
 * can serve a single request.
 */
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Supabase configuration is missing: ${name} is not set. ` +
                `The site needs SUPABASE_URL, ${SUPABASE_KEY_ENV.publishable} and ` +
                `${SUPABASE_KEY_ENV.serviceRole}.`
        );
    }
    return value;
}

/**
 * One client per power, not one per call: these carry no session and nothing
 * request-scoped, and the sitemap alone used to build a fresh one per request.
 */
const clientsByPower = new Map<SupabasePower, SupabaseClient>();

/**
 * The Supabase client for the given power.
 *
 * @throws if `SUPABASE_URL` or the key for that power is unset.
 */
export function getSupabaseClient(power: SupabasePower): SupabaseClient {
    const cached = clientsByPower.get(power);
    if (cached) return cached;

    const client = createClient(
        requireEnv("SUPABASE_URL"),
        requireEnv(SUPABASE_KEY_ENV[power])
    );
    clientsByPower.set(power, client);
    return client;
}
