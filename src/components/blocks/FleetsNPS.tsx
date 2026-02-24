"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

export function FleetsNPS() {
  const t = useTranslations("Fleets.NPS");

  return (
    <section className="w-full py-24 bg-[#0B1220] px-4 sm:px-6 lg:px-8 border-b border-gray-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
      
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-tuggi-primary/20 rounded-full blur-3xl pointer-events-none mix-blend-screen opacity-50"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-tuggi-secondary/10 rounded-full blur-3xl pointer-events-none mix-blend-screen opacity-50"></div>
      
      <div className="max-w-4xl mx-auto space-y-8 relative z-10 flex flex-col items-center">
        
        {/* Five Stars UI with Staggered Animation */}
        <motion.div 
          className="flex space-x-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.div
              key={star}
              variants={{
                hidden: { opacity: 0.3, scale: 0.8 },
                visible: { opacity: 1, scale: 1 },
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            </motion.div>
          ))}
        </motion.div>

        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          {t("title")}
        </h2>
        
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl leading-relaxed font-medium">
          {t("desc")}
        </p>

      </div>
    </section>
  );
}
