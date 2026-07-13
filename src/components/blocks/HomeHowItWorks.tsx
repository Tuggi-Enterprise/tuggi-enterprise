import { getTranslations } from "next-intl/server";
import { Download, Compass, Volume2 } from "lucide-react";

/**
 * "How it works" — three plain steps, icon + one sentence each. No screenshots.
 * Server component: static content, no interactivity.
 */
export async function HomeHowItWorks() {
  const t = await getTranslations("Home.HowItWorks");

  const steps = [
    { icon: Download, text: t("step1") },
    { icon: Compass, text: t("step2") },
    { icon: Volume2, text: t("step3") },
  ];

  return (
    <section className="bg-white py-20 lg:py-24 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight text-center mb-14">
          {t("title")}
        </h2>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step, i) => (
            <li key={i} className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-tuggi-bg text-tuggi-primary flex items-center justify-center">
                  <step.icon className="w-8 h-8" aria-hidden="true" />
                </div>
                <span
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-tuggi-primary text-white text-sm font-bold flex items-center justify-center"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              </div>
              <p className="text-lg text-tuggi-slate leading-relaxed max-w-xs">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
