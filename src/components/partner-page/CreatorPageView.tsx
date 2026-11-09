import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import { Link } from "@/i18n/routing";
import { RouteMap } from "@/components/blocks/RouteMap";
import { RouteStopAudio } from "@/components/blocks/RouteStopAudio";
import { PartnerStoreCta } from "@/components/partner-page/PartnerStoreCta";
import { PARTNER_DOWNLOAD_ID, PartnerIdentity, PartnerPageFrame } from "@/components/partner-page/PartnerPageFrame";
import { creatorPhotoSrc, pickLang, type CreatorPage, type FeaturedRoute, type PublicRoute } from "@/lib/public-page";
import { AUDIO_LANG_LABELS, getAllRoutes, type RouteSnapshot } from "@/lib/routes";
import { formatDistance, formatDuration } from "@/lib/tourFormat";

/** Id the "see the itineraries" link aims at. */
const ROUTES_ID = "routes";

/** A stop's map, drawn only from the path: the resolver sends no stop positions. */
const NO_STOPS: never[] = [];

interface CreatorPageViewProps {
  page: CreatorPage;
  locale: string;
  /** Database language of the request (`pt-br`, `en-us`…), for the featured route and its stop. */
  dbLang: string;
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
export async function CreatorPageView({ page, locale, dbLang }: CreatorPageViewProps) {
  const t = await getTranslations({ locale, namespace: "PartnerPage" });
  const number = new Intl.NumberFormat(locale);
  const name = page.displayName;
  const initial = (Array.from(name.trim())[0] ?? "@").toLocaleUpperCase(locale);
  const hasRoutes = page.routes.length > 0;
  // The moderated photo by the public @, never a storage address; null draws the initial.
  const photoUrl = creatorPhotoSrc(page);

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

  const hero = (
    <>
      <PartnerIdentity
        media={
          photoUrl ? (
            // A route of this site that reads a private bucket per request:
            // next/image would keep its own copy past the removal of the photo.
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
          )
        }
        chip={t("badgeCreator")}
        name={name}
        verifiedLabel={page.verified ? t("verifiedA11y") : undefined}
        subline={`@${page.name}`}
      />

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
          desktopHref={`#${PARTNER_DOWNLOAD_ID}`}
          placement="partner_page"
          secondary={hasRoutes ? { href: `#${ROUTES_ID}`, label: t("seeRoutes") } : undefined}
        />
      </div>
    </>
  );

  return (
    <PartnerPageFrame
      locale={locale}
      kind="creator"
      path={`/@${page.name}`}
      hero={hero}
      aside={
        page.featuredRoute && (
          <FeaturedRouteCard route={page.featuredRoute} locale={locale} dbLang={dbLang} label={t("featuredRoute")} />
        )
      }
    >
      {hasRoutes && (
        <section id={ROUTES_ID} aria-labelledby="creator-routes-title" className="mx-auto max-w-6xl px-5 py-12 lg:py-16">
          <h2 id="creator-routes-title" className="text-2xl sm:text-3xl font-extrabold">
            {t("routesTitle")}
          </h2>
          <p className="mt-2 text-base text-tuggi-slate">{t("routesSub")}</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.routes.map((route) => (
              <li key={route.id}>
                <RouteCard route={route} locale={locale} openLabel={t("openInApp")} />
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
    </PartnerPageFrame>
  );
}

/** The published snapshot of an itinerary, when the site has one: what a card can say beyond the name. */
const snapshotOf = (routeId: string): RouteSnapshot | undefined => getAllRoutes().find((r) => r.id === routeId);

/**
 * One itinerary of the grid. The resolver sends only the name; distance, stops,
 * duration and the description come from the route snapshot of the site, when
 * the itinerary is published there, and are left out when it is not. The
 * snapshot does not carry walk or drive, so the card shows no mode.
 */
async function RouteCard({ route, locale, openLabel }: { route: PublicRoute; locale: string; openLabel: string }) {
  const snapshot = snapshotOf(route.id);
  const tTours = await getTranslations({ locale, namespace: "Tours" });
  const facts = snapshot
    ? [
        formatDistance(snapshot.distanceM, locale),
        snapshot.stopsCount > 0 ? tTours("stopsCount", { count: snapshot.stopsCount }) : "",
        formatDuration(snapshot.durationS),
      ].filter(Boolean)
    : [];
  const description = snapshot?.i18n[locale]?.description?.trim() || null;

  return (
    // The route link of the app (`/r/<slug>`, #946): the app opens it when
    // installed, and the page offers the store when not.
    <a
      href={`/r/${encodeURIComponent(route.slug)}`}
      data-testid="creator-route-card"
      className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-tuggi-primary transition-colors"
    >
      <span>
        <span className="block text-lg font-bold leading-snug">{route.name}</span>
        {facts.length > 0 && (
          <span data-testid="creator-route-facts" className="mt-1 block text-sm text-tuggi-slate">
            {facts.join(" · ")}
          </span>
        )}
        {description && (
          <span data-testid="creator-route-description" className="mt-3 text-sm leading-relaxed text-tuggi-dark line-clamp-3">
            {description}
          </span>
        )}
      </span>
      <span className="text-sm font-bold text-tuggi-primary-text">
        {openLabel} <span aria-hidden="true">›</span>
      </span>
    </a>
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
  const published = snapshotOf(route.id);

  const facts = [
    route.distanceKm !== null ? formatDistance(route.distanceKm * 1000, locale) : "",
    route.stopsCount !== null ? tTours("stopsCount", { count: route.stopsCount }) : "",
    route.durationMin !== null ? formatDuration(route.durationMin * 60) : "",
  ].filter(Boolean);

  const preview = route.preview;
  const previewLang = preview ? pickLang(preview.audio, dbLang) : null;
  const previewName = preview ? pickLang(preview.names, dbLang)?.value : null;
  // The stop's place in the itinerary, from the snapshot's ordered stops; the
  // resolver does not send it, so without the snapshot the number is left out.
  const stopIndex = preview && published ? published.stops.findIndex((s) => s.attractionId === preview.poiId) : -1;
  const tPage = await getTranslations({ locale, namespace: "PartnerPage" });
  const stopTitle =
    previewName && stopIndex >= 0 ? `${tPage("stopLabel", { number: stopIndex + 1 })} · ${previewName}` : previewName;

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
              stopName={stopTitle ?? previewName}
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
