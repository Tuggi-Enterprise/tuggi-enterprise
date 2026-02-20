import { getTranslations } from "next-intl/server";
import { ShieldCheck, Zap, Crosshair, Diamond, Globe, Accessibility } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("purposeTitle"),
    description: t("purposeDescription"),
  };
}

export default async function PurposePage() {
  const t = await getTranslations("Purpose");

  return (
    <article className="bg-tuggi-bg text-tuggi-dark selection:bg-tuggi-primary selection:text-white">
      
      {/* 1. THE PRIMAL INSTINCT (HERO MANIFESTO) */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {t("Hero.title")}
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed text-slate-700 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            {t("Hero.body")}
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4">
        <hr className="border-slate-200" />
      </div>

      {/* 2. THE THESIS OF FREEDOM */}
      <section className="py-24 md:py-32 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              {t("Freedom.title")}
            </h2>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              {t("Freedom.body")}
            </p>
          </div>
          <div className="hidden lg:flex justify-end">
             {/* Abstract Visual / Minimalist Space */}
             <div className="w-80 h-80 border border-slate-200 rounded-full flex items-center justify-center p-12">
                <div className="w-full h-full border border-slate-300 rounded-full flex items-center justify-center animate-pulse">
                   <div className="w-4 h-4 bg-tuggi-primary rounded-full" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 3. THE SOVEREIGNTY OF THE NARRATIVE */}
      <section className="py-24 md:py-32 px-4 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="hidden lg:block order-2 lg:order-1">
             <div className="aspect-square bg-tuggi-bg rounded-3xl flex items-center justify-center">
                <div className="w-1/2 h-1px bg-slate-300 absolute" />
                <div className="h-1/2 w-1px bg-slate-300 absolute" />
                <div className="w-32 h-32 border-2 border-tuggi-dark/10 rounded-full animate-ping" />
             </div>
          </div>
          <div className="max-w-xl order-1 lg:order-2">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              {t("Sovereignty.title")}
            </h2>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              {t("Sovereignty.body")}
            </p>
          </div>
        </div>
      </section>

      {/* 4. THE FOUNDATION (VALUES) */}
      <section className="py-24 md:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
              {t("Values.title")}
            </h2>
            <div className="w-24 h-1 bg-tuggi-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
            
            <div className="space-y-4">
              <ShieldCheck className="w-10 h-10 text-tuggi-dark stroke-1" />
              <h3 className="text-xl font-bold">{t("Values.v1Title")}</h3>
              <p className="text-slate-600 leading-relaxed">{t("Values.v1Desc")}</p>
            </div>

            <div className="space-y-4">
              <Zap className="w-10 h-10 text-tuggi-dark stroke-1" />
              <h3 className="text-xl font-bold">{t("Values.v2Title")}</h3>
              <p className="text-slate-600 leading-relaxed">{t("Values.v2Desc")}</p>
            </div>

            <div className="space-y-4">
              <Crosshair className="w-10 h-10 text-tuggi-dark stroke-1" />
              <h3 className="text-xl font-bold">{t("Values.v3Title")}</h3>
              <p className="text-slate-600 leading-relaxed">{t("Values.v3Desc")}</p>
            </div>

            <div className="space-y-4">
              <Diamond className="w-10 h-10 text-tuggi-dark stroke-1" />
              <h3 className="text-xl font-bold">{t("Values.v4Title")}</h3>
              <p className="text-slate-600 leading-relaxed">{t("Values.v4Desc")}</p>
            </div>

            <div className="space-y-4">
              <Globe className="w-10 h-10 text-tuggi-dark stroke-1" />
              <h3 className="text-xl font-bold">{t("Values.v5Title")}</h3>
              <p className="text-slate-600 leading-relaxed">{t("Values.v5Desc")}</p>
            </div>

            <div className="space-y-4">
              <Accessibility className="w-10 h-10 text-tuggi-dark stroke-1" />
              <h3 className="text-xl font-bold">{t("Values.v6Title")}</h3>
              <p className="text-slate-600 leading-relaxed">{t("Values.v6Desc")}</p>
            </div>

          </div>
        </div>
      </section>

      {/* Manifesto Footer */}
      <footer className="py-32 px-4 text-center border-t border-slate-100">
        <blockquote className="max-w-3xl mx-auto italic text-2xl md:text-3xl text-slate-500 font-serif mb-8">
          &quot;The world is better when we stop looking at it through a window, and start hearing it breathe.&quot;
        </blockquote>
        <p className="text-sm font-bold uppercase tracking-widest text-tuggi-dark">
          TUGGI Manifesto — Since 2024
        </p>
      </footer>

    </article>
  );
}
