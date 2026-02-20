import { CityOSHero } from "@/components/blocks/CityOSHero";
import { CityOSRegulatory } from "@/components/blocks/CityOSRegulatory";
import { CityOSDecompression } from "@/components/blocks/CityOSDecompression";
import { CityOSWhiteLabel } from "@/components/blocks/CityOSWhiteLabel";
import { CityOSMandate } from "@/components/blocks/CityOSMandate";

export async function generateMetadata() {
  return {
    title: "City OS: Territorial Governance & Legal Compliance | TUGGI",
  };
}

export default async function CityOSPage() {
  return (
    <>
      <CityOSHero />
      <CityOSRegulatory />
      <CityOSDecompression />
      <CityOSWhiteLabel />
      <CityOSMandate />
    </>
  );
}
