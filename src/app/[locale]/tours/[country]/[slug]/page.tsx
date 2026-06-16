import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import {
  getRoute,
  getRoutesForLocale,
  pickLocaleContent,
  pickStopContent,
  relatedRoutes,
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
import { RouteMap } from "@/components/blocks/RouteMap";
import { RouteStops, type RouteStopView } from "@/components/blocks/RouteStops";
import { RouteFaq, type FaqItem } from "@/components/blocks/RouteFaq";
import { RelatedRoutes } from "@/components/blocks/RelatedRoutes";

export const dynamicParams = false;

type Params = { locale: string; country: string; slug: string };

function clamp(text: string, max = 200): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
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
  const title = t("metaTitle", { name: content.name });
  const description = content.description
    ? clamp(content.description)
    : t("metaDescFallback", { place: route.region || route.country });

  return {
    title,
    description,
    alternates: buildAlternatesFor(locale, pagePath, route.locales),
    robots: defaultRobots,
    openGraph: buildOpenGraph({ title, description, locale, pagePath }),
    twitter: buildTwitterCard({ title, description }),
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
  const pageUrl = buildUrl(locale, `tours/${country}/${slug}`);
  const distanceStr = formatDistance(route.distanceM, locale);
  const durationStr = formatDuration(route.durationS);
  const languageLabels = languageLabelsFor(route.locales);

  // ── Stops view (localized description + audio, base name) ──────────────────
  const stops: RouteStopView[] = route.stops.map((stop, i) => {
    const stopContent = pickStopContent(stop, locale);
    return {
      position: i + 1,
      name: stop.name,
      description: stopContent?.description ?? "",
      audioUrl: stopContent?.audioUrl ?? null,
      isGeneric: stop.isGeneric,
    };
  });

  const mapStops = route.stops.map((s) => ({
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    isGeneric: s.isGeneric,
  }));

  // ── FAQ (genuine, data-driven) ─────────────────────────────────────────────
  const faqItems: FaqItem[] = [];
  faqItems.push({
    question: t("faq.duration.q"),
    answer: t("faq.duration.a", {
      duration: durationStr || t("facts.varies"),
      distance: distanceStr || "—",
      stops: stops.length,
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
        inLanguage: locale,
        touristType: "Self-guided audio tour",
        itinerary: {
          "@type": "ItemList",
          numberOfItems: route.stops.length,
          itemListElement: route.stops.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: s.name,
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
          { "@type": "ListItem", position: 3, name: route.country, item: buildUrl(locale, `tours/${country}`) },
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

  const appHref = `/${locale}/drive`;

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-3 max-w-5xl text-sm text-tuggi-slate flex flex-wrap gap-2">
          <Link href={`/${locale}/tours`} className="hover:text-tuggi-primary">
            {t("breadcrumbTours")}
          </Link>
          <span aria-hidden>›</span>
          <Link href={`/${locale}/tours/${country}`} className="hover:text-tuggi-primary">
            {route.country}
          </Link>
          <span aria-hidden>›</span>
          <span className="text-tuggi-dark font-semibold line-clamp-1">{content.name}</span>
        </div>
      </nav>

      <RouteHero
        name={content.name}
        region={route.region}
        country={route.country}
        durationStr={durationStr}
        distanceStr={distanceStr}
        stopsCount={route.stops.length}
        drivability={route.drivability}
        accessibility={route.accessibility}
        bestTime={route.bestTime}
        languageLabels={languageLabels}
        appHref={appHref}
      />

      {/* Intro / description */}
      {content.description && (
        <section className="bg-white">
          <div className="container mx-auto px-6 max-w-3xl pb-8">
            <p className="text-lg text-tuggi-slate leading-relaxed whitespace-pre-line">
              {content.description}
            </p>
          </div>
        </section>
      )}

      {/* Map */}
      <section id="route-map" className="bg-white pb-16">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm h-[420px]">
            <RouteMap line={route.geometry?.coordinates ?? null} stops={mapStops} />
          </div>
        </div>
      </section>

      <RouteStops stops={stops} />

      <RouteFaq items={faqItems} />

      <RelatedRoutes vms={related} />

      {/* Final CTA */}
      <section className="py-20 bg-tuggi-primary/5 border-t border-gray-100">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-black text-tuggi-dark mb-4">
            {t("ctaTitle")}
          </h2>
          <p className="text-tuggi-slate text-lg mb-8">{t("ctaSubtitle")}</p>
          <a
            href={appHref}
            className="inline-block px-10 py-5 bg-tuggi-primary text-white font-black rounded-2xl shadow-xl shadow-tuggi-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            {t("ctaButton")}
          </a>
        </div>
      </section>
    </article>
  );
}
