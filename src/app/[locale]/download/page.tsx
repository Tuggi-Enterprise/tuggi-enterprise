import { getTranslations, setRequestLocale } from "next-intl/server";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Download" });
  
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
    robots: {
        index: false,
        follow: true,
    }
  };
}

export default async function DownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ID?: string; p?: string; partner_id?: string }>;
}) {
  const { locale } = await params;
  const { ID, p, partner_id } = await searchParams;
  const partnerId = ID || p || partner_id;

  setRequestLocale(locale);

  // Define language mapping to match DB standards (e.g., pt-br, en-us, etc.)
  const getDbLang = (loc: string) => {
    switch (loc) {
      case "en": return "en-us";
      case "es": return "es-es";
      case "pt-br": return "pt-br";
      case "pt-pt": return "pt-pt";
      default: return "en-us";
    }
  };

  const dbLang = getDbLang(locale);
  let partnerData: any = null;

  if (partnerId) {
    try {
      const supabase = getSupabaseServer();
      
      // Step 1: Get client and their welcome_poi_id
      const { data: client, error: clientError } = await supabase
        .schema("core")
        .from("clients")
        .select("company_name, welcome_poi_id, metadata")
        .eq("id", partnerId)
        .single();

      if (!clientError && client) {
        // Find welcome_poi_id either in column or metadata
        const welcomePoiId = client.welcome_poi_id || client.metadata?.welcome_poi_id;

        if (welcomePoiId) {
          // Step 2: Get audio and text from attraction_descriptions
          // We try the current locale first
          let { data: description, error: descError } = await supabase
            .schema("core")
            .from("attraction_descriptions")
            .select("audio_url, description")
            .eq("attraction_id", welcomePoiId)
            .eq("language", dbLang)
            .single();

          // Fallback to en-us if locale not found or error
          if (descError || !description) {
            const { data: enFallback } = await supabase
              .schema("core")
              .from("attraction_descriptions")
              .select("audio_url, description")
              .eq("attraction_id", welcomePoiId)
              .eq("language", "en-us")
              .single();
            
            if (enFallback) {
              description = enFallback;
            }
          }

          if (description) {
            partnerData = {
              name: client.company_name,
              audioUrl: description.audio_url,
              description: description.description,
            };
          } else {
            // Fallback to just the company name
            partnerData = { name: client.company_name };
          }
        } else {
          partnerData = { name: client.company_name };
        }
      }
    } catch (err) {
      console.error("Error fetching partner data:", err);
    }
  }

  return (
    <main>
      <PartnerHeroWrapper partnerData={partnerData} />
    </main>
  );
}
