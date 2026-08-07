import { useTranslations } from "next-intl";

export function TechHero() {
  const t = useTranslations("Technology.Hero");

  return (
    <section className="bg-tuggi-dark text-white pt-32 pb-24 overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-slate-800/50 rounded-full px-3 py-1 mb-6 border border-slate-700">
            <span className="flex h-2 w-2 rounded-full bg-tuggi-primary"></span>
            {/* Sentence case in the message: `uppercase` is form and stays in
                the pill. Measured at 360px in the longest locale (es, 256px of
                text inside a 344px track) before it moved. */}
            <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">{t("eyebrow")}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            {t("title")}
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Abstract Payload Visualization */}
        <div className="mt-16 bg-[#0f172a] rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="border-b border-slate-800 px-4 py-3 bg-[#0B1220] flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-slate-700"></div>
            <div className="w-3 h-3 rounded-full bg-slate-700"></div>
            <div className="w-3 h-3 rounded-full bg-slate-700"></div>
            <div id="tech-hero-payload-name" className="ml-4 text-xs font-mono text-slate-400">geofence_trigger.json</div>
          </div>
          {/* The payload scrolls horizontally and holds nothing focusable, so a
              keyboard user could not reach it at all (SC 2.1.1 / 2.1.3;
              axe: scrollable-region-focusable). tabIndex + role="region" put it
              in the tab order, and the filename above already names it — no new
              string needed for the accessible name.
              text-slate-400 replaces text-slate-500 throughout: #62748e on
              #0f172a is 3.75:1, under 4.5:1 (SC 1.4.3). */}
          <div
            className="p-6 overflow-x-auto text-sm sm:text-base"
            tabIndex={0}
            role="region"
            aria-labelledby="tech-hero-payload-name"
          >
            <pre className="font-mono text-slate-300">
              <code>
<span className="text-slate-400">{`// Captured at 80km/h on strict heading`}</span>
{`{
  "`}<span className="text-rose-400">event_id</span>{`": "tgg-78a9c2",
  "`}<span className="text-rose-400">timestamp</span>{`": "2026-02-20T14:02:11Z",
  "`}<span className="text-rose-400">telemetry</span>{`": {
    "`}<span className="text-indigo-300">lat</span>{`": 41.8902,
    "`}<span className="text-indigo-300">lng</span>{`": 12.4922,
    "`}<span className="text-indigo-300">heading</span>{`": 284.5, `}<span className="text-slate-400">{`// Directional vector filtering active`}</span>
    {`"`}<span className="text-indigo-300">speed_kmh</span>{`": 42.1
  },
  "`}<span className="text-rose-400">payload</span>{`": {
    "`}<span className="text-green-400">trigger_status</span>{`": "CONFIRMED",
    "`}<span className="text-green-400">audio_id</span>{`": "colosseum_approach_eng",
    "`}<span className="text-green-400">action</span>{`": "PLAY_IMMEDIATE"
  }
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
