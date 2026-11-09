"use client";

import { useEffect, useRef, useState } from "react";
import type { PartnerEventParams } from "@/lib/partner-page-events";

/** The "call" clips in `public/audio/`, one per welcome dialect. */
const KNOWN_CALLS = ["en-us", "es-es", "pt-br", "pt-pt", "it-it", "de-de", "fr-fr"];

export interface WelcomeAudio {
  isPlaying: boolean;
  /** 0 to 100, across the welcome and the call that follows it. */
  progress: number;
  /** The welcome can play through. */
  ready: boolean;
  /** The browser refused to start it without a gesture. */
  autoplayBlocked: boolean;
  toggle: () => void;
}

/**
 * The partner's welcome audio: the first 12 s of it, faded out into the
 * "call" in the visitor's dialect. A Tuggi welcome plays whole, with no call.
 * It tries to start on its own and, when the browser refuses, on the first
 * click or touch anywhere on the page.
 *
 * The one player of the partner page, for the old download layout
 * (`PartnerHero`) and the hotel in the frame of the one page
 * (`WelcomeAudioCard`). `audioLang` is the dialect resolved on the server
 * (`pt-pt`, `pt-br`, `en-us`…), not the UI locale, so a visitor in Portugal
 * hears the pt-pt call.
 */
export function useWelcomeAudio(
  audioUrl: string | undefined,
  audioLang: string | undefined,
  isTuggi: boolean | undefined,
  onEvent: (eventName: string, params?: PartnerEventParams) => void
): WelcomeAudio {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const mainMaxDuration = isTuggi ? 9999 : 12;

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.volume = 1;
    audioRef.current = audio;

    const lang = (audioLang || "").toLowerCase();
    const callFile = KNOWN_CALLS.includes(lang) ? `call_${lang}-male.mp3` : "call_en-us-male.mp3";
    const callAudio = new Audio(`/audio/${callFile}`);
    callAudio.volume = 1;
    callAudioRef.current = callAudio;

    let currentTrack = "main";

    const tryPlay = () => {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          setAutoplayBlocked(true);
        });
    };

    const playOnInteraction = () => {
      const trackToPlay = currentTrack === "main" ? audio : callAudio;
      if (!trackToPlay.paused) {
        document.removeEventListener("click", playOnInteraction, true);
        document.removeEventListener("touchstart", playOnInteraction, true);
        return;
      }

      const playPromise = trackToPlay.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
            setReady(true);

            // Prime the secondary track synchronously so iOS unlocks it
            if (currentTrack === "main") {
              callAudio
                .play()
                .then(() => {
                  callAudio.pause();
                  callAudio.currentTime = 0;
                })
                .catch(() => {});
            }

            onEventRef.current("download_page_audio_auto_played");

            // Only remove listeners after successful playback
            document.removeEventListener("click", playOnInteraction, true);
            document.removeEventListener("touchstart", playOnInteraction, true);
          })
          .catch((e) => {
            console.warn("Autoplay still blocked on this interaction:", e);
          });
      }
    };

    document.addEventListener("click", playOnInteraction, { capture: true });
    document.addEventListener("touchstart", playOnInteraction, { capture: true });

    audio.addEventListener("canplaythrough", () => {
      setReady(true);
      if (currentTrack === "main") tryPlay();
    });

    audio.addEventListener("ended", () => {
      if (isTuggi) {
        setIsPlaying(false);
        setProgress(100);
        currentTrack = "ended";
      }
    });

    audio.addEventListener("timeupdate", () => {
      // 1. Progress bar (only while the main track is the one playing)
      if (currentTrack === "main") {
        const totalDur = isTuggi ? audio.duration || 0 : 18;
        const value = totalDur > 0 ? (audio.currentTime / totalDur) * 100 : 0;
        setProgress(Math.min(value, 100));
      }

      // 2. Smooth fade-out, starting 2.5 s before the end of the main track
      const fadeStart = mainMaxDuration - 2.5;
      if (audio.currentTime >= fadeStart && audio.currentTime <= mainMaxDuration) {
        const remaining = mainMaxDuration - audio.currentTime;
        audio.volume = Math.max(0, remaining / 2.5);
      }

      // 3. Crossfade: the call starts 1 s before the main track stops
      const crossfadeStart = mainMaxDuration - 1;
      if (audio.currentTime >= crossfadeStart && currentTrack === "main") {
        currentTrack = "call";
        callAudio.play().catch(() => {});
      }

      // 4. Final halt of the main track
      if (audio.currentTime >= mainMaxDuration) {
        audio.pause();
        audio.volume = 1; // reset in case the visitor replays
      }
    });

    callAudio.addEventListener("timeupdate", () => {
      if (currentTrack !== "call") return;
      const callDur = isNaN(callAudio.duration) ? 6 : callAudio.duration;
      const totalDur = mainMaxDuration + callDur;
      const value = ((mainMaxDuration + callAudio.currentTime) / totalDur) * 100;
      setProgress(Math.min(value, 100));
    });

    callAudio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(100);
      currentTrack = "ended";
    });

    return () => {
      audio.pause();
      callAudio.pause();
      document.removeEventListener("click", playOnInteraction, true);
      document.removeEventListener("touchstart", playOnInteraction, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, audioLang]);

  const toggle = () => {
    const audio = audioRef.current;
    const callAudio = callAudioRef.current;
    if (!audio || !callAudio) return;

    let current = audio;
    if (audio.currentTime >= mainMaxDuration || audio.ended) {
      current = callAudio;
    }

    if (isPlaying) {
      current.pause();
      setIsPlaying(false);
      onEventRef.current("download_page_play_button_click", { action: "pause" });
    } else {
      if (current === callAudio && callAudio.ended) {
        audio.currentTime = 0;
        callAudio.currentTime = 0;
        current = audio;
        setProgress(0);
      }
      current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
          onEventRef.current("download_page_play_button_click", { action: "play" });
        })
        .catch((e) => {
          console.warn("Audio play failed:", e);
        });
    }
  };

  return { isPlaying, progress, ready, autoplayBlocked, toggle };
}
