import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("contactTitle"),
    description: t("contactDescription"),
  };
}

import { ContactForm } from "@/components/blocks/ContactForm";

export default async function ContactPage() {
  return (
    <main className="py-20 lg:py-24 bg-[#F7F9FC] min-h-[70vh] flex flex-col justify-center items-center">
      <section className="bg-white p-10 rounded-md shadow-sm border border-gray-200 max-w-xl w-full">
        <h1 className="text-3xl tracking-tight font-bold mb-6 text-[#0B1220]">Contact Us</h1>
        <p className="text-[#5B6472] mb-8 leading-relaxed max-w-prose">
          Our solutions are tailored for government jurisdictions and fleet enterprises. Fill out the form below using your institutional address. Generic domains will be rejected by our automated SDR.
        </p>
        <ContactForm />
      </section>
    </main>
  );
}
