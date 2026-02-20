import { getTranslations } from "next-intl/server";
import { DataDeletionForm } from "@/components/forms/DataDeletionForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("deletionTitle"),
    description: t("deletionDescription"),
  };
}

export default async function DataDeletionPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600">
      <h1>Data Deletion Protocol</h1>
      
      <p>You hold absolute control over your telemetry and account records. At TUGGI, we ensure that your right to be forgotten is respected across our entire infrastructure.</p>

      <div className="not-prose bg-slate-50 p-8 rounded-xl border border-slate-200 my-10">
        <h3 className="text-lg font-bold text-tuggi-dark mb-2">Request Account Deletion</h3>
        <p className="text-slate-600 mb-6 text-sm">
          Enter your account email below. We will send a secure Magic Link to permanently delete your data via our auth infrastructure. Once executed, this action is immutable and your data will be purged from all TUGGI shards.
        </p>
        
        <DataDeletionForm />
      </div>

      <section>
        <h2>What happens to my data?</h2>
        <p>When you execute a deletion request:</p>
        <ul>
          <li>Your account profile and login credentials are permanently removed from our Auth provider.</li>
          <li>All device identifiers linked to your previous sessions are scrubbed from our telemetry database.</li>
          <li>Any anonymized flow data previously generated remains in the aggregate, but can never be re-associated with your identity.</li>
        </ul>
      </section>

      <section>
        <h2>Enterprise/City OS Data</h2>
        <p>If your account was provisioned through a City OS government portal or a Fleet Enterprise license, some records may be subject to statutory retention periods required by municipal law. TUGGI will handle these requests in coordination with the relevant tenant authority.</p>
      </section>
    </article>
  );
}
