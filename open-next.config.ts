import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * The incremental cache of the Worker (tuggi-app#987), the same envelope that
 * runs in production on reserve-on-site.
 *
 * THE DEFAULT IS NOT AN EMPTY CACHE. With no argument, `defineCloudflareConfig`
 * resolves to the `dummy` cache of `@opennextjs/aws`, whose `get` throws
 * `IgnorableError('"Dummy" cache does not cache anything')`. Every statically
 * generated page (the `●` routes of the build table) is served from this cache,
 * so the default answers 500 on all of them.
 *
 * `static-assets` serves the prerendered output from the Workers Static Assets
 * behind the `ASSETS` binding that wrangler.jsonc already declares: no R2, no
 * KV, nothing to create on the account. It is READ-ONLY, so a statically
 * generated page shows the content of the last build until the next deploy.
 * The way out of that, if it ever stops being acceptable, is the R2 cache, and
 * that needs a bucket created by the operator.
 *
 * IT HAS TO BE THE IMPORTED OBJECT, NOT THE STRING. The cache population step
 * compares the resolved `name` with `cf-static-assets-incremental-cache`; the
 * string `"static-assets"` falls through its `switch` and the cache is not
 * populated, with no error at build time.
 *
 * A PAGE NEVER GOES STALE HERE, on purpose. This cache answers `lastModified`
 * as the build time. Past a route's `revalidate`, Next serves the stale copy
 * and regenerates it in the same request; `set` fails on a read-only cache, so
 * every later request would regenerate again and pay the full render in CPU.
 * The page `get` reports "now" so the build copy never expires. Pages only:
 * `fetch` entries keep their real age and are fetched again on time.
 */
const incrementalCache: Pick<typeof staticAssetsCache, "name" | "get" | "set" | "delete"> = {
  name: staticAssetsCache.name,
  async get(key, cacheType) {
    const entry = await staticAssetsCache.get(key, cacheType);
    if (!entry || cacheType === "fetch") return entry;
    return { ...entry, lastModified: Date.now() };
  },
  set: (key, value, cacheType) => staticAssetsCache.set(key, value, cacheType),
  delete: () => staticAssetsCache.delete(),
};

export default defineCloudflareConfig({ incrementalCache });
