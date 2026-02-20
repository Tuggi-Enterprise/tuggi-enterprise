import { useTranslations } from "next-intl";
import { FileSignature } from "lucide-react";

export function TechGovernance() {
  const t = useTranslations("Technology.Governance");

  return (
    <section className="py-24 bg-tuggi-dark border-t border-slate-800 overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-slate-800/50 rounded-full px-4 py-1.5 mb-6 border border-slate-700">
            <FileSignature className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">Audit & Logs</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-6">
            {t("title")}
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            {t("desc")}
          </p>
        </div>

        {/* Mock Audit Log Table */}
        <div className="max-w-5xl mx-auto bg-[#0a0f1a] rounded-xl border border-slate-700/50 shadow-2xl overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#121a28] border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-400 tracking-wider">TIMESTAMP (UTC)</th>
                <th className="px-6 py-4 font-semibold text-slate-400 tracking-wider">USER</th>
                <th className="px-6 py-4 font-semibold text-slate-400 tracking-wider">ACTION</th>
                <th className="px-6 py-4 font-semibold text-slate-400 tracking-wider">IP ADDRESS</th>
                <th className="px-6 py-4 font-semibold text-slate-400 tracking-wider">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">2026-02-20T14:01:11Z</td>
                <td className="px-6 py-4 text-tuggi-primary">admin@city.gov</td>
                <td className="px-6 py-4 text-amber-300">UPDATE_TRIGGER</td>
                <td className="px-6 py-4">192.168.1.1</td>
                <td className="px-6 py-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">SUCCESS</span></td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">2026-02-20T13:45:00Z</td>
                <td className="px-6 py-4 text-slate-500">system.jobs</td>
                <td className="px-6 py-4 text-slate-300">PREFETCH_CACHE</td>
                <td className="px-6 py-4">10.0.0.45</td>
                <td className="px-6 py-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">SUCCESS</span></td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">2026-02-20T12:30:22Z</td>
                <td className="px-6 py-4 text-tuggi-primary">sysops@fleet.com</td>
                <td className="px-6 py-4 text-rose-300">REVOKE_LICENSE</td>
                <td className="px-6 py-4">203.0.113.42</td>
                <td className="px-6 py-4"><span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">SUCCESS</span></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
