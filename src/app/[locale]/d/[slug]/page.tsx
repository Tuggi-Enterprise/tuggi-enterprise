import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { ClientPartnerPage } from "@/components/partner-page/ClientPartnerPage";
import { CreatorPageView } from "@/components/partner-page/CreatorPageView";
import { lookupPartnerSlug, type PartnerSlugResult } from "@/lib/partner";
import { kitPieceOf, recordActivationScan } from "@/lib/activation-scan";
import { clientPageMetadata, creatorPageMetadata } from "@/lib/partner-page-metadata";
import {
  recordPageVisit,
  resolvePublicPage,
  type ClientPage,
  type PublicPage,
} from "@/lib/public-page";
import { requestWelcomeLang } from "@/lib/request-welcome-lang";

/**
 * What the one resolver of the partner page says about this slug (BR-B2B-037
 * item 2), or null when it could not answer: then this page does what it did
 * before the resolver existed, from `lookupPartnerSlug` alone. A printed QR
 * keeps working through a database hiccup.
 */
async function publicPageOf(slug: string): Promise<PublicPage | null> {
  try {
    return await resolvePublicPage(slug);
  } catch (err) {
    console.error("Error resolving the partner page of a /d/ slug:", err);
    return null;
  }
}

const isCoupon = (resolved: PartnerSlugResult | null): boolean =>
  resolved?.kind === "partner" && !!resolved.coupon;

/**
 * The resolver's client page for the partner `/d/` resolved, when both name
 * the same client. Null for a coupon (its own door, BR-MONETIZACAO-015) and
 * for a slug the resolver does not know: those keep today's behaviour.
 */
function clientPageOf(page: PublicPage | null, resolved: PartnerSlugResult | null): ClientPage | null {
  if (resolved?.kind !== "partner" || resolved.coupon) return null;
  if (page?.state !== "page" || page.kind !== "client") return null;
  return page.clientId === resolved.partner.id ? page : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { lang } = await searchParams;
  const dbLang = await requestWelcomeLang(locale, lang);
  const [resolved, page] = await Promise.all([lookupPartnerSlug(slug, dbLang), publicPageOf(slug)]);

  // The same page as `/@nome`, canonical there (DS-COMPONENTE-110).
  if (!isCoupon(resolved) && page?.state === "page" && page.kind === "creator") {
    return creatorPageMetadata(locale, page);
  }

  // Unknown slug → the page still serves the plain download LP (see below),
  // and that LP is the same on every dead slug: keep it out of the index.
  // A reserved slug (`soon`) is not public until approval, and a `retired` one
  // never will be (#815, direction of 2026-10-04): same treatment.
  if (!resolved || resolved.kind !== "partner") {
    return { robots: { index: false, follow: false } };
  }

  const client = clientPageOf(page, resolved);
  return clientPageMetadata(locale, resolved.partner, slug, client ? `/@${client.name}` : `/d/${slug}`);
}

/**
 * THIS PAGE IS RENDERED ON EVERY REQUEST, AND MUST STAY SO (#987). It reads
 * the visitor's country and cookies for the welcome language, `?lang` and
 * `?k`, counts the kit scan and the page opening of each visit. A stored copy
 * would freeze the language of its first visitor and stop counting. What is
 * kept is the partner read underneath (`lookupPartnerSlug`), for at most 5
 * minutes per slug and language: that is how long an edit or a deactivation in
 * the CMS takes to show here.
 *
 * It is the printed door of the partner page: the same page as `/@nome`, from
 * the same resolver and the same components (BR-B2B-037 item 2).
 */
export default async function PartnerSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const query = await searchParams;
  const { k } = query;
  const lang = typeof query.lang === "string" ? query.lang : undefined;
  setRequestLocale(locale);

  // A kit QR carries `?k={piece}` (#815): count it before the render, without
  // letting the count delay or break the page. The function itself refuses an
  // unknown or retired slug.
  const piece = kitPieceOf(k);
  const scan = piece ? recordActivationScan(slug, piece, new Headers(await headers())) : null;

  const dbLang = await requestWelcomeLang(locale, lang);
  const [resolved, page] = await Promise.all([lookupPartnerSlug(slug, dbLang), publicPageOf(slug), scan]);
  const requestHeaders = new Headers(await headers());

  // The printed slug is not the client's own (the client inherited another one,
  // or the URL differs in case): it keeps resolving, as a permanent redirect —
  // BR-B2B-037 item 4. `k` is dropped, it was counted above. Everything else
  // travels: `lang`, and the `utm_*` of the visit, which the store links and
  // the store click of the target page read (#1060).
  if (resolved?.kind === "redirect") {
    const forwarded = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "k" || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) forwarded.append(key, item);
    }
    const search = forwarded.toString();
    permanentRedirect(`/d/${encodeURIComponent(resolved.slug)}${search ? `?${search}` : ""}`);
  }

  // One resolver, two doors (BR-B2B-037 item 2): a creator's name after `/d/`
  // shows the creator's page, counted as a `/d/` opening.
  if (!isCoupon(resolved) && page?.state === "page" && page.kind === "creator") {
    await recordPageVisit(page.clientId, "d_slug", requestHeaders);
    return <CreatorPageView page={page} locale={locale} dbLang={dbLang} />;
  }

  // An old @ or another spelling the resolver knows and `/d/` does not: the
  // canonical page, where the same partner is credited (BR-B2B-067 item 4).
  if (!resolved && page?.state === "redirect") {
    permanentRedirect(`/@${encodeURIComponent(page.to)}`);
  }

  /**
   * A SLUG THAT NO LONGER RESOLVES STILL GETS THE APP — BR-B2B-001.
   *
   * This used to `notFound()`, and the 404 offers the home page and support:
   * no store link anywhere on it. But the person reading it is holding a
   * printed QR in a restaurant — a partner who left, a slug that was renamed,
   * a card printed with a typo — and they wanted the app, not the company.
   * Sending them to a 404 loses the install; the QR only ever attributed, so
   * losing the attribution is not a reason to lose the download too.
   *
   * It renders the plain download page, the same one `/download` serves with
   * no partner: no partner name, no capture, no referrer — nothing is credited
   * to a partner we could not resolve. `generateMetadata` keeps it out of the
   * index, which is what stops `/d/<anything>` from becoming an unbounded
   * surface of thin pages. The 404 of BR-B2B-067 item 5 is the `/@` door's;
   * the printed one keeps this (item 6 leaves `/d/` as it is).
   */
  // `retired` (a rejected place) gets exactly this page too: neutral, it does
  // not name the place (#815, direction of 2026-10-04, item 4).
  if (!resolved || resolved.kind === "retired") {
    return (
      <main>
        <PartnerHeroWrapper partnerData={null} />
      </main>
    );
  }

  // `soon`: the place sent its registration and printed its kit before the
  // approval (BR-B2B-050 item 1). The QR lands on the download page with one
  // line saying the place is on its way — no date promised, nothing credited.
  if (resolved.kind === "soon") {
    const t = await getTranslations({ locale, namespace: "Download" });
    return (
      <main>
        <p
          data-testid="partner-slug-soon"
          className="px-6 pt-24 text-center text-base font-semibold text-tuggi-dark"
        >
          {t("soonNotice")}
        </p>
        <PartnerHeroWrapper partnerData={null} />
      </main>
    );
  }

  const { partner, coupon } = resolved;

  // The resolver's answer decides the capture (BR-B2B-067 items 3 and 6: a
  // client whose contract ended stops attributing) and counts the opening
  // (item 7). A slug it does not know, and a coupon, keep today's behaviour.
  const client = clientPageOf(page, resolved);
  if (client) await recordPageVisit(client.clientId, "d_slug", requestHeaders);

  return (
    <ClientPartnerPage
      locale={locale}
      partner={partner}
      coupon={coupon}
      slug={slug}
      path={client ? `/@${client.name}` : `/d/${slug}`}
      attributes={client ? client.attributes : true}
      verified={client?.verified ?? false}
    />
  );
}
