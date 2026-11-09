import { headers } from "next/headers";
import { PartnerHeroWrapper } from "@/components/blocks/PartnerHeroWrapper";
import { AppPreview, AppPreviewQr } from "@/components/blocks/AppPreview";
import { SITE_URL } from "@/lib/app-meta";
import { storePlatformOf } from "@/lib/store-platform";
import type { CouponPreview, PartnerData } from "@/lib/partner";

interface ClientPartnerPageProps {
  partner: PartnerData;
  coupon: CouponPreview | null;
  /** The partner's slug, for the app preview's invite. */
  slug: string;
  /** The address the QR of a computer opens: the page itself. */
  qrPath: string;
  /** False when the page must not credit the partner (BR-B2B-067 items 3 and 6). */
  attributes: boolean;
}

/**
 * The page of a place or a client (hotel, restaurant…), BR-B2B-067 item 2.a.
 * `/d/{slug}` and `/@nome` render this same component from the same read
 * (`lookupPartnerSlug`), which is what makes them one page (BR-B2B-037 item 2).
 */
export async function ClientPartnerPage({ partner, coupon, slug, qrPath, attributes }: ClientPartnerPageProps) {
  // What the visitor will see in the app (DS-COMPONENTE-117, #1135), from the
  // user agent of this request. Never for Tuggi's own slug. It names the
  // partner and nothing else (BR-B2B-067 item 3). On a computer the QR of this
  // page comes first.
  const platform = storePlatformOf((await headers()).get("user-agent"));
  const previewSlot = partner.isTuggi ? null : (
    <>
      {platform === "other" && (
        <div className="mb-6">
          <AppPreviewQr url={`${SITE_URL}${qrPath}`} />
        </div>
      )}
      <AppPreview platform={platform} invite={{ kind: "partner", partner: slug }} />
    </>
  );

  return (
    <main data-partner-page="client">
      <PartnerHeroWrapper
        partnerData={partner}
        partnerId={attributes ? partner.id : undefined}
        coupon={coupon}
        previewSlot={previewSlot}
      />
    </main>
  );
}
