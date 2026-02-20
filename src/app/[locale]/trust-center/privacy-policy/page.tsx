import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  };
}

export default async function PrivacyPolicyPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark">
      <h1>Privacy Policy</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">Last updated: February 2026</p>
      
      <section>
        <h2>1. Privacy by Design</h2>
        <p>TUGGI is built on a &quot;Privacy First&quot; architecture. Our proprietary geo-fence listeners run locally on the user&apos;s device. We explicitly avoid continuous real-time location streaming to central servers, which mathematically eliminates the risk of individualized surveillance.</p>
      </section>

      <section>
        <h2>2. Anonymized Telemetry (GDPR & LGPD)</h2>
        <p>The TUGGI geographical trigger engine does not track, collect, or sell <strong>Personally Identifiable Information (PII)</strong>. Our telemetry systems are strictly engineered to capture aggregated, macroscopic flow data.</p>
        <p>We provide government and enterprise clients with heatmaps and demographic trends based on active audio streams, but these data points are fully anonymized and cannot be traced back to a specific individual, device, or identity, ensuring full compliance with GDPR (Europe) and LGPD (Brazil).</p>
      </section>

      <section>
        <h2>3. Local Storage & Cache</h2>
        <p>All city packs, audio narratives, and map data are stored locally in the application&apos;s encrypted cache. This ensures the app remains functional in offline zones and minimizes data exchange with our cloud infrastructure.</p>
      </section>

      <section>
        <h2>4. Data Subject Rights</h2>
        <p>Users maintain full sovereignty over their interaction history. You may request the deletion of your account and associated anonymized identifiers at any time through our Data Deletion portal.</p>
      </section>
    </article>
  );
}
