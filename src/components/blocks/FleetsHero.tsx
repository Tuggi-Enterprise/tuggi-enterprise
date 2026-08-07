import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LineChart } from "lucide-react";

export function FleetsHero() {
  const t = useTranslations("Fleets.Hero");

  return (
    <section className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col">

        {/* Copy Focus.
            Centred at every width on purpose. The two-column skeleton this
            block used to sit in lost its visual column when the risk block
            came out, and from 1024px up the empty right half read as a
            component that had failed to load. Centring closes it with
            alignment instead of inventing content for a page that is queued
            for a rewrite. */}
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center space-y-6">
          {/* The eyebrow used to name a capability that BR-B2B-007's closed list
              does not carry, in English, in all four locales. It names the
              audience now: no claim, and one key instead of a literal. */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-tuggi-primary/40 rounded-full text-tuggi-primary-text font-semibold text-sm">
            <LineChart className="w-5 h-5" aria-hidden="true" />
            {t("eyebrow")}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-tuggi-dark leading-tight">
            {t("title")}
          </h1>
          <p className="text-xl text-tuggi-slate leading-relaxed max-w-2xl mx-auto mb-4">
            {t("subtitle")}
          </p>
          <Link
            href="/contact"
            className="px-8 py-4 bg-tuggi-secondary text-tuggi-dark font-semibold rounded-md shadow-sm hover:bg-tuggi-secondary-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 w-full sm:w-auto text-center"
          >
            {t("cta")}
          </Link>
        </div>

      </div>
    </section>
  );
}
