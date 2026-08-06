/**
 * Partner segment registry.
 *
 * Spec: docs/design/spec-template-segmento-2026-08.md §1 and §8.4.
 * Rule: DS-COMPONENTE-005 — a surface that repeats per variant is one page
 * file plus one registry; adding variant N+1 touches the registry and the four
 * message files, and nothing under src/app/ or src/components/.
 *
 * Two properties this file has to keep, and both are load-bearing:
 *
 *  1. **Pure data, no `server-only`, no React.** `src/i18n/pathnames.ts` reads
 *     it, `routing.ts` reads that, and `routing.ts` runs in the edge runtime
 *     through the middleware. `next.config.ts` reads it too, to derive the 301s.
 *  2. **No translated word lives here.** Copy belongs in
 *     `src/messages/{pt,en,es,it}.json` (DS-COPY-001). What the registry holds
 *     is structure and reference — that is what makes a new segment cost
 *     content rather than code.
 *
 * The slug is the one exception, and it is not copy: it is the URL, and
 * DS-COPY-006 fixes its shape (lower case, no accent, no space) and its life
 * cycle (once indexed, it only changes with a 301).
 */
// Relative, not "@/": next.config.ts reaches this module through
// src/i18n/pathnames.ts and does not resolve the tsconfig path alias.
import type { SiteLocale } from "../i18n/locales";

/**
 * Commercial models a public surface may state today.
 *
 * 'wholesale' and 'voucher' exist as a commercial conversation and are NOT
 * published — BR-B2B-009 item 1. Their absence is a decision, not a gap.
 * Adding an entry here requires a new BR-*, which is why the list is the type:
 * `businessModels: ['wholesale']` is a compile error, not a review finding.
 */
export const PUBLISHABLE_MODELS = ["commission"] as const;

export type BusinessModelKey = (typeof PUBLISHABLE_MODELS)[number];

export type SegmentKey =
  | "car-rental"
  | "lodging"
  | "transfer"
  | "motorhome"
  | "restaurants";

type SegmentBase = {
  /**
   * Stable identifier. Never translated, never renamed once published: it is
   * the i18n key, the GA event value and the `?segment=` contact parameter.
   */
  key: SegmentKey;

  /**
   * Slug per locale — all four are required (BR-IDIOMA-001 item 3).
   * A missing locale is a URL that 404s, not a fallback.
   * Single source of the `pathnames` map — see src/i18n/pathnames.ts.
   */
  slugs: Record<SiteLocale, string>;

  /** Lucide icon (DS-COMPONENTE-004). Used by the hub card and the hero. */
  icon: keyof typeof import("lucide-react");

  /**
   * Commercial models assembled in block 5. Absent ⇒ ['commission'].
   * Only a key present in PUBLISHABLE_MODELS is accepted.
   */
  businessModels?: BusinessModelKey[];

  /**
   * How many questions the objections block has in the i18n files.
   * Absent ⇒ 0 ⇒ the block does not render: no orphan heading, no empty box.
   */
  objections?: number;

  /** Optional hero capture, under /public. Absent ⇒ single-column hero. */
  heroImage?: string;

  /** Position in the hub. */
  order: number;
};

/**
 * A segment.
 *
 * `published` has no default on purpose: publishing by forgetfulness is the
 * defect. And `audioSamples` is required exactly when `published` is true —
 * a partner page without the product playing does not go live (spec §1.1).
 * The union is what makes the compiler say so.
 */
export type Segment =
  | (SegmentBase & {
      published: true;
      /** Ids from the audio sample catalogue. The tuple guarantees at least one. */
      audioSamples: [string, ...string[]];
    })
  | (SegmentBase & {
      published: false;
      audioSamples?: [string, ...string[]];
    });

/**
 * The five segments.
 *
 * All five are `published: false` in this phase: the segment template and its
 * copy do not exist yet, and a declared route with no page is a 404 — which is
 * the honest answer — while a published one would be an empty page.
 *
 * `restaurants` is different in kind, not in degree: it is a **reserved**
 * route (spec §1.2). The word is decided so that publishing it later costs no
 * URL change and no 301, but the page is not planned. It does not enter the
 * active `pathnames` map, it 404s, it stays out of the sitemap, and it gets
 * **no redirect** — redirecting a URL that was never published recovers
 * nothing and hides a typo from whoever is testing.
 */
export const SEGMENTS: readonly Segment[] = [
  {
    key: "car-rental",
    slugs: {
      pt: "parcerias/locadoras",
      en: "partners/car-rental",
      es: "alianzas/alquiler-de-coches",
      it: "partner/autonoleggio",
    },
    icon: "Car",
    published: false,
    order: 1,
  },
  {
    key: "lodging",
    slugs: {
      pt: "parcerias/hospedagem",
      en: "partners/lodging",
      es: "alianzas/alojamiento",
      it: "partner/strutture-ricettive",
    },
    icon: "BedDouble",
    published: false,
    order: 2,
  },
  {
    key: "transfer",
    slugs: {
      pt: "parcerias/transfer",
      en: "partners/transfer",
      es: "alianzas/traslados",
      it: "partner/transfer",
    },
    icon: "CarTaxiFront",
    published: false,
    order: 3,
  },
  {
    key: "motorhome",
    slugs: {
      pt: "parcerias/motorhome",
      en: "partners/motorhome",
      es: "alianzas/autocaravanas",
      it: "partner/camper",
    },
    icon: "Caravan",
    published: false,
    order: 4,
  },
  {
    key: "restaurants",
    slugs: {
      pt: "parcerias/restaurantes",
      en: "partners/restaurants",
      es: "alianzas/restaurantes",
      it: "partner/ristoranti",
    },
    icon: "UtensilsCrossed",
    published: false,
    order: 5,
  },
];

/** The internal (untranslated) pathname of a segment page. */
export function segmentPathname(key: SegmentKey): string {
  return `/partners/${key}`;
}
