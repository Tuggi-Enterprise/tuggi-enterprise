import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { routeLinkOf, routePlayStoreUrl, type RouteLink } from "@/lib/route-link";
import { PLAY_STORE_URL } from "@/lib/app-meta";
import { RouteCopyCode, RouteStoreBadge, type StorePlatform } from "@/components/blocks/RouteLinkClient";

/**
 * The body of the route page (`/r/<slug>`, card #946, spec §1.1 and §1.2),
 * shared with `/route/<uuid>` when that one cannot be resolved. Server
 * component: the page arrives ready, there is no skeleton (spec §1.2).
 */

/** Spec §0.2: one badge per platform, read from the user agent on the server. */
export function storePlatformOf(userAgent: string | null): StorePlatform {
  const ua = userAgent ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

const H1 = "text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight leading-tight";

export async function RouteLinkView({
  route,
  userAgent,
}: {
  route: RouteLink;
  userAgent: string | null;
}) {
  const t = await getTranslations("RouteLink");
  const tDownload = await getTranslations("Download");
  const platform = storePlatformOf(userAgent);
  const available = route.status === "available";

  const facts = available
    ? [
        [route.region, route.country].filter(Boolean).join(", "),
        route.stops > 0 ? t("stops", { count: route.stops }) : "",
      ].filter(Boolean)
    : [];

  return (
    <div className="px-5 pt-10 pb-16">
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        {available ? (
          <section
            data-testid="route-available"
            aria-labelledby="route-title"
            className="w-full flex flex-col items-center gap-3"
          >
            <p className="text-sm font-bold text-tuggi-slate">{t("eyebrow")}</p>
            <h1 id="route-title" className={`${H1} line-clamp-3 break-words`}>
              {route.name}
            </h1>
            {route.partnerName ? (
              <p data-testid="route-partner" className="text-sm font-semibold text-tuggi-slate">
                {tDownload.rich("Campaign.referredBy", {
                  name: route.partnerName,
                  partner: (chunks) => <span className="text-tuggi-dark">{chunks}</span>,
                })}
              </p>
            ) : null}
            {facts.length > 0 ? (
              <p data-testid="route-facts" className="text-[15px] text-tuggi-slate">
                {facts.join(" · ")}
              </p>
            ) : null}
            <p className="text-lg text-tuggi-slate leading-relaxed">{t("lead")}</p>
          </section>
        ) : (
          <section
            data-testid={`route-${route.status}`}
            aria-labelledby="route-title"
            className="w-full flex flex-col items-center gap-3"
          >
            <h1 id="route-title" className={H1}>
              {route.status === "review"
                ? t("reviewTitle")
                : route.status === "gone"
                  ? t("goneTitle")
                  : t("notFoundTitle")}
            </h1>
            <p className="text-lg text-tuggi-slate leading-relaxed">
              {route.status === "review"
                ? t("reviewLead")
                : route.status === "gone"
                  ? t("goneLead")
                  : t("notFoundLead")}
            </p>
          </section>
        )}

        <section
          data-testid="route-stores"
          aria-labelledby="route-stores-title"
          className="w-full mt-8 flex flex-col items-center gap-3"
        >
          <h2 id="route-stores-title" className="text-base font-bold text-tuggi-dark">
            {available ? t("storeHeading") : t("getApp")}
          </h2>
          <RouteStoreBadge
            platform={platform}
            link={available ? routeLinkOf(route.slug) : undefined}
            slug={available ? route.slug : undefined}
            playStoreUrl={available ? routePlayStoreUrl(route.slug) : PLAY_STORE_URL}
          />
        </section>

        {available ? (
          <>
            <section aria-labelledby="route-code-title" className="w-full mt-8 flex flex-col items-center gap-3">
              <h2 id="route-code-title" className="text-base font-bold text-tuggi-dark">
                {t("codeLabel")}
              </h2>
              <RouteCopyCode code={route.slug} />
            </section>

            <section aria-labelledby="route-how" className="w-full mt-10 text-left">
              <h2 id="route-how" className="text-xl font-extrabold text-tuggi-dark mb-4">
                {t("howTitle")}
              </h2>
              <ol className="flex flex-col gap-3">
                {(["step1", "step2", "step3"] as const).map((key, index) => (
                  <li key={key} className="flex gap-3 items-start">
                    <span
                      aria-hidden
                      className="shrink-0 w-7 h-7 rounded-full bg-tuggi-secondary text-tuggi-dark font-extrabold text-sm flex items-center justify-center"
                    >
                      {index + 1}
                    </span>
                    <span className="text-tuggi-slate leading-relaxed pt-0.5 break-words min-w-0">
                      {key === "step3"
                        ? t.rich("step3", {
                            code: route.slug,
                            strong: (chunks) => <strong className="text-tuggi-dark">{chunks}</strong>,
                          })
                        : t(key)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <div className="w-full mt-10 rounded-3xl overflow-hidden border border-tuggi-border aspect-[4/3] relative">
              <Image
                src="/images/app/home-map.jpg"
                alt={t("mapAlt")}
                fill
                sizes="(max-width: 448px) 100vw, 448px"
                className="object-cover object-[center_40%]"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
