import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("termsTitle"),
    description: t("termsDescription"),
  };
}

export default async function TermsOfUsePage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark">
      <h1>Terms of Use</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">Last updated: February 2026</p>
      
      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By downloading, installing, or operating the TUGGI software application, you agree to be bound by these Terms of Use and all applicable laws and regulations.</p>
      </section>

      <section>
        <h2 className="text-red-600">2. Hands-Free Operation & Liability Limit</h2>
        <p><strong>TUGGI is strictly designed for background, hands-free operation.</strong> Our technology utilizes geographical triggers to deliver audio content without requiring the user to interact with a screen while driving.</p>
        <p>The driver assumes full and sole responsibility for traffic safety, situational awareness, and the avoidance of traffic infractions. TUGGI Technologies, its B2G (Government) partners, and its B2B (Fleet/Enterprise) partners hold <strong>zero liability</strong> for any accidents, injuries, fines, or legal consequences resulting from the use of the application or the driver&apos;s failure to maintain focus on the road.</p>
      </section>

      <section>
        <h2>3. Intellectual Property</h2>
        <p>All narrative content, unique geographical trigger coordinates, and the TUGGI Engine architecture are the exclusive property of TUGGI Technologies. Unauthorized reproduction or reverse engineering is strictly prohibited.</p>
      </section>

      <section>
        <h2>4. Enterprise & Government Use</h2>
        <p>Users representing government jurisdictions or commercial fleets are subject to additional Master Service Agreements (MSA) which supersede specific clauses of these general terms where applicable.</p>
      </section>
    </article>
  );
}
