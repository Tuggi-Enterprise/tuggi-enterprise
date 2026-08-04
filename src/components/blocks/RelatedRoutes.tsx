"use client";

import { useTranslations } from "next-intl";
import { RouteCard, type RouteCardVM } from "@/components/blocks/RouteCard";

export function RelatedRoutes({ vms }: { vms: RouteCardVM[] }) {
  const t = useTranslations("Tours");
  if (!vms.length) return null;

  return (
    <section className="py-16 bg-white border-t border-gray-100" aria-labelledby="related-heading">
      <div className="page-shell">
        <h2 id="related-heading" className="text-3xl font-black text-tuggi-dark mb-8">
          {t("relatedTitle")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vms.map((vm) => (
            <RouteCard key={vm.href} vm={vm} />
          ))}
        </div>
      </div>
    </section>
  );
}
