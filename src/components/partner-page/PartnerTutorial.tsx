import { getTranslations } from "next-intl/server";
import type { StorePlatform } from "@/lib/store-platform";

interface PartnerTutorialProps {
  locale: string;
  /** What the server read from the request: the steps of this phone, or both on a computer. */
  platform: StorePlatform;
  /** The partner's name as the page shows it (BR-B2B-070 item 4, BR-B2B-067 item 2). */
  partner: string;
}

/**
 * The three steps beside the store action on a hotel's or a restaurant's page
 * (spec onda 1 §1, copy onda 1 §1). There is no "copy" step: the App Store tap
 * already writes the link to the pasteboard and the Play carries it in the
 * referrer. Nothing here speaks of days or gifts (BR-B2B-009 item 1,
 * BR-B2B-067 item 3).
 *
 * On a computer the first step is the QR beside the list, and the third shows
 * both phones, each under its own label.
 */
export async function PartnerTutorial({ locale, platform, partner }: PartnerTutorialProps) {
  const t = await getTranslations({ locale, namespace: "PartnerPage" });
  const tPreview = await getTranslations({ locale, namespace: "AppPreview" });

  const steps =
    platform === "other"
      ? [
          tPreview("qr_caption"),
          t("tutorialStep2"),
          <>
            <span className="block">
              <strong>{tPreview("ios_label")}:</strong> {t("tutorialStep3Ios")}
            </span>
            <span className="mt-1 block">
              <strong>{tPreview("android_label")}:</strong> {t("tutorialStep3Android", { partner })}
            </span>
          </>,
        ]
      : [
          t("tutorialStep1"),
          t("tutorialStep2"),
          platform === "ios" ? t("tutorialStep3Ios") : t("tutorialStep3Android", { partner }),
        ];

  return (
    <ol data-testid="partner-tutorial" className="mt-5 flex flex-col gap-2.5">
      {steps.map((step, index) => (
        <li key={index} className="flex items-start gap-3 text-base leading-[22px] text-tuggi-dark">
          <span
            aria-hidden="true"
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-tuggi-primary/10 text-sm font-bold text-tuggi-dark"
          >
            {index + 1}
          </span>
          <span data-testid="partner-tutorial-step" className="min-w-0 pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}
