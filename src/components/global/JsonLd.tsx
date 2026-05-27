import { useTranslations } from "next-intl";
import {
  SITE_URL,
  SUPPORT_EMAIL,
  SOCIAL_PROFILES,
  APP_STORE_URL,
  PLAY_STORE_URL,
  APP_FEATURES,
} from "@/lib/app-meta";

export function JsonLd({ locale }: { locale: string }) {
  const t = useTranslations("Metadata");
  const homeT = useTranslations("Home.Hero");

  const baseUrl = SITE_URL;
  // localePrefix="always": every locale is prefixed, incl. the default.
  const localizedUrl = `${baseUrl}/${locale}`;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    "name": "TUGGI",
    "url": baseUrl,
    "logo": `${baseUrl}/images/logo_tuggi_full.png`,
    "description": t("rootDescription"),
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": SUPPORT_EMAIL,
      "availableLanguage": ["English", "Portuguese", "Spanish"],
    },
    // Real public profiles — fill SOCIAL_PROFILES in src/lib/app-meta.ts.
    "sameAs": SOCIAL_PROFILES,
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TUGGI",
    "operatingSystem": "iOS, Android",
    "applicationCategory": "TravelApplication",
    "description": homeT("subtitle"),
    "url": baseUrl,
    "downloadUrl": [APP_STORE_URL, PLAY_STORE_URL],
    "installUrl": APP_STORE_URL,
    // Official store listings as identity references — ties this app entity to
    // its App Store / Google Play pages for AI engines and knowledge graphs.
    "sameAs": [APP_STORE_URL, PLAY_STORE_URL],
    "screenshot": `${baseUrl}/images/og-image-tuggi.jpg`,
    "featureList": APP_FEATURES,
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD",
    },
    "publisher": { "@id": `${baseUrl}/#organization` },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    "name": "TUGGI",
    "url": localizedUrl,
    "description": t("homeDescription"),
    "publisher": {
      "@id": `${baseUrl}/#organization`,
    },
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
