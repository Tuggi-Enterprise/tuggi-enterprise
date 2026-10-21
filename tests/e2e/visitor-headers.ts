/**
 * Where a test request comes from, written so both servers of the suite read
 * the same visitor (tuggi-app#987).
 *
 * `npm run test:e2e` runs `next start`, which reads the Vercel shape: the
 * country in `x-vercel-ip-country` and the address in `x-forwarded-for`.
 * `npm run test:e2e:worker` runs the Cloudflare Worker, which reads
 * `request.cf.country` and `cf-connecting-ip` (`src/lib/cloudflare-request.ts`).
 * Locally `request.cf` comes from Miniflare's `MF-CF-Blob` header, so that is
 * how a test sets it. Each server ignores the other's headers, so one set of
 * headers serves both.
 *
 * `test.use({ extraHTTPHeaders })` REPLACES the option instead of merging it,
 * so a spec that sets its own headers has to keep the blob in them. Calling
 * this helper is how it does.
 */

import { test } from "@playwright/test";

export function visitorHeaders(
  visitor: { country?: string; address?: string } = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    "MF-CF-Blob": JSON.stringify(visitor.country ? { country: visitor.country } : {}),
  };
  if (visitor.country) headers["x-vercel-ip-country"] = visitor.country;
  if (visitor.address) {
    headers["x-forwarded-for"] = visitor.address;
    headers["cf-connecting-ip"] = visitor.address;
  }
  return headers;
}

/**
 * The host a cookie has to name to reach the app under test: `127.0.0.1` for
 * `next start`, `localhost` for the Worker preview (see
 * playwright.worker.config.ts for why). Cookies ignore the port.
 */
export function appCookieDomain(): string {
  return new URL(test.info().project.use.baseURL!).hostname;
}
