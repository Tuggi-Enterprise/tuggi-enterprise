"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { MapPin, Clock, ArrowRight } from "lucide-react";

export interface RouteCardVM {
  href: string;
  name: string;
  region: string | null;
  country: string;
  stopsCount: number;
  durationStr: string;
  languageLabels: string[];
}

export function RouteCard({ vm }: { vm: RouteCardVM }) {
  const t = useTranslations("Tours");
  return (
    <Link
      href={vm.href}
      className="group flex flex-col h-full rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
    >
      <div className="text-xs font-bold uppercase tracking-wider text-tuggi-primary mb-2">
        {vm.region || vm.country}
      </div>
      <h3 className="text-lg font-black text-tuggi-dark leading-snug mb-4 line-clamp-3">
        {vm.name}
      </h3>

      <div className="mt-auto flex flex-wrap items-center gap-4 text-sm text-tuggi-slate">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-tuggi-primary" />
          {t("stopsCount", { count: vm.stopsCount })}
        </span>
        {vm.durationStr && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-tuggi-primary" />
            {vm.durationStr}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {vm.languageLabels.map((l) => (
            <span
              key={l}
              className="px-2 py-0.5 text-xs font-bold rounded-full bg-tuggi-bg text-tuggi-slate"
            >
              {l}
            </span>
          ))}
        </div>
        <ArrowRight className="w-5 h-5 text-tuggi-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
