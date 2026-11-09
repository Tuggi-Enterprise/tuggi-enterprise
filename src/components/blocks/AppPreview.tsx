import { getTranslations } from "next-intl/server";
import { ClipboardPaste } from "lucide-react";
import { encode } from "uqr";
import type { StorePlatform } from "@/lib/store-platform";

/**
 * What the visitor will see in the app — DS-COMPONENTE-117, card #1135, spec
 * `docs/design/spec-quem-te-trouxe-2026-11.md` §6.
 *
 * The pages a person crosses before the store (`/c/` and the partner page)
 * show the step "Alguém te indicou o Tuggi?" of the onboarding as an inert
 * drawing in HTML, so the screen is recognised when it shows up after the
 * install. Server component: the variant comes from the user agent of the
 * request (`storePlatformOf`) in the same render, so nothing swaps on the
 * client and nothing shifts.
 *
 * INERT ON PURPOSE. The frame is `aria-hidden` and takes no pointer, and its
 * "buttons" are spans: a fake button on a conversion page is a lost tap. What
 * a screen reader reads, and what the page really says, are the steps below
 * the frame.
 *
 * Nothing here states a benefit (BR-MONETIZACAO-085, ceiling 1; BR-B2B-067
 * item 3): it says what the person sees and what happens.
 */

export type AppPreviewInvite =
  /** `/c/`: the friend joins the caravan of `nickname` (no `@`); `shared` is the code or the @ the field shows. */
  | { kind: "friend"; nickname: string; shared: string }
  /** The partner page: `partner` is the partner's public name, no `@`. */
  | { kind: "partner"; partner: string };

const STEP_NUMBER =
  "shrink-0 w-7 h-7 rounded-full bg-tuggi-primary text-white font-extrabold text-sm flex items-center justify-center";

export async function AppPreview({
  platform,
  invite,
}: {
  platform: StorePlatform;
  invite: AppPreviewInvite;
}) {
  const t = await getTranslations("AppPreview");
  const both = platform === "other";
  const showIos = platform !== "android";
  const showAndroid = platform !== "ios";
  const result =
    invite.kind === "friend"
      ? t("result_friend", { nickname: invite.nickname })
      : t("result_partner", { partner: invite.partner });
  const prefill = invite.kind === "friend" ? invite.shared : `@${invite.partner}`;

  const frame = (os: "ios" | "android") => (
    <PreviewFrame
      os={os}
      narrow={both}
      title={t("screen_title")}
      // On the partner page the body talks about a caravan, which is not what
      // happens there: title and Paste only (copy spec §6.b).
      body={invite.kind === "friend" ? t("screen_body") : null}
      paste={t("screen_paste")}
      confirm={t("screen_confirm")}
      prefill={prefill}
    />
  );

  return (
    <section
      data-testid="app-preview"
      data-platform={platform}
      aria-labelledby="app-preview-title"
      className="w-full text-left"
    >
      <h2 id="app-preview-title" className="text-xl font-extrabold text-tuggi-dark mb-4 text-center">
        {t("title")}
      </h2>

      {both ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center gap-2">
            <span aria-hidden className="text-sm font-bold text-tuggi-dark">
              {t("ios_label")}
            </span>
            {frame("ios")}
          </div>
          <div className="flex flex-col items-center gap-2">
            <span aria-hidden className="text-sm font-bold text-tuggi-dark">
              {t("android_label")}
            </span>
            {frame("android")}
          </div>
        </div>
      ) : (
        <div className="flex justify-center">{frame(showIos ? "ios" : "android")}</div>
      )}

      <ol data-app-preview-steps className="mt-6 flex flex-col gap-3">
        <li className="flex gap-3 items-start">
          <span aria-hidden className={STEP_NUMBER}>
            1
          </span>
          <div className="flex flex-col gap-2 pt-0.5 text-tuggi-slate leading-relaxed">
            {showIos && (
              <p data-testid="app-preview-step-ios">
                {both && <span className="block font-bold text-tuggi-dark">{t("ios_label")}</span>}
                {t("ios_step")}
              </p>
            )}
            {showAndroid && (
              <p data-testid="app-preview-step-android">
                {both && <span className="block font-bold text-tuggi-dark">{t("android_label")}</span>}
                {t("android_step")}
              </p>
            )}
          </div>
        </li>
        <li className="flex gap-3 items-start">
          <span aria-hidden className={STEP_NUMBER}>
            2
          </span>
          <p data-testid="app-preview-result" className="pt-0.5 font-bold text-tuggi-dark leading-relaxed">
            {result}
          </p>
        </li>
      </ol>
    </section>
  );
}

/**
 * The bottom half of a phone: the sheet of the step over `tuggi-bg`. iPhone
 * shows the empty field and the system paste capsule with a highlight ring
 * (DS-COMPONENTE-116); Android shows the field already filled from the Play
 * referrer and the confirm button.
 */
function PreviewFrame({
  os,
  narrow,
  title,
  body,
  paste,
  confirm,
  prefill,
}: {
  os: "ios" | "android";
  narrow: boolean;
  title: string;
  body: string | null;
  paste: string;
  confirm: string;
  prefill: string;
}) {
  return (
    <div
      aria-hidden
      data-testid={`app-preview-frame-${os}`}
      className={`pointer-events-none select-none w-full ${
        narrow ? "max-w-[200px]" : "max-w-[240px]"
      } rounded-3xl border border-tuggi-border bg-tuggi-bg shadow-[0_8px_24px_rgba(8,17,33,0.08)] overflow-hidden`}
    >
      <div className="h-8 flex items-center justify-center">
        <span className="w-14 h-1.5 rounded-full bg-tuggi-border" />
      </div>
      <div className="mt-4 rounded-t-2xl bg-white border-t border-tuggi-border px-4 pt-5 pb-6 flex flex-col gap-3">
        <span className="text-sm font-extrabold text-tuggi-dark leading-snug">{title}</span>
        {body && <span className="text-xs text-tuggi-slate leading-snug">{body}</span>}
        {os === "ios" ? (
          <>
            <span className="h-9 rounded-lg border border-tuggi-border bg-tuggi-bg" />
            <span className="self-center inline-flex items-center gap-1.5 rounded-full bg-tuggi-primary text-white text-xs font-bold px-4 py-2 ring-4 ring-tuggi-primary/25">
              <ClipboardPaste size={14} />
              {paste}
            </span>
          </>
        ) : (
          <>
            <span className="h-9 rounded-lg border border-tuggi-primary-text px-3 flex items-center text-xs font-bold text-tuggi-dark truncate">
              {prefill}
            </span>
            <span className="rounded-xl bg-tuggi-primary text-white text-xs font-bold py-2 text-center">
              {confirm}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The QR of the page itself, for a visitor on a computer (DS-COMPONENTE-117):
 * read with the phone, it opens the same page, where the preview is the one
 * of that phone. SVG drawn on the server, 160 px, four modules of quiet zone,
 * `tuggi-dark` on white, with the short address under it for whoever prefers
 * to type.
 */
export async function AppPreviewQr({ url }: { url: string }) {
  const t = await getTranslations("AppPreview");
  const { size, data } = encode(url, { ecc: "M", border: 4 });
  let path = "";
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    })
  );
  const shortUrl = url.replace(/^https?:\/\/(www\.)?/, "");

  return (
    <figure data-testid="app-preview-qr" className="flex flex-col items-center gap-2">
      <svg
        role="img"
        aria-labelledby="app-preview-qr-caption"
        viewBox={`0 0 ${size} ${size}`}
        width={160}
        height={160}
        shapeRendering="crispEdges"
        className="text-tuggi-dark rounded-xl border border-tuggi-border"
      >
        <rect width={size} height={size} fill="white" />
        <path d={path} fill="currentColor" />
      </svg>
      <figcaption id="app-preview-qr-caption" className="text-sm text-tuggi-slate text-center">
        {t("qr_caption")}
      </figcaption>
      <span data-testid="app-preview-qr-url" className="text-sm font-bold text-tuggi-dark">
        {shortUrl}
      </span>
    </figure>
  );
}
