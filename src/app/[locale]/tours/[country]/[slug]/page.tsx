import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import {
  countryName,
  getRoute,
  getRoutesForLocale,
  pickLocaleContent,
  pickStopContent,
  relatedRoutes,
  siteLocaleToAudioLang,
  stopAudios,
} from "@/lib/routes";
import {
  buildAlternatesFor,
  buildOpenGraph,
  buildTwitterCard,
  buildUrl,
  defaultRobots,
} from "@/lib/seo";
import { formatDistance, formatDuration } from "@/lib/tourFormat";
import { languageLabelsFor, toRouteCardVM } from "@/lib/tourView";
import { RouteHero } from "@/components/blocks/RouteHero";
import { RouteExplorer } from "@/components/blocks/RouteExplorer";
import { type RouteStopView } from "@/components/blocks/RouteStops";
import { RouteFaq, type FaqItem } from "@/components/blocks/RouteFaq";
import { RelatedRoutes } from "@/components/blocks/RelatedRoutes";
import { AppDownloadButton } from "@/components/blocks/AppDownloadButton";
import { StickyCta } from "@/components/blocks/StickyCta";

export const dynamicParams = false;

type Params = { locale: string; country: string; slug: string };

function clamp(text: string, max = 200): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Seconds → ISO 8601 duration ("PT7H37M"), the only form schema.org reads. */
function isoDuration(seconds: number | null): string | null {
  if (seconds == null || !isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}` || null;
}

export function generateStaticParams(): Params[] {
  const params: Params[] = [];
  for (const locale of routing.locales) {
    for (const route of getRoutesForLocale(locale)) {
      params.push({ locale, country: route.countrySlug, slug: route.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, country, slug } = await params;
  const route = getRoute(country, slug);

  if (!route || !route.locales.includes(locale)) {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "Tours" });
  const content = pickLocaleContent(route, locale);
  const pagePath = `tours/${country}/${slug}`;

  // SERP-friendly <title>: route names are long marketing strings, so use the
  // headline before the em-dash (usually the place) + the target keyword, so
  // the title stays under ~60 chars and leads with high-intent terms.
  const headline = content.name.split(/\s[—–-]\s/)[0].trim();
  const titleBase =
    headline.length >= 5 && headline.length <= 48 ? headline : clamp(content.name, 48);
  const title = t("metaTitle", { name: titleBase });
  const description = content.description
    ? clamp(content.description)
    : t("metaDescFallback", { place: route.region || countryName(route, locale) });

  return {
    title,
    description,
    alternates: buildAlternatesFor(locale, pagePath, route.locales),
    robots: defaultRobots,
    // Social cards can carry the full marketing name (no strict length limit).
    openGraph: buildOpenGraph({
      title: t("metaTitle", { name: content.name }),
      description,
      locale,
      pagePath,
    }),
    twitter: buildTwitterCard({ title: content.name, description }),
  };
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, country, slug } = await params;
  setRequestLocale(locale);

  const route = getRoute(country, slug);
  if (!route || !route.locales.includes(locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Tours" });
  const content = pickLocaleContent(route, locale);
  const countryLabel = countryName(route, locale);
  const placeLabel = route.region || countryLabel;
  const pageUrl = buildUrl(locale, `tours/${country}/${slug}`);
  const distanceStr = formatDistance(route.distanceM, locale);
  const durationStr = formatDuration(route.durationS);
  const languageLabels = languageLabelsFor(route.locales);

  // ── Stops view (localized description + audio, base name) ──────────────────
  const defaultLang = siteLocaleToAudioLang(locale, country);
  const stopViews = route.stops.map((stop, i) => {
    const stopContent = pickStopContent(stop, locale, country);
    const audios = stopAudios(stop);
    const description = stopContent?.description ?? "";
    return {
      position: i + 1,
      name: stop.name,
      description,
      audios,
      hasContent: Boolean(description) || audios.length > 0,
    };
  });

  // Consecutive stops with the same name AND text collapse into one entry: the
  // catalogue carries a handful of these (distinct POIs a couple of hundred
  // metres apart sharing a name and description). Showing the same block twice
  // reads as a bug; the merged positions keep their anchors.
  const stops: RouteStopView[] = [];
  for (const view of stopViews) {
    const previous = stops[stops.length - 1];
    if (
      previous &&
      previous.name === view.name &&
      previous.description === view.description
    ) {
      previous.alsoPositions.push(view.position);
      continue;
    }
    stops.push({ ...view, alsoPositions: [], defaultLang });
  }

  const mapStops = route.stops.map((s, i) => ({
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    hasContent: stopViews[i].hasContent,
  }));

  // ── FAQ (genuine, data-driven) ─────────────────────────────────────────────
  const faqItems: FaqItem[] = [];
  faqItems.push({
    question: t("faq.duration.q"),
    answer: t("faq.duration.a", {
      duration: durationStr || t("facts.varies"),
      distance: distanceStr || "—",
      // The real stop count — `stops` is the merged view, which is shorter.
      stops: route.stops.length,
    }),
  });
  if (route.accessibility && route.accessibility !== "unknown") {
    faqItems.push({
      question: t("faq.accessibility.q"),
      answer: t("faq.accessibility.a", { level: t(`accessibility.${route.accessibility}`) }),
    });
  }
  faqItems.push({
    question: t("faq.languages.q"),
    answer: t("faq.languages.a", { languages: languageLabels.join(", ") }),
  });
  faqItems.push({ question: t("faq.offline.q"), answer: t("faq.offline.a") });
  if (route.drivability && route.drivability !== "unknown") {
    faqItems.push({
      question: t("faq.mode.q"),
      answer: t("faq.mode.a", { level: t(`drivability.${route.drivability}`) }),
    });
  }

  // ── Related routes ─────────────────────────────────────────────────────────
  const related = relatedRoutes(route, locale, 3).map((r) => toRouteCardVM(r, locale));

  // ── JSON-LD ─────────────────────────────────────────────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        "@id": `${pageUrl}#trip`,
        name: content.name,
        description: clamp(content.description, 300),
        url: pageUrl,
        // Generated per route by opengraph-image.tsx — the route's own shape.
        image: `${pageUrl}/opengraph-image`,
        inLanguage: locale,
        touristType: "Self-guided audio tour",
        provider: {
          "@type": "Organization",
          name: "TUGGI",
          url: "https://www.tuggi.app",
        },
        ...(placeLabel
          ? { containedInPlace: { "@type": "Place", name: placeLabel } }
          : {}),
        ...(isoDuration(route.durationS) ? { duration: isoDuration(route.durationS) } : {}),
        // `Trip` has no `distance` property, and inventing one is worse than
        // omitting it — so the numeric facts ride in additionalProperty, which
        // schema.org does define on every Thing.
        additionalProperty: [
          ...(route.distanceM
            ? [{
                "@type": "PropertyValue",
                name: "distance",
                value: Math.round(route.distanceM),
                unitCode: "MTR",
              }]
            : []),
          {
            "@type": "PropertyValue",
            name: "stops",
            value: route.stops.length,
          },
          {
            "@type": "PropertyValue",
            name: "availableLanguages",
            value: route.locales.join(", "),
          },
        ],
        itinerary: {
          "@type": "ItemList",
          numberOfItems: route.stops.length,
          itemListElement: route.stops.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: s.name,
              ...(placeLabel
                ? { containedInPlace: { "@type": "Place", name: placeLabel } }
                : {}),
              ...(s.lat != null && s.lng != null
                ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } }
                : {}),
            },
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TUGGI", item: "https://www.tuggi.app" },
          { "@type": "ListItem", position: 2, name: t("breadcrumbTours"), item: buildUrl(locale, "tours") },
          { "@type": "ListItem", position: 3, name: countryLabel, item: buildUrl(locale, `tours/${country}`) },
          { "@type": "ListItem", position: 4, name: content.name, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-100">
        <div className="page-shell py-3 text-sm text-tuggi-slate flex flex-wrap gap-2">
          <Link href={`/${locale}/tours`} className="hover:text-tuggi-primary-text">
            {t("breadcrumbTours")}
          </Link>
          <span aria-hidden>›</span>
          <Link href={`/${locale}/tours/${country}`} className="hover:text-tuggi-primary-text">
            {countryLabel}
          </Link>
          <span aria-hidden>›</span>
          <span className="text-tuggi-dark font-semibold line-clamp-1">{content.name}</span>
        </div>
      </nav>

      <RouteHero
        name={content.name}
        region={route.region}
        country={countryLabel}
        description={content.description}
        durationStr={durationStr}
        distanceStr={distanceStr}
        stopsCount={route.stops.length}
        drivability={route.drivability}
        accessibility={route.accessibility}
        bestTime={route.bestTime}
        languageLabels={languageLabels}
      />

      {/* Map + itinerary, side by side and in sync on desktop */}
      <RouteExplorer
        line={route.geometry?.coordinates ?? null}
        mapStops={mapStops}
        stops={stops}
      />

      <RouteFaq items={faqItems} />

      <RelatedRoutes vms={related} />

      {/* Final CTA */}
      <section
        id="route-final-cta"
        className="py-20 bg-tuggi-primary/5 border-t border-gray-100"
      >
        <div className="page-shell">
          {/* Deliberately centred: this is a closing band, not a content block. */}
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl md:text-4xl font-black text-tuggi-dark mb-4">
              {t("ctaTitle")}
            </h2>
            <p className="text-tuggi-slate text-lg mb-8">{t("ctaSubtitle")}</p>
            <AppDownloadButton
              eventLabel="route_footer"
              className="inline-block px-10 py-5 bg-tuggi-primary text-tuggi-dark font-black rounded-2xl shadow-xl shadow-tuggi-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all"
            >
              {t("ctaButton")}
            </AppDownloadButton>
          </div>
        </div>
      </section>

      {/* Mobile only: the itinerary runs far past a screen, so the way out to
          the app has to travel with the reader. Desktop keeps its CTA in the
          sticky map column instead. */}
      <StickyCta
        text={t("stickyText")}
        cta={t("stickyCta")}
        afterId="route-hero"
        untilId="route-final-cta"
        placement="route_sticky"
      />
    </article>
  );
}
