"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Subtitles } from "lucide-react";
import { useTranslations } from "next-intl";

// SVG viewBox constants
const ROAD_X = 150;
const CAR_START_Y = 520;
const CAR_END_Y = 80;
const POI_Y = 335;
// 30s countdown at end (same as InteractiveSimulator on home page)
const WAIT_STEPS = 30000 / 40;
const SHRINK_PER_STEP = (CAR_START_Y - CAR_END_Y) / WAIT_STEPS;

export function DriveHeroAnimator() {
  const t = useTranslations("Drive.Hero");

  const [progress, setProgress] = useState(0);
  const [isTriggered, setIsTriggered] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isWaitingAtEnd, setIsWaitingAtEnd] = useState(false);
  const [shrinkBottomY, setShrinkBottomY] = useState(CAR_START_Y);
  const [showCC, setShowCC] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Progress loop — freezes when paused
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return;
      setProgress((prev) => {
        if (isWaitingAtEnd) return 100;
        return Math.min(prev + 0.55, 100);
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isWaitingAtEnd, isPaused]);

  // Detect end of journey
  useEffect(() => {
    if (progress >= 100 && !isWaitingAtEnd) {
      setIsWaitingAtEnd(true);
    }
  }, [progress, isWaitingAtEnd]);

  // Initialize shrinkBottomY when countdown starts
  useEffect(() => {
    if (isWaitingAtEnd) setShrinkBottomY(CAR_START_Y);
  }, [isWaitingAtEnd]);

  // Run shrink countdown — pauses independently of progress loop
  useEffect(() => {
    if (!isWaitingAtEnd || isPaused) return;
    const shrinkInterval = setInterval(() => {
      setShrinkBottomY((prev) => Math.max(prev - SHRINK_PER_STEP, CAR_END_Y));
    }, 40);
    return () => clearInterval(shrinkInterval);
  }, [isWaitingAtEnd, isPaused]);

  // Reset when countdown completes
  useEffect(() => {
    if (isWaitingAtEnd && shrinkBottomY <= CAR_END_Y + 2) {
      setProgress(0);
      setIsTriggered(false);
      setHasTriggered(false);
      setIsWaitingAtEnd(false);
      setShrinkBottomY(CAR_START_Y);
      setShowCC(false);
    }
  }, [shrinkBottomY, isWaitingAtEnd]);

  const carY = CAR_START_Y - (progress / 100) * (CAR_START_Y - CAR_END_Y);
  const lineBottomY = isWaitingAtEnd ? shrinkBottomY : CAR_START_Y;

  // Trigger on POI
  useEffect(() => {
    if (carY <= POI_Y && !hasTriggered) {
      setIsTriggered(true);
      setHasTriggered(true);
    }
  }, [carY, hasTriggered]);

  // Overlay stays visible from trigger until full reset
  const showOverlay = isTriggered;

  const handleToggle = () => {
    if (!isPaused) {
      setIsPaused(true);
    } else {
      // Restart from zero
      setProgress(0);
      setIsTriggered(false);
      setHasTriggered(false);
      setIsWaitingAtEnd(false);
      setShrinkBottomY(CAR_START_Y);
      setShowCC(false);
      setIsPaused(false);
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden">

      {/* SVG Map — light theme, vertical road */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 300 600"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Light map background */}
        <rect width="300" height="600" fill="#EFF4EB" />

        {/* City blocks — left */}
        <rect x="10" y="20"  width="88" height="72" rx="4" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="10" y="112" width="88" height="88" rx="4" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        <rect x="10" y="222" width="88" height="80" rx="4" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="10" y="330" width="88" height="88" rx="4" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        <rect x="10" y="450" width="88" height="72" rx="4" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="10" y="546" width="88" height="60" rx="4" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />

        {/* City blocks — right */}
        <rect x="202" y="20"  width="90" height="82" rx="4" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="202" y="122" width="90" height="70" rx="4" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        {/* Green park near POI */}
        <rect x="197" y="215" width="96" height="110" rx="5" fill="#B8CEB9" stroke="#96B498" strokeWidth="1.5" />
        <rect x="202" y="358" width="90" height="78" rx="4" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="202" y="458" width="90" height="76" rx="4" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        <rect x="202" y="556" width="90" height="50" rx="4" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />

        {/* Horizontal cross streets */}
        <rect x="0" y="104" width="300" height="8" fill="#FFFFFF" opacity="0.9" />
        <rect x="0" y="212" width="300" height="8" fill="#FFFFFF" opacity="0.9" />
        <rect x="0" y="320" width="300" height="8" fill="#FFFFFF" opacity="0.9" />
        <rect x="0" y="442" width="300" height="8" fill="#FFFFFF" opacity="0.9" />
        <rect x="0" y="542" width="300" height="8" fill="#FFFFFF" opacity="0.9" />

        {/* Main vertical road */}
        <rect x="120" y="0" width="60" height="600" fill="#FFFFFF" />
        <line x1="150" y1="0" x2="150" y2="600" stroke="#C4CEC6" strokeWidth="1.5" strokeDasharray="14 10" />
        <text x="126" y="54" fontSize="6.5" fill="#8A9A8B" fontFamily="system-ui, sans-serif" fontWeight="700" letterSpacing="0.5">AV.</text>
        <text x="124" y="63" fontSize="6.5" fill="#8A9A8B" fontFamily="system-ui, sans-serif" fontWeight="700" letterSpacing="0.5">TURÍSTICA</text>

        {/* Connector: road edge → POI */}
        <line x1="180" y1="275" x2="207" y2="275" stroke="#00A8E8" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />

        {/* Ghost full route */}
        <line x1={ROAD_X} y1={CAR_END_Y} x2={ROAD_X} y2={CAR_START_Y} stroke="#00A8E8" strokeWidth="4" strokeLinecap="round" opacity="0.12" />

        {/* Active route (countdown shrinks from bottom up) */}
        <line x1={ROAD_X} y1={carY} x2={ROAD_X} y2={lineBottomY} stroke="#00A8E8" strokeWidth="4" strokeLinecap="round" />

        {/* Orange trigger point ON the road — matches real app marker style */}
        <g transform={`translate(${ROAD_X}, ${POI_Y})`}>
          {isTriggered && (
            <circle fill="none" stroke="#FF6F00" strokeWidth="3" r="20">
              <animate attributeName="r" values="18;55" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
          <circle r="36" fill="#FF6F00" fillOpacity="0.10" stroke="#FF6F00" strokeWidth="1.5" strokeOpacity="0.35" />
          <circle r="11" fill="#FF6F00" stroke="white" strokeWidth="1.5" />
          {/* Lightning bolt */}
          <path d="M 1,-6 L -3,-1 L 0,-1 L -1,6 L 3,1 L 0,1 Z" fill="white" strokeWidth="0" />
        </g>

        {/* Blue POI pin — right side in the park */}
        <g transform="translate(233, 265)">
          <ellipse cx="0" cy="24" rx="7" ry="3" fill="black" opacity="0.18" />
          <path
            d="M 0,-20 C -9,-20 -16,-13 -16,-4 C -16,7 0,20 0,20 C 0,20 16,7 16,-4 C 16,-13 9,-20 0,-20 Z"
            fill="#00A8E8" stroke="white" strokeWidth="2"
          />
          <circle cx="0" cy="-4" r="6" fill="white" />
          <circle cx="0" cy="-4" r="3" fill="#00A8E8" />
          <g transform="translate(0, -37)">
            <rect x="-42" y="-12" width="84" height="18" rx="3" fill="white" opacity="0.96" />
            <text x="0" y="1" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1e2936" fontFamily="system-ui, -apple-system, sans-serif">
              Miradouro da Serra
            </text>
          </g>
        </g>

        {/* Car — native SVG transform for mobile compatibility */}
        <g transform={`translate(${ROAD_X}, ${carY})`}>
          <ellipse cx="0" cy="16" rx="11" ry="4" fill="black" opacity="0.12" />
          <circle r="15" fill="#00A8E8" />
          <circle r="12" fill="#0090C8" />
          <path d="M 0,-8 L 6,5 L 0,2 L -6,5 Z" fill="white" />
        </g>
      </svg>

      {/* Notification banner overlay — slides from top (below notch), stays until reset */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            className="absolute top-7 left-0 right-0 z-10"
            initial={{ y: -120 }}
            animate={{ y: 0 }}
            exit={{ y: -120 }}
            transition={{ type: "spring", damping: 24, stiffness: 220 }}
          >
            {/* White content card */}
            <div className="bg-white px-4 py-3 rounded-b-2xl shadow-xl flex items-center gap-3">
              {/* Blue directional circle — matches app screenshot */}
              <div className="w-12 h-12 rounded-full bg-[#00A8E8] flex items-center justify-center flex-shrink-0 shadow-md">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M 19,11 L 5,17 L 8.5,11 L 5,5 Z" fill="white" />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#0B1220] truncate leading-tight">{t("animatorPoi")}</p>
                <p className="text-xs text-gray-400 leading-tight mt-0.5">{t("animatorAhead")}</p>
              </div>

              {/* CC button */}
              <motion.button
                onClick={() => setShowCC((v) => !v)}
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  showCC ? "bg-[#00A8E8] text-white" : "bg-gray-100 text-gray-400"
                }`}
                whileTap={{ scale: 0.88 }}
                aria-label="Toggle Captions"
              >
                <Subtitles className="w-4 h-4" />
              </motion.button>

              {/* Close button (decorative in demo) */}
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* CC transcript (expands below card) */}
            <AnimatePresence>
              {showCC && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden bg-white border-t border-gray-100 rounded-b-2xl shadow-xl"
                >
                  <div className="px-4 py-3 flex items-start gap-2">
                    <Subtitles className="w-3.5 h-3.5 text-[#00A8E8] mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] leading-relaxed text-gray-600 font-mono">
                      <span className="text-[#00A8E8] font-bold">[00:25]</span>{" "}
                      {t("ccText")}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom button — Parar Guia (red) or Iniciar Guia (blue) */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-8 bg-gradient-to-t from-white via-white/92 to-transparent pointer-events-none">
        <button
          onClick={handleToggle}
          className={`w-full rounded-2xl py-4 flex items-center justify-center gap-3 shadow-lg pointer-events-auto transition-colors ${
            isPaused ? "bg-[#00A8E8]" : "bg-[#F54237]"
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            {isPaused ? (
              /* Play triangle */
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <path d="M 0,0 L 12,7 L 0,14 Z" />
              </svg>
            ) : (
              /* Stop square */
              <div className="w-3 h-3 bg-white rounded-sm" />
            )}
          </div>
          <span className="text-white font-bold text-base">
            {isPaused ? t("startGuide") : t("stopGuide")}
          </span>
          <div className="w-7 h-7" />
        </button>
      </div>

      {/* Phone notch — top layer, stays above the overlay */}
      <div className="absolute top-0 left-0 right-0 h-7 flex items-center justify-center pointer-events-none z-20">
        <div className="w-1/3 h-4 bg-slate-900 rounded-b-xl" />
      </div>
    </div>
  );
}
