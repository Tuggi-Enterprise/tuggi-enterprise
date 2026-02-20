import { useTranslations } from "next-intl";

export function TechAPI() {
  const t = useTranslations("Technology.API");

  return (
    <section className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <div className="inline-flex items-center space-x-2 text-tuggi-primary font-semibold text-sm tracking-wider uppercase mb-4">
              <span>Rest API</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-tuggi-dark tracking-tight mb-6">
              {t("title")}
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg mb-8">
              {t("desc")}
            </p>
          </div>

          <div className="bg-[#0f172a] rounded-xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="border-b border-slate-800 px-4 py-3 bg-[#0B1220] flex items-center space-x-2 justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              </div>
              <div className="text-xs font-mono text-slate-500">api/v1/licenses/provision</div>
            </div>
            <div className="p-6 overflow-x-auto text-sm sm:text-base">
              <pre className="font-mono text-slate-300">
                <code>
<span className="text-rose-400">POST</span> /api/v1/licenses/provision HTTP/1.1
<span className="text-slate-400">Host:</span> api.tuggi.io
<span className="text-slate-400">Authorization:</span> Bearer sk_live_fleet_***

{`{
  "`}<span className="text-indigo-300">bookingRef</span>{`": "RNT-89472",
  "`}<span className="text-indigo-300">renterEmail</span>{`": "user@corp.com",
  "`}<span className="text-indigo-300">durationDays</span>{`": 5,
  "`}<span className="text-indigo-300">brandProfile</span>{`": "premium_blue"
}`}

<span className="text-slate-500">{`// HTTP/1.1 201 Created`}</span>
{`{
  "`}<span className="text-green-400">status</span>{`": "success",
  "`}<span className="text-green-400">magicLink</span>{`": "https://tuggi.app/r/RNT-89472"
}`}
                </code>
              </pre>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
