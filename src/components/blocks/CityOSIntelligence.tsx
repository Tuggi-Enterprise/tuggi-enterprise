import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function CityOSIntelligence() {
  const t = useTranslations("CityOS.Intelligence");
  const tHero = useTranslations("CityOS.Hero");

  return (
    // White, not bg: half of the pair inverted with CityOSAccessibility so the
    // page alternates again after the removals (white → light → white).
    // The manifesto block that used to close the page (and gave this
    // container its second child) is gone — this is the last section on
    // /destinations, so it repeats the hero's CTA instead of ending on a
    // dead end (#187). `gap-16` on the outer div is dead code either way: the
    // header below is still the container's only direct child.
    <section className="w-full py-24 bg-white px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto">

        {/* Header + CTA. Flex column, not `space-y-6`, so the reused CTA
            below — an inline <a> by default — gets a real vertical gap
            (`space-y-*` margins don't apply to inline boxes) and its
            `w-full sm:w-auto` sizing actually participates in layout, the
            same way it does inside CityOSHero's own flex column. */}
        <div className="text-center max-w-3xl mx-auto flex flex-col items-center gap-6">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg leading-relaxed text-tuggi-slate">
            {t("desc")}
          </p>
          {/* Same key, same component, same classes as CityOSHero.tsx —
              not new copy, and `text-tuggi-dark` is the AA-contrast ink
              a filled bg-tuggi-secondary CTA needs (#183). */}
          <Link
            href="/contact"
            className="px-8 py-4 bg-tuggi-secondary text-tuggi-dark font-semibold rounded-md shadow-sm hover:bg-tuggi-secondary-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2 w-full sm:w-auto text-center"
          >
            {tHero("cta")}
          </Link>
        </div>

      </div>
    </section>
  );
}
