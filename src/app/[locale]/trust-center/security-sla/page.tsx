import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("securityTitle"),
    description: t("securityDescription"),
  };
}

export default async function SecuritySLAPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark">
      <h1>Security SLA & Infrastructure</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">Service Level Agreements and Data Controls</p>
      
      <section>
        <h2>1. Tenant Isolation</h2>
        <p>TUGGI utilizes a strict multi-tenant architecture designed to ensure that data from one B2G or B2B client is logically and physically isolated from others. Each jurisdiction or fleet operates within its own row-level security (RLS) policies, preventing unauthorized cross-tenant data access.</p>
      </section>

      <section>
        <h2>2. RBAC (Role-Based Access Control)</h2>
        <p>Access to the TUGGI City OS and Enterprise Dashboards is managed via granular <strong>Role-Based Access Control</strong>. Administrative permissions are architected on the principle of least privilege (PoLP), ensuring that government officials or fleet managers only have access to the specific modules and telemetry required for their operational roles.</p>
      </section>

      <section>
        <h2>3. Immutable Audit Logs</h2>
        <p>To satisfy Government IT Auditors and compliance frameworks, TUGGI maintains <strong>Immutable Audit Logs</strong> for all administrative actions. Every modification to geographical triggers, user permissions, or system configurations is recorded with a non-repudiable timestamp and actor ID, ensuring a transparent trail of accountability.</p>
      </section>

      <section>
        <h2>4. High Availability & Disaster Recovery</h2>
        <p>Our PostgreSQL clusters and API gateways are distributed across multiple availability zones. We guarantee a <strong>Uptime SLA of 99.9%</strong>. For critical government infrastructure, we offer Point-in-Time Recovery (PITR) protocols, ensuring that data can be restored to any microsecond within the last 30 days in the event of a catastrophic failure.</p>
      </section>
    </article>
  );
}
