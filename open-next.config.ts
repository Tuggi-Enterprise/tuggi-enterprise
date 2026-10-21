import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

/**
 * The cache of the Worker (tuggi-app#987). Shape from
 * opennext.js.org/cloudflare/caching, consulted 2026-10-20, for the installed
 * @opennextjs/cloudflare 1.20.12.
 *
 * The rule it serves, from the operator: what is fixed comes ready from the
 * build; what is dynamic is made on the first request and kept for the next
 * ones; what is truly per visitor stays per request.
 *
 * THE DEFAULT IS NOT AN EMPTY CACHE. With no argument, `defineCloudflareConfig`
 * resolves to the `dummy` cache of `@opennextjs/aws`, whose `get` throws. Every
 * statically generated page is served from this cache, so the default answers
 * 500 on all of them.
 *
 * R2 BECAUSE IT WRITES. The `static-assets` cache that ran here first is
 * read-only: it served what the build wrote and nothing else, so a partner
 * approved after the deploy had its share card drawn again on every request,
 * and no data read could be kept. R2 keeps what a request produced (the
 * `NEXT_INC_CACHE_R2_BUCKET` binding in wrangler.jsonc), and `deploy` fills it
 * with the build output before publishing (the `populateCache` step that
 * `opennextjs-cloudflare deploy` runs, also when Workers Builds calls
 * `wrangler deploy`, which hands over to it).
 *
 * THE ENVELOPE THAT REPORTED EVERY PAGE AS NEW IS GONE ON PURPOSE. It came
 * from reserve-on-site and existed for the read-only cache: past a route's
 * `revalidate`, Next served the build copy and rendered it again in the same
 * request; `set` could not save the result, so every later request rendered
 * again, paying the full render in CPU. Answering `lastModified` as "now" made
 * the build copy never expire. With R2 the new render is saved, the next
 * request reads it, and the real age is what lets the 5 minutes of the
 * partner card and the partner read expire at all.
 *
 * REGIONAL CACHE IN FRONT OF R2. An R2 bucket lives in one region, and every
 * statically generated page now comes from it instead of the static assets
 * served at the edge. The doc's answer is this wrapper: a copy in the Cache
 * API of the data center, keyed by build, refreshed from R2 in the background
 * on each hit (the Next 16 default of the installed adapter). It keeps the
 * entry's own `lastModified`, so it adds no staleness. The Cache API only
 * works on a custom domain; on `workers.dev` this is R2 alone.
 *
 * THE QUEUE IS THE DURABLE OBJECT ONE. Time-based revalidation (a `revalidate`
 * export, such as the partner share card) needs a queue, and without one the
 * stale copy is served forever. The doc names the memory queue "not fully
 * suitable for production" and points to this one; it deduplicates a route
 * that many requests find stale at once, across isolates, where the memory
 * queue only does it per isolate.
 *
 * NO TAG CACHE. It serves `revalidateTag` and `revalidatePath`, and the site
 * calls neither; time-based revalidation only needs the queue.
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
});
