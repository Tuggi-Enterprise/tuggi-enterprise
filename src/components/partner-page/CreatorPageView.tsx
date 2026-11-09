import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, MapPin } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AppPreviewQr } from "@/components/blocks/AppPreview";
import { RouteMap } from "@/components/blocks/RouteMap";
import { RouteStopAudio } from "@/components/blocks/RouteStopAudio";
import { StickyCta } from "@/components/blocks/StickyCta";
import { PartnerStoreCta, PARTNER_CTA_ID } from "@/components/partner-page/PartnerStoreCta";
import { SITE_URL } from "@/lib/app-meta";
import { pickLang, type CreatorPage, type FeaturedRoute } from "@/lib/public-page";
import { AUDIO_LANG_LABELS, getAllRoutes } from "@/lib/routes";
import { formatDistance, formatDuration } from "@/lib/tourFormat";

/** Ids the in-page links and the sticky bar of the phone aim at. */
const ROUTES_ID = "routes";
const DOWNLOAD_ID = "download";

/** A stop's map, drawn only from the path: the resolver sends no stop positions. */
const NO_STOPS: never[] = [];

interface CreatorPageViewProps {
  page: CreatorPage;
  locale: string;
  /** Database language of the request (`pt-br`, `en-us`…), for the featured route and its stop. */
  dbLang: string;
  /** The moderated photo, signed for this request; null draws the initial. */
  photoUrl: string | null;
}

/** "EN", "PT-BR"… for a database language; the label set of the route player. */
function audioLabel(lang: string): string {
  const short = lang === "en-us" || lang === "es-es" || lang === "it-it" ? lang.slice(0, 2) : lang;
  return AUDIO_LANG_LABELS[short] ?? lang.toUpperCase();
}

/**
 * The creator's page, BR-B2B-067 item 2.b, as the mockup w01 draws it
 * (`docs/design/mockup-central-do-criador-2026-11/w01-pagina-criador-*.png`).
 *
 * Every block is drawn from what the resolver sent and nothing else, and a
 * block without content does not appear, not even empty; a number without a
 * base is left out, never shown as zero (DS-COMPONENTE-110). Everything that
 * decides is in the server HTML: name, bio, numbers and itineraries.
 *
 * Nothing here shows a commission, a measure of the panels or a registration
 * detail (BR-B2B-067, edge cases), and nothing promises the visitor an hour or
 * a discount (item 3). The one figure is the aggregated social proof, which
 * the database sends only from its floor up.
 */
export async function CreatorPageView({ page, locale, dbLang, photoUrl }: CreatorPageViewProps) {
  const t = await getTranslations({ locale, namespace: "PartnerPage" });
  const number = new Intl.NumberFormat(locale);
  const name = page.displayName;
  const initial = (Array.from(name.trim())[0] ?? "@").toLocaleUpperCase(locale);
  const hasRoutes = page.routes.length > 0;

  const stats = [
    hasRoutes && { value: page.routes.length, label: t("statRoutes", { count: page.routes.length }), id: "routes" },
    page.discoveredPois.length > 0 && {
      value: page.discoveredPois.length,
      label: t("statDiscovered", { count: page.discoveredPois.length }),
      id: "discovered",
    },
    page.listenersTotal !== null && {
      value: page.listenersTotal,
      label: t("statListeners", { count: page.listenersTotal }),
      id: "listeners",
    },
  ].filter((s): s is { value: number; label: string; id: string } => Boolean(s));

  return (
    <main data-lp-chrome="off" data-partner-page="creator" className="bg-white text-tuggi-dark">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="inline-flex">
            <Image src="/images/logo_tuggi_full.png" alt="Tuggi" width={96} height={28} className="h-7 w-auto" priority />
          </Link>
          <a
            href={`#${DOWNLOAD_ID}`}
            className="hidden sm:inline-flex rounded-xl bg-tuggi-secondary px-4 py-2 text-sm font-bold text-tuggi-dark hover:bg-tuggi-secondary-hover transition-colors"
          >
            {t("download")}
          </a>
        </div>
      </div>

      <section className="bg-tuggi-bg">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_448px] lg:gap-16 lg:py-14">
          <div className="min-w-0">
            <div className="flex items-center gap-4 sm:gap-5">
              {photoUrl ? (
                // A signed URL of a private bucket: next/image would fetch and keep
                // it on our side, and its allowlist only knows public objects.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={name}
                  width={96}
                  height={96}
                  data-testid="creator-photo"
                  className="h-16 w-16 sm:h-24 sm:w-24 shrink-0 rounded-full object-cover ring-4 ring-white shadow-md"
                />
              ) : (
                <span
                  aria-hidden="true"
                  data-testid="creator-initial"
                  className="flex h-16 w-16 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-800 text-3xl sm:text-5xl font-bold text-white ring-4 ring-white shadow-md"
                >
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <span className="inline-block rounded-full border border-tuggi-primary/40 bg-white px-2.5 py-0.5 text-xs font-bold text-tuggi-primary-text">
                  {t("badgeCreator")}
                </span>
                <h1 className="mt-1 flex items-center gap-2 text-3xl sm:text-5xl font-extrabold tracking-tight break-words">
                  <span className="min-w-0">{name}</span>
                  {page.verified && (
                    <BadgeCheck
                      role="img"
                      aria-label={t("verifiedA11y")}
                      className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 fill-tuggi-primary text-white"
                    />
                  )}
                </h1>
                <p className="mt-1 text-base text-tuggi-slate">@{page.name}</p>
              </div>
            </div>

            {page.bio && (
              <p data-testid="creator-bio" className="mt-6 max-w-xl whitespace-pre-line text-lg leading-relaxed text-tuggi-dark">
                {page.bio}
              </p>
            )}

            {stats.length > 0 && (
              <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
                {stats.map((s) => (
                  <div key={s.id} data-testid={`creator-stat-${s.id}`} className="flex flex-col-reverse">
                    <dt className="text-sm text-tuggi-slate">{s.label}</dt>
                    <dd className="text-3xl font-extrabold">{number.format(s.value)}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-8">
              <PartnerStoreCta
                partnerId={page.clientId}
                label={hasRoutes ? t("ctaCreator") : t("download")}
                desktopHref={`#${DOWNLOAD_ID}`}
                placement="partner_page"
                secondary={hasRoutes ? { href: `#${ROUTES_ID}`, label: t("seeRoutes") } : undefined}
              />
            </div>
          </div>

          {page.featuredRoute && (
            <FeaturedRouteCard route={page.featuredRoute} locale={locale} dbLang={dbLang} label={t("featuredRoute")} />
          )}
        </div>
      </section>

      {hasRoutes && (
        <section id={ROUTES_ID} aria-labelledby="creator-routes-title" className="mx-auto max-w-6xl px-5 py-12 lg:py-16">
          <h2 id="creator-routes-title" className="text-2xl sm:text-3xl font-extrabold">
            {t("routesTitle")}
          </h2>
          <p className="mt-2 text-base text-tuggi-slate">{t("routesSub")}</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.routes.map((route) => (
              <li key={route.id}>
                {/* The route link of the app (`/r/<slug>`, #946): the app opens it
                    when installed, and the page offers the store when not. */}
                <a
                  href={`/r/${encodeURIComponent(route.slug)}`}
                  className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-tuggi-primary transition-colors"
                >
                  <span className="text-lg font-bold leading-snug">{route.name}</span>
                  <span className="text-sm font-bold text-tuggi-primary-text">
                    {t("openInApp")} <span aria-hidden="true">›</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {page.discoveredPois.length > 0 && (
        <section aria-labelledby="creator-discovered-title" className="mx-auto max-w-6xl px-5 pb-12 lg:pb-16">
          <h2 id="creator-discovered-title" className="text-2xl sm:text-3xl font-extrabold">
            {t("discoveredTitle")}
          </h2>
          <p className="mt-2 text-base text-tuggi-slate">{t("discoveredSub")}</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.discoveredPois.map((poi) => (
              <li key={poi.id} className="rounded-2xl bg-tuggi-bg p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tuggi-primary/10">
                  <MapPin aria-hidden="true" className="h-4 w-4 text-tuggi-primary-text" />
                </span>
                <p className="mt-3 text-lg font-bold leading-snug">{poi.name}</p>
                <p className="mt-2 text-sm text-tuggi-slate">{t("discoveredBy", { name })}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id={DOWNLOAD_ID} className="bg-tuggi-dark text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
          {([1, 2, 3] as const).map((step) => (
            <div key={step}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tuggi-primary font-bold text-tuggi-dark">
                {step}
              </span>
              <h2 className="mt-4 text-lg font-bold">{t(`step${step}Title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{t(`step${step}Text`)}</p>
            </div>
          ))}
          <div className="hidden lg:block rounded-2xl bg-white p-4">
            <AppPreviewQr url={`${SITE_URL}/@${page.name}`} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-6 pb-28 md:pb-6 text-xs text-tuggi-slate">
        <p>{`tuggi.app/@${page.name}`}</p>
        <p className="mt-2">{t("storeLegal")}</p>
      </div>

      <StickyCta
        text={t("stickySub")}
        cta={t("download")}
        afterId={PARTNER_CTA_ID}
        untilId={DOWNLOAD_ID}
        placement="partner_page_sticky"
      />
    </main>
  );
}

/**
 * The featured itinerary (BR-B2B-067 item 2.b): the map of its path and the
 * preview of one stop with audio, played by tap (BR-MONETIZACAO-071 item 3).
 * The map and the player are the ones the route pages already use. It links
 * to the route's own page only when the site publishes one.
 */
async function FeaturedRouteCard({
  route,
  locale,
  dbLang,
  label,
}: {
  route: FeaturedRoute;
  locale: string;
  dbLang: string;
  label: string;
}) {
  const tTours = await getTranslations({ locale, namespace: "Tours" });
  const routeName = pickLang(route.names, dbLang)?.value ?? route.slug;
  const published = getAllRoutes().find((r) => r.id === route.id);

  const facts = [
    route.distanceKm !== null ? formatDistance(route.distanceKm * 1000, locale) : "",
    route.stopsCount !== null ? tTours("stopsCount", { count: route.stopsCount }) : "",
    route.durationMin !== null ? formatDuration(route.durationMin * 60) : "",
  ].filter(Boolean);

  const preview = route.preview;
  const previewLang = preview ? pickLang(preview.audio, dbLang) : null;
  const previewName = preview ? pickLang(preview.names, dbLang)?.value : null;

  return (
    <aside
      data-testid="featured-route"
      className="self-start overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200"
    >
      {route.path && (
        // `isolate`: Leaflet's panes carry z-indexes in the hundreds, which would
        // otherwise paint over the consent banner and the sticky bar.
        <div className="relative isolate h-80">
          <RouteMap line={route.path} stops={NO_STOPS} className="h-full w-full" />
        </div>
      )}
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-tuggi-slate">{label}</p>
        <h2 className="mt-1 text-xl font-extrabold leading-snug">
          {published ? (
            <Link
              href={{ pathname: "/tours/[country]/[slug]", params: { country: published.countrySlug, slug: published.slug } }}
              className="hover:underline underline-offset-4"
            >
              {routeName}
            </Link>
          ) : (
            routeName
          )}
        </h2>
        {facts.length > 0 && <p className="mt-1 text-sm text-tuggi-slate">{facts.join(" · ")}</p>}
        {preview && previewLang && previewName && (
          <div data-testid="featured-route-preview">
            <RouteStopAudio
              stopName={previewName}
              defaultLang={previewLang.lang}
              audios={Object.entries(preview.audio).map(([lang, audioUrl]) => ({
                lang,
                label: audioLabel(lang),
                audioUrl,
              }))}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
