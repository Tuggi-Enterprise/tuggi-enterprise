import { FleetsHero } from "@/components/blocks/FleetsHero";
import { FleetsFinancial } from "@/components/blocks/FleetsFinancial";
import { FleetsRisk } from "@/components/blocks/FleetsRisk";
import { FleetsNPS } from "@/components/blocks/FleetsNPS";
import { FleetsBrand } from "@/components/blocks/FleetsBrand";
import { FleetsESG } from "@/components/blocks/FleetsESG";

export async function generateMetadata() {
  return {
    title: "Tuggi Fleets | Ancillary Revenue for Car Rentals",
  };
}

export default async function FleetsPage() {
  return (
    <article className="min-h-screen">
      <FleetsHero />
      <FleetsFinancial />
      <FleetsRisk />
      <FleetsNPS />
      <FleetsBrand />
      <FleetsESG />
    </article>
  );
}
