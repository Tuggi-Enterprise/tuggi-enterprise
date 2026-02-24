import { useTranslations } from "next-intl";

export function JsonLd({ locale }: { locale: string }) {
  const t = useTranslations("Metadata");
  const homeT = useTranslations("Home.Hero");

  const baseUrl = "https://tuggi.app";
  const localizedUrl = `${baseUrl}/${locale === "en" ? "" : locale}`;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TUGGI",
    "url": baseUrl,
    "logo": `${baseUrl}/images/logo_tuggi_full.png`,
    "description": t("rootDescription"),
    "sameAs": [
      // Add social media links if available
    ]
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Tuggi",
    "operatingSystem": "iOS, Android",
    "applicationCategory": "TravelApplication",
    "description": homeT("subtitle"),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "500"
    },
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "TUGGI",
    "url": localizedUrl,
    "description": t("homeDescription"),
    "publisher": {
      "@id": `${baseUrl}/#organization`
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
