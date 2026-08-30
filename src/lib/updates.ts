/**
 * updates.ts — the editorial registry, and the ONLY place that knows the slug
 * of an article in a given locale (spec §9).
 *
 * hreflang, the canonical, the sitemap, `/llms.txt`, the RSS feed and the share
 * card all read the pair (locale, slug) from here. Nowhere else composes an
 * article URL, and that is `DS-COMPONENTE-057`: `localizedPathname` translates
 * the *ancestor* and carries the leaf through unchanged, so
 * `"updates/" + slug` publishes `/pt/novidades/hour-passes` — a URL that 404s,
 * emitted as the Portuguese alternate of all four language versions.
 *
 * SERVER ONLY. It reads the content directory with `node:fs` at build time
 * (every consumer is static: `force-static` pages, the sitemap, the two text
 * routes and the Satori card). A client component takes a view model, never
 * this module.
 *
 * The `<id>` of a directory is stable and never appears in a URL — renaming a
 * slug is a 301, renaming an id is nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { LOCALES, type SiteLocale } from "@/i18n/locales";
import {
  EditorialContentError,
  documentShape,
  parseEditorialDocument,
  type Block,
} from "@/lib/editorial-mdx";

export const UPDATES_SECTION = "/updates";
const CONTENT_DIR = path.join(process.cwd(), "src", "content", "updates");

/** `DS-COMPONENTE-052` — above this the listing paginates by route. */
export const LISTING_CEILING = 24;
/** `DS-COMPONENTE-053` — the floor the type filter only exists above. */
export const FILTER_FLOOR = { articles: 12, perType: 3 } as const;

export type UpdateType = "release" | "news";

export interface UpdateWaiver {
  rule: string;
  reason: string;
}

/** One locale of one article. */
export interface UpdateDocument {
  id: string;
  locale: SiteLocale;
  /** The public leaf in THIS locale. */
  slug: string;
  title: string;
  summary: string;
  type: UpdateType;
  publishedAt: string;
  /** A path under `public/`, or `"generated"` (spec §6.2). */
  cover: string;
  coverAlt: string | null;
  ogAlt: string;
  waiver: UpdateWaiver[];
  blocks: Block[];
  /** Where the file came from, relative to the repo root — for error messages. */
  file: string;
}

export interface UpdateArticle {
  id: string;
  type: UpdateType;
  publishedAt: string;
  byLocale: Partial<Record<SiteLocale, UpdateDocument>>;
}

/* ---------------------------------------------------------------------------
 * Reading and validating
 * ------------------------------------------------------------------------- */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function requireString(
  frontmatter: Record<string, unknown>,
  key: string,
  file: string
): string {
  const value = frontmatter[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new EditorialContentError(file, `frontmatter \`${key}\` is missing or empty (spec §9)`);
  }
  return value.trim();
}

function readDocument(id: string, locale: SiteLocale, file: string): UpdateDocument {
  const relative = path.relative(process.cwd(), file);
  const { frontmatter, blocks } = parseEditorialDocument(fs.readFileSync(file, "utf8"), relative);

  const slug = requireString(frontmatter, "slug", relative);
  if (!SLUG.test(slug)) {
    throw new EditorialContentError(
      relative,
      `\`slug\` is "${slug}" — a slug is lower case, unaccented and hyphenated (DS-COPY-006)`
    );
  }

  const type = requireString(frontmatter, "type", relative);
  if (type !== "release" && type !== "news") {
    throw new EditorialContentError(relative, `\`type\` is "${type}"; it is "release" or "news"`);
  }

  const publishedAt = requireString(frontmatter, "publishedAt", relative);
  if (!ISO_DAY.test(publishedAt)) {
    throw new EditorialContentError(relative, `\`publishedAt\` is "${publishedAt}"; it is YYYY-MM-DD`);
  }

  const title = requireString(frontmatter, "title", relative);
  const summary = requireString(frontmatter, "summary", relative);
  const ogAlt = requireString(frontmatter, "ogAlt", relative);
  const cover = requireString(frontmatter, "cover", relative);

  // The cover carries the `alt` of a real image, or it is the generated field,
  // which is decorative and described by nothing (§6.2, §8.4).
  let coverAlt: string | null = null;
  if (cover === "generated") {
    if (frontmatter.coverAlt) {
      throw new EditorialContentError(
        relative,
        "`coverAlt` with `cover: generated` — the generated field is decorative and takes no description (spec §6.2)"
      );
    }
  } else {
    if (!cover.startsWith("/")) {
      throw new EditorialContentError(relative, `\`cover\` is "${cover}"; it is a path under public/ or "generated"`);
    }
    coverAlt = requireString(frontmatter, "coverAlt", relative);
    if (coverAlt.trim().toLowerCase() === title.trim().toLowerCase()) {
      throw new EditorialContentError(
        relative,
        "`coverAlt` repeats the title — the screen reader heard it two elements ago (spec §6.1)"
      );
    }
  }

  const waiver: UpdateWaiver[] = [];
  const declared = frontmatter.waiver;
  if (declared !== undefined) {
    if (!Array.isArray(declared)) {
      throw new EditorialContentError(relative, "`waiver` is a list of `- rule:` / `reason:` entries (DS-COPY-048)");
    }
    for (const entry of declared as Record<string, string>[]) {
      const rule = entry?.rule?.trim();
      const reason = entry?.reason?.trim();
      if (!rule) throw new EditorialContentError(relative, "a `waiver` entry has no `rule`");
      if (!reason) {
        throw new EditorialContentError(
          relative,
          `\`waiver\` for ${rule} has no \`reason\` — a dispensation whose only reason is "the test was red" is the one this rule exists to refuse (DS-COPY-048)`
        );
      }
      waiver.push({ rule, reason });
    }
  }

  return {
    id,
    locale,
    slug,
    title,
    summary,
    type,
    publishedAt,
    cover,
    coverAlt,
    ogAlt,
    waiver,
    blocks,
    file: relative,
  };
}

function readArticles(): UpdateArticle[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const articles: UpdateArticle[] = [];

  for (const id of fs.readdirSync(CONTENT_DIR).sort()) {
    const dir = path.join(CONTENT_DIR, id);
    if (!fs.statSync(dir).isDirectory()) continue;

    const byLocale: Partial<Record<SiteLocale, UpdateDocument>> = {};
    for (const locale of LOCALES) {
      const file = path.join(dir, `${locale}.mdx`);
      // An article exists in a locale if the file of that locale exists — a
      // missing translation is a state, not a defect (DS-COPY-047). What is
      // forbidden is serving one language to whoever asked for another.
      if (!fs.existsSync(file)) continue;
      byLocale[locale] = readDocument(id, locale, file);
    }

    const documents = Object.values(byLocale);
    if (!documents.length) continue;

    // `publishedAt` and `type` are properties of the article, not of a
    // translation: the four locales are the same piece (DS-COPY-047).
    const [first] = documents;
    for (const document of documents) {
      if (document.publishedAt !== first.publishedAt) {
        throw new EditorialContentError(
          document.file,
          `\`publishedAt\` is ${document.publishedAt} and ${first.file} says ${first.publishedAt} — one date per article`
        );
      }
      if (document.type !== first.type) {
        throw new EditorialContentError(
          document.file,
          `\`type\` is ${document.type} and ${first.file} says ${first.type} — one type per article`
        );
      }
    }

    // Two articles may not answer to the same URL in the same language.
    for (const document of documents) {
      const clash = articles
        .flatMap((article) => Object.values(article.byLocale))
        .find((other) => other.locale === document.locale && other.slug === document.slug);
      if (clash) {
        throw new EditorialContentError(
          document.file,
          `slug "${document.slug}" is already published in ${document.locale} by ${clash.file}`
        );
      }
    }

    articles.push({ id, type: first.type, publishedAt: first.publishedAt, byLocale });
  }

  return articles;
}

let cache: UpdateArticle[] | null = null;

/** Every article, newest first. Ties break on `id` so a build is deterministic. */
export function getUpdateArticles(): UpdateArticle[] {
  cache ??= readArticles();
  const today = new Date().toISOString().slice(0, 10);
  return cache
    // `DS-COMPONENTE-052`: the date is the publication date, not the drafting
    // date — an article dated ahead is not published yet.
    .filter((article) => article.publishedAt <= today)
    .slice()
    .sort((a, b) =>
      a.publishedAt === b.publishedAt
        ? a.id.localeCompare(b.id)
        : b.publishedAt.localeCompare(a.publishedAt)
    );
}

/* ---------------------------------------------------------------------------
 * Queries
 * ------------------------------------------------------------------------- */

/** The listing of one locale: newest first, ties on the slug of that locale. */
export function listUpdates(locale: SiteLocale): UpdateDocument[] {
  return getUpdateArticles()
    .map((article) => article.byLocale[locale])
    .filter((document): document is UpdateDocument => Boolean(document))
    .sort((a, b) =>
      a.publishedAt === b.publishedAt
        ? a.slug.localeCompare(b.slug)
        : b.publishedAt.localeCompare(a.publishedAt)
    );
}

/** The article a public leaf names in this locale, or null. */
export function findUpdate(locale: SiteLocale, slug: string): UpdateDocument | null {
  return listUpdates(locale).find((document) => document.slug === slug) ?? null;
}

/** The locales an article exists in, and the leaf it uses in each — the registry
 *  answer that `buildAlternatesForLeaf` needs (DS-COMPONENTE-057). */
export function slugsByLocale(id: string): Partial<Record<SiteLocale, string>> {
  const article = getUpdateArticles().find((candidate) => candidate.id === id);
  if (!article) return {};
  return Object.fromEntries(
    Object.entries(article.byLocale).map(([locale, document]) => [locale, document.slug])
  );
}

/**
 * The neighbours of an article inside one locale's listing — `ArticlePager`.
 *
 * Pure and list-taking so it can be proved without a content directory:
 * `previous` is the older piece and `next` the newer one, which is the order a
 * reader walking a record expects.
 */
export function pagerFor(
  listing: UpdateDocument[],
  slug: string
): { previous: UpdateDocument | null; next: UpdateDocument | null } {
  const index = listing.findIndex((document) => document.slug === slug);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: listing[index + 1] ?? null,
    next: index > 0 ? listing[index - 1] : null,
  };
}

/**
 * Whether the type filter exists in this locale — `DS-COMPONENTE-053`.
 *
 * Both conditions, per locale, because the listing is per locale. A control for
 * a list that fits in one glance is furniture.
 */
export function showsTypeFilter(listing: UpdateDocument[]): boolean {
  if (listing.length < FILTER_FLOOR.articles) return false;
  return (["release", "news"] as const).every(
    (type) => listing.filter((document) => document.type === type).length >= FILTER_FLOOR.perType
  );
}

/**
 * The publication date, in the reader's language — spec §4.2, slice 2.
 *
 * `Intl`, never a string written by hand, and **`timeZone: "UTC"`**, which is
 * not decoration: `publishedAt` is a calendar day, `new Date("2026-08-30")`
 * is midnight UTC, and formatting that in a negative offset (São Paulo, every
 * American market) publishes the 29th. The article would carry a different
 * date from its own `<time datetime>`.
 */
export function formatUpdateDate(publishedAt: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${publishedAt}T00:00:00Z`)
  );
}

/** The shape of an article per locale — what criterion 14 compares. */
export function shapesByLocale(article: UpdateArticle): Partial<Record<SiteLocale, string[]>> {
  return Object.fromEntries(
    Object.entries(article.byLocale).map(([locale, document]) => [
      locale,
      documentShape(document.blocks),
    ])
  );
}
