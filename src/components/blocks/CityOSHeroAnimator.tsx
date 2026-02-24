"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

type Stage = "map" | "panel-in" | "typing" | "uploading" | "deploying" | "live" | "waiting";

// Click target on the map (percentages of container)
const CLICK_X = 52;
const CLICK_Y = 58;
// Deploy button position inside the CMS panel
const DEPLOY_X = 78;
const DEPLOY_Y = 95;

const AUDIO_FILE = "audio_monumento.mp3";

export function CityOSHeroAnimator() {
  const t = useTranslations("CityOS.Animator");
  const poiName = t("defaultPoiName");
  
  const [stage, setStage] = useState<Stage>("map");
  const [typedText, setTypedText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cursorX, setCursorX] = useState(15);
  const [cursorY, setCursorY] = useState(80);
  const [isClicking, setIsClicking] = useState(false);
  const [isDeployClicking, setIsDeployClicking] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay);
      timers.push(id);
    };

    switch (stage) {
      case "map": {
        setTypedText("");
        setUploadProgress(0);
        setIsClicking(false);
        setIsDeployClicking(false);
        setCursorX(15);
        setCursorY(80);
        after(() => { setCursorX(CLICK_X); setCursorY(CLICK_Y); }, 300);
        after(() => setIsClicking(true), 1700);
        after(() => { setIsClicking(false); setStage("panel-in"); }, 2200);
        break;
      }
      case "panel-in": {
        after(() => setStage("typing"), 700);
        break;
      }
      case "typing": {
        let i = 0;
        const type = () => {
          i++;
          setTypedText(poiName.slice(0, i));
          if (i < poiName.length) {
            const id = setTimeout(type, 85);
            timers.push(id);
          } else {
            after(() => setStage("uploading"), 500);
          }
        };
        after(type, 400);
        break;
      }
      case "uploading": {
        setUploadProgress(0);
        let p = 0;
        const tick = () => {
          p = Math.min(p + 2, 100);
          setUploadProgress(p);
          if (p < 100) {
            const id = setTimeout(tick, 30);
            timers.push(id);
          } else {
            after(() => setStage("deploying"), 500);
          }
        };
        after(tick, 200);
        break;
      }
      case "deploying": {
        setCursorX(DEPLOY_X);
        setCursorY(DEPLOY_Y);
        after(() => setIsDeployClicking(true), 800);
        after(() => { setIsDeployClicking(false); setStage("live"); }, 1300);
        break;
      }
      case "live": {
        after(() => setStage("waiting"), 2500);
        break;
      }
      case "waiting": {
        after(() => setStage("map"), 3000);
        break;
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const showPanel = ["panel-in", "typing", "uploading", "deploying"].includes(stage);
  const showPin = ["live", "waiting"].includes(stage);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#EFF4EB] select-none">

      {/* SVG Light Map */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 280"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Background */}
        <rect width="400" height="280" fill="#EFF4EB" />

        {/* Grid lines */}
        {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((x) => (
          <line key={`vg${x}`} x1={x} y1="0" x2={x} y2="280" stroke="#C8D4C0" strokeWidth="0.5" />
        ))}
        {[40, 80, 120, 160, 200, 240].map((y) => (
          <line key={`hg${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#C8D4C0" strokeWidth="0.5" />
        ))}

        {/* Main roads */}
        <rect x="170" y="0" width="22" height="280" fill="#FFFFFF" />
        <rect x="0" y="138" width="400" height="20" fill="#FFFFFF" />
        <rect x="0" y="70" width="400" height="14" fill="#FFFFFF" />
        <rect x="80" y="0" width="14" height="280" fill="#FFFFFF" />
        <rect x="310" y="0" width="14" height="280" fill="#FFFFFF" />

        {/* City blocks — left column */}
        <rect x="10" y="10" width="58" height="52" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="10" y="90" width="58" height="40" rx="2" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        <rect x="10" y="168" width="58" height="52" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="10" y="238" width="58" height="36" rx="2" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />

        {/* City blocks — center-left */}
        <rect x="100" y="10" width="58" height="52" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="100" y="90" width="58" height="40" rx="2" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        {/* Park area near click target */}
        <rect x="100" y="168" width="58" height="62" rx="2" fill="#B8CEB9" stroke="#96B498" strokeWidth="1" />
        <rect x="100" y="238" width="58" height="36" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />

        {/* City blocks — center-right */}
        <rect x="200" y="10" width="100" height="52" rx="2" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        <rect x="200" y="90" width="100" height="40" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="200" y="168" width="100" height="52" rx="2" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        <rect x="200" y="238" width="100" height="36" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />

        {/* City blocks — right column */}
        <rect x="330" y="10" width="62" height="52" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="330" y="90" width="62" height="40" rx="2" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />
        <rect x="330" y="168" width="62" height="52" rx="2" fill="#D8E0DA" stroke="#C8D2CA" strokeWidth="0.5" />
        <rect x="330" y="238" width="62" height="36" rx="2" fill="#D0DAD2" stroke="#C0CCC2" strokeWidth="0.5" />

        {/* Road dashes */}
        <line x1="181" y1="0" x2="181" y2="280" stroke="#C4CEC6" strokeWidth="1" strokeDasharray="10 8" opacity="0.6" />
        <line x1="0" y1="148" x2="400" y2="148" stroke="#C4CEC6" strokeWidth="1" strokeDasharray="10 8" opacity="0.6" />

        {/* Existing blue geo-trigger pins */}
        <g transform="translate(42, 40)">
          <circle r="5" fill="#00A8E8" />
          <circle r="9" fill="none" stroke="#00A8E8" strokeWidth="1" opacity="0.35" />
        </g>
        <g transform="translate(252, 35)">
          <circle r="5" fill="#00A8E8" />
          <circle r="9" fill="none" stroke="#00A8E8" strokeWidth="1" opacity="0.35" />
        </g>
        <g transform="translate(365, 110)">
          <circle r="5" fill="#00A8E8" />
          <circle r="9" fill="none" stroke="#00A8E8" strokeWidth="1" opacity="0.35" />
        </g>
        <g transform="translate(42, 200)">
          <circle r="5" fill="#00A8E8" />
          <circle r="9" fill="none" stroke="#00A8E8" strokeWidth="1" opacity="0.35" />
        </g>

        {/* Crosshair at click target (map / panel-in stages) */}
        {(stage === "map" || stage === "panel-in") && (
          <g
            transform={`translate(${(CLICK_X / 100) * 400}, ${(CLICK_Y / 100) * 280})`}
            opacity={stage === "panel-in" ? 0.3 : 1}
          >
            <circle r="12" fill="none" stroke="#00A8E8" strokeWidth="0.8" opacity="0.4" />
            <line x1="-10" y1="0" x2="-4" y2="0" stroke="#00A8E8" strokeWidth="1" opacity="0.7" />
            <line x1="4" y1="0" x2="10" y2="0" stroke="#00A8E8" strokeWidth="1" opacity="0.7" />
            <line x1="0" y1="-10" x2="0" y2="-4" stroke="#00A8E8" strokeWidth="1" opacity="0.7" />
            <line x1="0" y1="4" x2="0" y2="10" stroke="#00A8E8" strokeWidth="1" opacity="0.7" />
          </g>
        )}

        {/* Orange geo-trigger pin (live / waiting stages) */}
        {showPin && (
          <g transform={`translate(${(CLICK_X / 100) * 400}, ${(CLICK_Y / 100) * 280})`}>
            <circle fill="none" stroke="#FF6F00" strokeWidth="2" r="6">
              <animate attributeName="r" values="6;24" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle fill="none" stroke="#FF6F00" strokeWidth="1.5" r="6">
              <animate attributeName="r" values="6;15" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
            </circle>
            <circle r="6" fill="#FF6F00" />
            <circle r="3" fill="white" />
          </g>
        )}
      </svg>

      {/* Live status badge */}
      <AnimatePresence>
        {showPin && (
          <motion.div
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-2 py-1 rounded-sm shadow-sm"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6F00] animate-pulse" />
            <span className="text-orange-700 text-[8px] font-mono font-bold tracking-widest uppercase">
              {t("geoTriggerActive")}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CMS Panel — slides in from right */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="absolute top-0 right-0 bottom-0 w-[44%] bg-white border-l border-gray-200 z-10 flex flex-col overflow-hidden shadow-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            {/* Panel header */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gray-50">
              <span className="text-[8px] font-mono font-bold text-[#00A8E8] uppercase tracking-wider">
                {t("newPoi")}
              </span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 px-3 py-2.5 flex flex-col gap-2.5 overflow-hidden">

              {/* Name field */}
              <div>
                <label className="text-[7px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                  {t("poiName")}
                </label>
                <div className="bg-white border border-gray-200 rounded-sm px-2 py-1.5 flex items-center min-h-[22px]">
                  <span className="text-[9px] font-mono text-gray-800">{typedText}</span>
                  {stage === "typing" && (
                    <span className="w-px h-3 bg-[#00A8E8] animate-pulse ml-px" />
                  )}
                </div>
              </div>

              {/* Audio upload */}
              <div>
                <label className="text-[7px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                  {t("audio")}
                </label>
                <div className="bg-white border border-gray-200 rounded-sm px-2 py-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[7px] font-mono text-gray-500 truncate max-w-[70%]">{AUDIO_FILE}</span>
                    <span className="text-[7px] font-mono text-[#00A8E8]">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="h-0.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00A8E8] rounded-full transition-none"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <label className="text-[7px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                  {t("coordinates")}
                </label>
                <div className="bg-white border border-gray-200 rounded-sm px-2 py-1 flex items-center gap-2">
                  <span className="text-[7px] font-mono text-gray-600">38.7169°N</span>
                  <span className="text-[7px] font-mono text-gray-300">|</span>
                  <span className="text-[7px] font-mono text-gray-600">9.1395°W</span>
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className="text-[7px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                  {t("activationRadius")}
                </label>
                <div className="bg-white border border-gray-200 rounded-sm px-2 py-1">
                  <span className="text-[7px] font-mono text-gray-600">50m</span>
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Deploy button */}
              <motion.div
                className={`w-full py-2 rounded-sm font-mono text-[8px] font-bold uppercase tracking-wider text-center ${
                  isDeployClicking ? "bg-[#0090C8] text-white/80" : "bg-[#00A8E8] text-white"
                }`}
                animate={isDeployClicking ? { scale: 0.96 } : { scale: 1 }}
                transition={{ duration: 0.1 }}
              >
                {t("deployButton")}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse cursor */}
      <motion.div
        className="absolute pointer-events-none z-30"
        animate={{ left: `${cursorX}%`, top: `${cursorY}%` }}
        transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="relative">
          <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
            <path
              d="M 0,0 L 0,14 L 3.5,10.5 L 6,16 L 8,15 L 5.5,9.5 L 10,9.5 Z"
              fill="#1e2936"
              stroke="white"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </svg>
          {/* Click ripple */}
          <AnimatePresence>
            {(isClicking || isDeployClicking) && (
              <motion.div
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full border border-gray-500/60"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.38 }}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

    </div>
  );
}
