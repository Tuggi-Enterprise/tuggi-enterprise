import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("accessibilityTitle"),
    description: t("accessibilityDescription"),
  };
}

export default async function AccessibilityPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:text-tuggi-dark prose-p:text-slate-600 prose-strong:text-tuggi-dark">
      <h1>Accessibility Statement</h1>
      <p className="text-sm font-semibold tracking-wider uppercase text-slate-400 !mb-8 border-b border-gray-100 pb-4">WCAG 2.1 AA Compliance</p>
      
      <section>
        <h2>1. Our Commitment</h2>
        <p>TUGGI is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards, focusing on the unique needs of tourists and drivers with sensory impairments.</p>
      </section>

      <section>
        <h2>2. WCAG 2.1 AA Compliance</h2>
        <p>We aim to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>. Our platform is undergoes periodic audits to ensure that our interfaces, navigation flows, and interactive elements remain inclusive and usable across a wide range of assistive technologies.</p>
      </section>

      <section>
        <h2>3. Audio-First & Visual Inclusivity</h2>
        <p>TUGGI is structurally an <strong>&quot;Audio-First&quot;</strong> interface. This architecture is natively designed to serve individuals with vision impairments, allowing them to absorb cultural and historical narratives without needing to interact with a visual UI.</p>
        <p>For passengers with hearing impairments, we feature <strong>Geolocated Closed Captions</strong>. This text-based overlay is synchronized with our audio triggers, ensuring that no passenger is excluded from the storytelling experience.</p>
        <p><em>Note: The visual Closed Captions feature is strictly intended for passengers. The driver experience remains 100% hands-free and audio-driven to ensure road safety.</em></p>
      </section>

      <section>
        <h2>4. Feedback & Contact</h2>
        <p>We welcome your feedback on the accessibility of TUGGI. If you encounter accessibility barriers or have suggestions for improvement, please contact our implementation team at:</p>
        <p>
          <a href="mailto:accessibility@tuggi.app" className="text-tuggi-primary font-bold hover:underline">
            accessibility@tuggi.app
          </a>
        </p>
      </section>
    </article>
  );
}
