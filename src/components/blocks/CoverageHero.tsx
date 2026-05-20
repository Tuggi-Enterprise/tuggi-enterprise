"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MapPin, Globe, Star } from "lucide-react";

interface CoverageHeroProps {
  totalCountries: number;
  totalAttractions: number;
  totalActiveRegions: number;
}

export function CoverageHero({
  totalCountries,
  totalAttractions,
  totalActiveRegions,
}: CoverageHeroProps) {
  const t = useTranslations("Coverage");

  const stats = [
    { label: t("Stats.countries"),   value: totalCountries,     icon: Globe,  color: "text-tuggi-primary" },
    { label: t("Stats.attractions"), value: totalAttractions,   icon: Star,   color: "text-tuggi-primary" },
    { label: t("Stats.regions"),     value: totalActiveRegions, icon: MapPin, color: "text-tuggi-primary" },
  ];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-white">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-tuggi-primary blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-tuggi-primary blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 mb-6 text-sm font-bold tracking-wider text-tuggi-primary uppercase bg-tuggi-primary/10 rounded-full"
          >
            {t("Hero.tag")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-tuggi-dark mb-8 leading-tight"
          >
            {t("Hero.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-tuggi-slate leading-relaxed"
          >
            {t("Hero.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-tuggi-bg p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="text-4xl font-black text-tuggi-dark mb-2 tracking-tight">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-sm font-bold text-tuggi-slate uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
