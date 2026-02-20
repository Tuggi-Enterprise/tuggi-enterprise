import { CityOSHero } from "@/components/blocks/CityOSHero";
import { CityOSRegulatory } from "@/components/blocks/CityOSRegulatory";
import { CityOSSustainability } from "@/components/blocks/CityOSSustainability";
import { CityOSAccessibility } from "@/components/blocks/CityOSAccessibility";
import { CityOSIntelligence } from "@/components/blocks/CityOSIntelligence";
import { CityOSMandate } from "@/components/blocks/CityOSMandate";

export async function generateMetadata() {
  return {
    title: "City OS: Territorial Governance & Legal Compliance | TUGGI",
  };
}

export default async function CityOSPage() {
  return (
    <article className="min-h-screen">
      <CityOSHero />
      <CityOSRegulatory />
      <CityOSSustainability />
      <CityOSAccessibility />
      <CityOSIntelligence />
      <CityOSMandate />
    </article>
  );
}
