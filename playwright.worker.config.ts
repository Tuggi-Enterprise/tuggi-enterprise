import { defineConfig } from "@playwright/test";
import base, {
  E2E_EDGE_SHARED_SECRET,
  E2E_NEWSLETTER_SECRET,
  E2E_PARTNER_FORM_HASH_SECRET,
  E2E_PUBLISHABLE_KEY,
  E2E_SERVICE_ROLE_KEY,
  MOCK_SUPABASE_PORT,
} from "./playwright.config";

/**
 * The same suite, against the Cloudflare Worker instead of `next start`
 * (tuggi-app#987). `npm run test:e2e:worker`.
 *
 * The app is built by `opennextjs-cloudflare build` and served by
 * `opennextjs-cloudflare preview`, which is `wrangler dev` on workerd, the
 * runtime production runs. The Supabase double is the same one.
 *
 * WHAT THE LOCAL WORKER DOES NOT REPRODUCE, and the specs that depend on it:
 *
 * - `request.cf` comes from Miniflare, which takes it from the `MF-CF-Blob`
 *   request header when present (miniflare `entry.worker.js`). The default
 *   below is an empty blob, so a request declares no country, the way a local
 *   `next start` receives no country header. Specs place a visitor with
 *   `tests/e2e/visitor-headers.ts`, which writes the blob and the Vercel
 *   header together. In production the header is ordinary and nothing reads it.
 * - Miniflare keeps a `CF-Connecting-IP` the client sent, and only fills it
 *   when absent; Cloudflare overwrites it. That is what lets a spec place a
 *   visitor at an address here. That a forged one is never read on the
 *   Worker is pinned in `client-address-trust.spec.ts`, not over HTTP.
 *
 * THE LOCAL .env FILES ARE KEPT OUT OF THE BUNDLE. OpenNext compiles `.env`
 * and `.env.local` into `.open-next/cloudflare/next-env.mjs` and the Worker
 * fills `process.env` from it for every key the Worker vars do not set
 * (`populateProcessEnv`). On a developer machine those files hold real keys,
 * so the command empties that module before serving: the suite talks to the
 * double and nothing else, and no real key is bundled into a test build.
 */
const WORKER_PORT = 8771;
/**
 * `localhost`, not `127.0.0.1`. Under `wrangler dev` the Worker sees the
 * request host as `localhost:<port>`, and OpenNext treats a middleware rewrite
 * whose host differs from the request's as EXTERNAL: it proxies it with
 * `fetch`, which follows redirects. Every `/d/`, `/r/` and `/c/` page goes
 * through such a rewrite (src/middleware.ts), so on `127.0.0.1` an old slug
 * answered 200 with the new page instead of 308, and the proxied response
 * lost what the page set. Measured 2026-10-20: `curl 127.0.0.1:8771/r/<old>`
 * 200, `curl localhost:8771/r/<old>` 308. In production the host always
 * matches, so this is a property of the local preview only.
 */
const ORIGIN = `http://localhost:${WORKER_PORT}`;

const VARS: Record<string, string> = {
  SUPABASE_URL: `http://127.0.0.1:${MOCK_SUPABASE_PORT}`,
  SUPABASE_PUBLISHABLE_KEY: E2E_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: E2E_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_BASE_URL: ORIGIN,
  PARTNER_FORM_HASH_SECRET: E2E_PARTNER_FORM_HASH_SECRET,
  NEWSLETTER_SECRET: E2E_NEWSLETTER_SECRET,
  TUGGI_EDGE_SHARED_SECRET: E2E_EDGE_SHARED_SECRET,
};

const EMPTY_ENV_MODULE =
  "export const production = {}; export const development = {}; export const test = {};";

const [mockSupabase] = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig({
  ...base,
  use: {
    ...base.use,
    baseURL: ORIGIN,
    extraHTTPHeaders: { "MF-CF-Blob": "{}" },
  },
  webServer: [
    {
      ...mockSupabase!,
      env: { MOCK_SUPABASE_PORT: String(MOCK_SUPABASE_PORT), APP_PORT: String(WORKER_PORT) },
    },
    {
      command: [
        "npx opennextjs-cloudflare build",
        `node -e 'require("fs").writeFileSync(".open-next/cloudflare/next-env.mjs", ${JSON.stringify(EMPTY_ENV_MODULE)})'`,
        `npx opennextjs-cloudflare preview --port ${WORKER_PORT} --ip localhost ${Object.entries(VARS)
          .map(([key, value]) => `--var ${key}:${value}`)
          .join(" ")}`,
      ].join(" && "),
      url: `${ORIGIN}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 600_000,
      env: {
        ...VARS,
        // Inlined into the browser bundle at build time; see playwright.config.ts.
        NEXT_PUBLIC_ATTRIBUTION_IP_ORIGIN: ORIGIN,
      },
      stdout: "pipe",
    },
  ],
});
