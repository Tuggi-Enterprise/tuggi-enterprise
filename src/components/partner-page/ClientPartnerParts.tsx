"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";
import { useWelcomeAudio } from "@/components/blocks/useWelcomeAudio";
import { usePlatform } from "@/lib/conversionHooks";
import { formatSocial, normalizeUrl, socialHref } from "@/lib/partner-links";
import { sendPartnerPageEvent, type PartnerEventParams } from "@/lib/partner-page-events";

/** Past this length the description opens collapsed, as it did on the download layout. */
const DESCRIPTION_COLLAPSE_AT = 220;

/** The GA4 events of a hotel's page, with the partner (when the page credits one) and the platform. */
function usePartnerEvents(partnerId: string | undefined) {
  const platform = usePlatform();
  return (eventName: string, params?: PartnerEventParams) =>
    sendPartnerPageEvent(eventName, { partner_id: partnerId, platform, ...params });
}

interface PartnerAboutProps {
  /** The partner the page credits; absent when it does not (BR-B2B-067 items 3 and 6). */
  partnerId?: string;
  description: string;
  website?: string | null;
  social?: string | null;
}

/**
 * The text of a hotel or a restaurant and its contacts (spec §7.2, w02): the
 * same description, collapse control and links the page had before the frame.
 *
 * The whole description is in the server HTML, collapsed only by CSS, so the
 * text the Google indexes is the partner's whole text.
 */
export function PartnerAbout({ partnerId, description, website, social }: PartnerAboutProps) {
  const t = useTranslations("Download");
  const track = usePartnerEvents(partnerId);
  const [expanded, setExpanded] = useState(false);
  const isLong = description.length > DESCRIPTION_COLLAPSE_AT;
  const socialLink = social ? socialHref(social) : null;

  // The page view of a partner's page, as the download layout counted it.
  useEffect(() => {
    if (partnerId) track("partner_download_page_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const linkClass =
    "inline-flex items-center gap-1 text-base font-bold text-tuggi-primary-text underline-offset-4 hover:underline";

  return (
    <>
      <div className="mt-6 max-w-xl">
        <p
          data-testid="partner-description"
          className={`whitespace-pre-line text-lg leading-relaxed text-tuggi-dark ${isLong && !expanded ? "line-clamp-4" : ""}`}
        >
          {description}
        </p>
        {isLong && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => {
              const next = !expanded;
              setExpanded(next);
              track("download_page_description_toggle", { action: next ? "expand" : "collapse" });
            }}
            className="mt-1 text-sm font-bold uppercase tracking-wider text-tuggi-primary-text hover:underline"
          >
            {expanded ? t("readLess") : t("readMore")}
          </button>
        )}
      </div>

      {(website || social) && (
        <div data-testid="partner-contacts" className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {website && (
            <a
              href={normalizeUrl(website)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("partner_contact_click", { kind: "website" })}
              className={linkClass}
            >
              {t("partnerVisitSite")} <span aria-hidden="true">↗</span>
            </a>
          )}
          {social &&
            (socialLink ? (
              <a
                href={socialLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("partner_contact_click", { kind: "social" })}
                className={linkClass}
              >
                {formatSocial(social)} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <span className="text-base font-bold text-tuggi-dark">{formatSocial(social)}</span>
            ))}
        </div>
      )}
    </>
  );
}

interface WelcomeAudioCardProps {
  partnerId?: string;
  audioUrl: string;
  audioLang: string;
  /** The place's name, the title of the card. */
  name: string;
  label: string;
}

/**
 * The welcome audio of a hotel or a restaurant in the frame of the one page
 * (spec §7.2, w02): the right column at 1440, below the action at 390. The
 * player is `useWelcomeAudio`, the one the download layout plays.
 *
 * The card is in the server HTML at its final size, so the audio loading late
 * moves nothing; the button plays once the clip can.
 */
export function WelcomeAudioCard({ partnerId, audioUrl, audioLang, name, label }: WelcomeAudioCardProps) {
  const tPlayer = useTranslations("Download.Player");
  const tA11y = useTranslations("A11y");
  const track = usePartnerEvents(partnerId);
  const { isPlaying, progress, ready, autoplayBlocked, toggle } = useWelcomeAudio(audioUrl, audioLang, false, track);
  const status = isPlaying ? tPlayer("playing") : autoplayBlocked ? tPlayer("tapToPlay") : tPlayer("paused");

  return (
    <aside
      data-testid="partner-welcome-audio"
      className="self-start rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 lg:mt-24"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-tuggi-slate">{label}</p>
      <h2 className="mt-1 text-xl font-extrabold leading-snug">{name}</h2>
      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={!ready && !autoplayBlocked}
          aria-label={isPlaying ? tA11y("pauseAudio") : tA11y("playAudio")}
          aria-pressed={isPlaying}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tuggi-primary text-white shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark focus-visible:ring-offset-2"
        >
          {isPlaying ? <Pause size={22} aria-hidden="true" /> : <Play size={22} className="ml-1" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-tuggi-primary transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <p aria-live="polite" className="mt-2 text-sm text-tuggi-slate">
            {status}
          </p>
        </div>
      </div>
    </aside>
  );
}
