/**
 * A file of `public/` as a `data:` URL, for the Open Graph cards that draw
 * our own images with `next/og` (tuggi-app#987).
 *
 * THE FILESYSTEM IS NOT THERE ON THE WORKER. The three card modules used to
 * read their image with `readFile(join(process.cwd(), "public", ...))` at
 * module scope. On Node that works at build and at request time. On the
 * Cloudflare Worker `public/` is not a directory: OpenNext publishes it as
 * Workers Static Assets, behind the `ASSETS` binding of wrangler.jsonc. And
 * because the read sat at module scope, it ran whenever Next loaded the module
 * to collect the page metadata, so the failure took down the PAGE, not just
 * the card: `/d/<slug>` and `/coverage` answered 500 on the Worker preview.
 *
 * So the read is lazy, inside the card, and it asks the host that has the
 * file: `ASSETS.fetch` on the Worker, the filesystem everywhere else (the
 * build, `next start`, Vercel during the cut-over). Memoised per path: the
 * files only change with a deploy.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The part of the Workers `Fetcher` used here. */
type AssetsBinding = { fetch(input: string): Promise<Response> };

/**
 * The Worker's static-assets binding, or `null` off the Worker. The host of
 * the URL is ignored by the binding; only the path is matched.
 */
function workerAssets(): AssetsBinding | null {
  try {
    const env = getCloudflareContext().env as { ASSETS?: AssetsBinding };
    return env.ASSETS ?? null;
  } catch {
    return null;
  }
}

async function readPublicFile(path: string): Promise<Buffer> {
  const assets = workerAssets();
  if (!assets) return readFile(join(process.cwd(), "public", path));

  const response = await assets.fetch(`https://assets.local/${path}`);
  if (!response.ok) {
    throw new Error(`[public-asset] ${path} answered ${response.status} from ASSETS`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const cache = new Map<string, Promise<string>>();

/**
 * @param path Relative to `public/`, without a leading slash.
 * @param mimeType The type the `data:` URL declares.
 */
export function publicAssetDataUrl(path: string, mimeType: string): Promise<string> {
  let pending = cache.get(path);
  if (!pending) {
    pending = readPublicFile(path).then(
      (bytes) => `data:${mimeType};base64,${bytes.toString("base64")}`
    );
    // A failed read is not cached: the next card tries again.
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  return pending;
}
