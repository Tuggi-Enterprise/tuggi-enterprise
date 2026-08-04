"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Headphones } from "lucide-react";
import type { RouteTrace } from "@/lib/routeTrace";

export interface RouteCardVM {
  href: string;
  name: string;
  region: string | null;
  country: string;
  stopsCount: number;
  durationStr: string;
  distanceStr: string;
  /** Pre-computed SVG path of the route shape (server-side), or null. */
  trace: RouteTrace | null;
  /** scenic_profile keys, at most two — translated via Tours.themes.*. */
  themes: string[];
  languageCount: number;
}

export function RouteCard({ vm }: { vm: RouteCardVM }) {
  const t = useTranslations("Tours");

  // Three fixed slots. A missing value shows a dash instead of collapsing the
  // row, so cards in a grid keep the same height and the eye can compare them.
  const facts = [
    vm.durationStr || "—",
    vm.distanceStr || "—",
    t("stopsCount", { count: vm.stopsCount }),
  ];

  // `scenic_profile` is an open list in the database. A value we have no label
  // for is skipped rather than rendered raw — and never allowed to throw.
  const themes = vm.themes.filter((theme) =>
    t.has(`themes.${theme}` as Parameters<typeof t.has>[0])
  );

  return (
    <Link
      href={vm.href}
      className="group flex flex-col h-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary-text focus-visible:ring-offset-2"
    >
      {vm.trace && (
        /* The route's own shape, drawn from its geometry. Decorative — every
           fact it hints at is written out below — so it is hidden from
           assistive tech rather than described. */
        <div className="bg-tuggi-bg border-b border-gray-100">
          <svg
            viewBox={`0 0 ${vm.trace.width} ${vm.trace.height}`}
            className="w-full h-auto"
            aria-hidden="true"
            focusable="false"
          >
            {/* Widths are in viewBox units: the box is 100 wide and renders at
                roughly 340px, so one unit is ~3.4 real pixels. 0.8 draws a ~2.7px
                hairline — a map line, not a marker stroke. */}
            <path
              d={vm.trace.d}
              fill="none"
              stroke="var(--color-tuggi-primary-text)"
              strokeWidth={0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={vm.trace.start[0]}
              cy={vm.trace.start[1]}
              r={1.8}
              fill="var(--color-tuggi-primary-text)"
            />
            <circle
              cx={vm.trace.end[0]}
              cy={vm.trace.end[1]}
              r={1.7}
              fill="#fff"
              stroke="var(--color-tuggi-primary-text)"
              strokeWidth={0.8}
            />
          </svg>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6">
        <div className="text-xs font-bold uppercase tracking-wider text-tuggi-primary-text mb-2">
          {vm.region || vm.country}
        </div>

        <h3 className="text-lg font-black text-tuggi-dark leading-snug mb-4 line-clamp-2">
          {vm.name}
        </h3>

        <div className="mt-auto text-sm text-tuggi-slate tabular-nums">
          {facts.join(" · ")}
        </div>

        {themes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {themes.map((theme) => (
              <span
                key={theme}
                className="px-2 py-0.5 text-xs font-semibold rounded-full bg-tuggi-bg text-tuggi-slate"
              >
                {t(`themes.${theme}` as "themes.historical")}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-tuggi-slate">
          {/* One number instead of four pills: the full list belongs on the
              route page, and four chips wrapped to two lines on half the cards. */}
          <span className="inline-flex items-center gap-1.5">
            <Headphones className="w-4 h-4 text-tuggi-slate/70" aria-hidden="true" />
            {t("languagesCount", { count: vm.languageCount })}
          </span>
          <ArrowRight className="w-5 h-5 text-tuggi-primary-text opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
