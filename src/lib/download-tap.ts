import { VISIT_UTM_KEYS, type VisitUtm } from "@/lib/store-click";

/**
 * A tap on the download button of `tuggi.app/@nome` or `/d/{slug}`,
 * BR-B2B-068 item 2.f: counted by the server like the opening of the page
 * (2.e), never for a declared robot, without deduplicating the person, and
 * never presented as an install. Contract `docs/contracts/metricas-do-parceiro.md` §3.
 *
 * The browser only tells the server that a tap happened: `sendDownloadTap`
 * posts a beacon and the link goes to the store exactly as before, with its
 * Play referrer, its App Store campaign and the pasteboard written inside the
 * gesture (BR-B2B-002, BR-B2B-040). A redirect through this server was the
 * other way and was not taken: it would rewrite every store href of the page
 * and add a hop before the store, and a crawler following hrefs would count
 * as a tap. A beacon is sent by a person's tap and by nothing that only reads
 * the HTML.
 *
 * Pure on purpose: no React and no Next import, so the route and a spec can
 * share the parser.
 */

/** The two doors of the partner page, `p_via` of the visit and of the tap. */
export const PARTNER_PAGE_VIAS = ["at_name", "d_slug"] as const;
export type PartnerPageVia = (typeof PARTNER_PAGE_VIAS)[number];

export const DOWNLOAD_TAP_ENDPOINT = "/api/download-tap";

/** The page that counts its taps: the client the opening was counted for, and the door. */
export interface DownloadTapTarget {
  clientId: string;
  via: PartnerPageVia;
}

export interface DownloadTap extends DownloadTapTarget {
  utm: VisitUtm;
}

/** Past this the body is not a tap of the page. */
export const DOWNLOAD_TAP_MAX_BODY_BYTES = 2048;
/**
 * The longest UTM value the route forwards. The database keeps 100 characters
 * (`partner.normalize_utm`) and cuts the rest; this only refuses a body that
 * no link of a partner produces.
 */
export const DOWNLOAD_TAP_MAX_UTM_CHARS = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isVia = (value: unknown): value is PartnerPageVia =>
  typeof value === "string" && (PARTNER_PAGE_VIAS as readonly string[]).includes(value);

/** The tap a body describes, or null when it is not one (the route answers 400). */
export function parseDownloadTap(raw: string): DownloadTap | null {
  if (raw.length > DOWNLOAD_TAP_MAX_BODY_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { clientId, via, utm } = body as Record<string, unknown>;
  if (typeof clientId !== "string" || !UUID.test(clientId) || !isVia(via)) return null;

  const tags: VisitUtm = {};
  if (utm !== undefined && utm !== null) {
    if (typeof utm !== "object" || Array.isArray(utm)) return null;
    for (const key of VISIT_UTM_KEYS) {
      const value = (utm as Record<string, unknown>)[key];
      if (value === undefined || value === null) continue;
      if (typeof value !== "string" || value.length > DOWNLOAD_TAP_MAX_UTM_CHARS) return null;
      if (value) tags[key] = value;
    }
  }
  return { clientId: clientId.toLowerCase(), via, utm: tags };
}

/**
 * Tells the server of one tap, without holding the link: a beacon survives the
 * store opening, and a refused or failed one costs one count and never the
 * download. `text/plain` (a string body) keeps the beacon a simple request.
 */
export function sendDownloadTap(target: DownloadTapTarget, utm: VisitUtm): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ clientId: target.clientId, via: target.via, utm });
  try {
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(DOWNLOAD_TAP_ENDPOINT, body)) return;
    void fetch(DOWNLOAD_TAP_ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Counting is best effort: the store opens either way.
  }
}
