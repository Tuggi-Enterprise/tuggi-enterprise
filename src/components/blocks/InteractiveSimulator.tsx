"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Navigation, Subtitles, Radio } from "lucide-react";

// Generate path coordinates for curved route following the street
const generateRoutePath = (progress: number) => {
  // Route follows the main street (Rua Principal at y=230)
  const startX = 50;
  const startY = 230;
  const poiX = 400;
  const poiY = 230;
  const endX = 550;

  const t = progress / 100;

  if (t <= 0.5) {
    // First segment: start to POI (slight curve on the street)
    const segmentT = t * 2;
    const x = startX + (poiX - startX) * segmentT;
    const y = startY + Math.sin(segmentT * Math.PI) * 8; // Slight curve
    return { x, y, angle: 0 };
  } else {
    // Second segment: POI to end (slight curve on the street)
    const segmentT = (t - 0.5) * 2;
    const x = poiX + (endX - poiX) * segmentT;
    const y = poiY + Math.sin(segmentT * Math.PI) * 8; // Slight curve
    return { x, y, angle: 0 };
  }
};

export function InteractiveSimulator() {
  const t = useTranslations("Home.Simulator");
  const [progress, setProgress] = useState(0);
  const [isTriggered, setIsTriggered] = useState(false);
  const [showCC, setShowCC] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isWaitingAtEnd, setIsWaitingAtEnd] = useState(false);
  const [shrinkX, setShrinkX] = useState(50); // left boundary of the route reveal (route starts at x=50)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        // If waiting at end, stay at 100
        if (isWaitingAtEnd) {
          return 100;
        }

        // If reached 100%, start waiting period
        if (prev >= 100) {
          setIsWaitingAtEnd(true);
          return 100;
        }

        const next = Math.min(prev + 0.5, 100);

        // Trigger when entering the geofence area (45-55%)
        if (next >= 45 && next <= 55 && !hasTriggered) {
          setIsTriggered(true);
          setHasTriggered(true);
        }

        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [hasTriggered, isWaitingAtEnd]);

  // Shrink the blue route line from start→end as a 30s countdown, then reset
  useEffect(() => {
    if (isWaitingAtEnd) {
      setShrinkX(50);
      const increment = 500 / 750; // 500px over 750 steps × 40ms = 30s
      const shrinkInterval = setInterval(() => {
        setShrinkX((prev) => Math.min(prev + increment, 550));
      }, 40);
      return () => clearInterval(shrinkInterval);
    } else {
      setShrinkX(50);
    }
  }, [isWaitingAtEnd]);

  // Reset animation when countdown (shrink) completes
  useEffect(() => {
    if (isWaitingAtEnd && shrinkX >= 550) {
      setProgress(0);
      setShowCC(false);
      setIsTriggered(false);
      setHasTriggered(false);
      setIsWaitingAtEnd(false);
      setShrinkX(50);
    }
  }, [shrinkX, isWaitingAtEnd]);

  const toggleCC = () => {
    setShowCC(!showCC);
  };

  const vehiclePos = generateRoutePath(progress);

  return (
    <section className="w-full py-16 sm:py-24 bg-tuggi-bg flex flex-col items-center border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
        {/* Copy */}
        <div className="flex-1 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 text-tuggi-primary font-semibold tracking-wider text-sm uppercase">
            <Radio className="w-5 h-5" />
            <span>{t("tag")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-base sm:text-lg text-tuggi-slate leading-relaxed max-w-prose">
            {t("subtitle")}
          </p>
        </div>

        {/* Enhanced Map Simulator */}
        <div className="w-full lg:flex-1 bg-gradient-to-br from-[#0B1220] to-[#1a2332] rounded-2xl shadow-2xl border border-gray-700/50 p-0 relative overflow-hidden h-[360px] sm:h-[440px] lg:h-[500px]">

          {/* Realistic Map Background SVG */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 600 500"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <clipPath id="route-reveal">
                <rect x={shrinkX} y="0" width={Math.max(0, vehiclePos.x - shrinkX)} height="500" />
              </clipPath>
            </defs>

            {/* Base layer */}
            <rect width="600" height="500" fill="#111827" />

            {/* City blocks — solid fills, no patterns for max compatibility */}
            <g stroke="#374151" strokeWidth="1">
              <rect x="20"  y="20"  width="100" height="80"  rx="3" fill="#1f2937" />
              <rect x="130" y="20"  width="120" height="80"  rx="3" fill="#1f2937" />
              <rect x="260" y="20"  width="90"  height="80"  rx="3" fill="#1f2937" />
              <rect x="20"  y="120" width="80"  height="100" rx="3" fill="#1f2937" />
              <rect x="110" y="120" width="100" height="100" rx="3" fill="#1f2937" />
              <rect x="220" y="120" width="130" height="100" rx="3" fill="#1f2937" />
              <rect x="360" y="120" width="110" height="100" rx="3" fill="#1f2937" />
              <rect x="20"  y="240" width="120" height="90"  rx="3" fill="#1f2937" />
              <rect x="150" y="240" width="100" height="90"  rx="3" fill="#1f2937" />
              <rect x="260" y="240" width="140" height="90"  rx="3" fill="#1f2937" />
              <rect x="410" y="240" width="90"  height="90"  rx="3" fill="#1f2937" />
              <rect x="480" y="20"  width="100" height="130" rx="3" fill="#1f2937" />
              <rect x="480" y="160" width="100" height="110" rx="3" fill="#1f2937" />
              <rect x="510" y="280" width="70"  height="100" rx="3" fill="#1f2937" />
            </g>

            {/* Park/Green area */}
            <rect x="370" y="30" width="90" height="70" rx="6" fill="#14532d" stroke="#16a34a" strokeWidth="2"/>

            {/* Main streets */}
            <g stroke="#4b6a8a" fill="none">
              <line x1="0" y1="110" x2="600" y2="110" strokeWidth="7" />
              <line x1="0" y1="230" x2="600" y2="230" strokeWidth="7" />
              <line x1="0" y1="340" x2="600" y2="340" strokeWidth="6" />
              <line x1="120" y1="0" x2="120" y2="500" strokeWidth="6" />
              <line x1="260" y1="0" x2="260" y2="500" strokeWidth="7" />
              <line x1="470" y1="0" x2="470" y2="500" strokeWidth="6" />
            </g>

            {/* Street center dashes */}
            <g stroke="#6b8faa" fill="none" strokeDasharray="10 10" strokeWidth="1.5">
              <line x1="0" y1="110" x2="600" y2="110" />
              <line x1="0" y1="230" x2="600" y2="230" />
              <line x1="260" y1="0" x2="260" y2="500" />
            </g>

            {/* Street labels */}
            <g fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="700">
              <text x="270" y="225">RUA PRINCIPAL</text>
              <text x="130" y="18">AV. HISTÓRICA</text>
              <text x="25" y="105">R. DO COMÉRCIO</text>
            </g>

            {/* Blue POI Pin in Park Area */}
            <g transform="translate(415, 65)">
              {/* Pin shadow */}
              <ellipse cx="0" cy="35" rx="8" ry="3" fill="black" opacity="0.3"/>

              {/* Blue POI Pin */}
              <g>
                {/* Outer pin shape */}
                <path
                  d="M 0,-25 C -10,-25 -18,-17 -18,-7 C -18,3 0,25 0,25 C 0,25 18,3 18,-7 C 18,-17 10,-25 0,-25 Z"
                  fill="#00A8E8"
                  stroke="white"
                  strokeWidth="2"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))' }}
                />
                {/* Inner white circle */}
                <circle cx="0" cy="-7" r="6" fill="white"/>
                {/* Inner blue dot */}
                <circle cx="0" cy="-7" r="3" fill="#00A8E8"/>
              </g>

              {/* POI Label (Google Maps style) */}
              <g transform="translate(0, -40)">
                {/* Label background */}
                <rect
                  x="-50"
                  y="-12"
                  width="100"
                  height="20"
                  rx="3"
                  fill="white"
                  opacity="0.95"
                  style={{ filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2))' }}
                />
                {/* Label text */}
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#1e2936"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {t("poiName")}
                </text>
              </g>
            </g>

            {/* Route ghost (full path, faded) */}
            <path
              d="M 50,230 Q 225,222 400,230 Q 475,238 550,230"
              stroke="#00A8E8"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.15"
            />
            {/* Route revealed — clipPath tracks exactly the vehicle's X position */}
            <path
              d="M 50,230 Q 225,222 400,230 Q 475,238 550,230"
              stroke="#00A8E8"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              clipPath="url(#route-reveal)"
            />

            {/* POI Marker on Main Street */}
            <g transform="translate(400, 230)">
              {/* Geofence pulse - CSS animation, works on all mobile browsers */}
              {isTriggered && (
                <circle r="50" fill="none" stroke="#FF6F00" strokeWidth="3">
                  <animate attributeName="r" values="30;70" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r="45" fill="#FF6F00" fillOpacity="0.12" stroke="#FF6F00" strokeWidth="2" strokeOpacity="0.4" />

              {/* Orange Trigger Point Icon (Lightning Bolt) */}
              <circle r="10" fill="#FF6F00" stroke="white" strokeWidth="1.5"/>
              <path d="M 1,-6 L -3,-1 L 0,-1 L -1,6 L 3,1 L 0,1 Z" fill="white" strokeWidth="0" />
            </g>

            {/* Moving Vehicle — using native SVG transform for full mobile compatibility */}
            <g transform={`translate(${vehiclePos.x}, ${vehiclePos.y})`}>
              <circle r="16" fill="white" />
              <circle r="12" fill="#0B1220" />
              <g transform="translate(-5, -5)">
                <path d="M 5,2 L 8,5 L 5,8 L 5,6 L 2,6 L 2,4 L 5,4 Z" fill="#00A8E8" strokeWidth="0.5" stroke="white"/>
              </g>
            </g>
          </svg>

          {/* Floating Audio Card */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={showCC ? "expanded" : "collapsed"}
                className={`w-full rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden ${
                  isTriggered
                    ? "bg-gradient-to-br from-tuggi-primary/30 to-tuggi-primary/10 border-tuggi-primary/50"
                    : "bg-gray-900/70 border-gray-700/50"
                }`}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                layout
              >
                <div className="px-3 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                      {isTriggered ? (
                        <>
                          <motion.div
                            className="p-2 sm:p-3 bg-tuggi-primary/20 rounded-full flex-shrink-0"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-tuggi-primary" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs text-tuggi-primary font-semibold uppercase tracking-wider mb-0.5">
                              {t("playingLabel")}
                            </p>
                            <p className="text-white font-bold text-sm sm:text-base truncate">
                              {t("playingText")}
                            </p>
                          </div>
                          {/* Equalizer */}
                          <div className="flex items-end space-x-0.5 sm:space-x-1 h-6 sm:h-8 flex-shrink-0">
                            {[0, 1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1 sm:w-1.5 bg-tuggi-primary rounded-full"
                                animate={{
                                  height: ["40%", "100%", "60%", "80%", "40%"],
                                }}
                                transition={{
                                  duration: 1.2,
                                  repeat: Infinity,
                                  delay: i * 0.15,
                                  ease: "easeInOut",
                                }}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-2 sm:p-3 bg-gray-800/50 rounded-full flex-shrink-0">
                            <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-tuggi-slate" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-tuggi-slate font-semibold uppercase tracking-wider mb-0.5">
                              Navegando
                            </p>
                            <p className="text-gray-300 font-semibold text-sm sm:text-base truncate">
                              {t("approaching")}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* CC Toggle Button with Label */}
                    {isTriggered && (
                      <div className="ml-2 sm:ml-4 flex flex-col items-center gap-1 flex-shrink-0">
                        <motion.button
                          onClick={toggleCC}
                          className={`p-2 sm:p-3 rounded-lg transition-all ${
                            showCC
                              ? "bg-tuggi-primary text-white shadow-lg shadow-tuggi-primary/30"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          aria-label="Toggle Closed Captions"
                        >
                          <Subtitles className="w-4 h-4 sm:w-5 sm:h-5" />
                        </motion.button>
                        <span className="text-[9px] sm:text-[10px] text-white/60 font-medium">
                          {t("ccLabel")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CC Transcript */}
                  <AnimatePresence>
                    {showCC && isTriggered && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t border-white/10">
                          <div className="flex items-start space-x-2 mb-2">
                            <Subtitles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tuggi-primary mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] sm:text-xs font-semibold text-tuggi-primary uppercase tracking-wide">
                              {t("ccTranscriptTitle")}
                            </p>
                          </div>
                          <div className="bg-black/40 rounded-lg p-3 sm:p-4 backdrop-blur-sm">
                            <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-mono">
                              <span className="text-tuggi-primary">[00:25]</span> {t("ccTranscriptText")}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Top info badge */}
          <div className="absolute top-3 left-3 sm:top-6 sm:left-6 px-3 py-1.5 sm:px-4 sm:py-2 bg-black/50 backdrop-blur-md rounded-full border border-gray-700/50">
            <p className="text-[10px] sm:text-xs text-gray-400 font-semibold flex items-center space-x-2">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-tuggi-primary rounded-full animate-pulse"></span>
              <span>DEMO AO VIVO</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
