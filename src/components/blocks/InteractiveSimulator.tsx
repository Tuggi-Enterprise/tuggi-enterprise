"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Volume2, Navigation, Subtitles, Radio } from "lucide-react";

// Generate path coordinates for curved route following the street
const generateRoutePath = (progress: number) => {
  // Route follows the main street (Rua Principal at y=230)
  const startX = 50;
  const startY = 230;
  const poiX = 400;
  const poiY = 230;
  const endX = 550;
  const endY = 230;

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

  // Handle reset after 30 seconds at the end
  useEffect(() => {
    if (isWaitingAtEnd) {
      const resetTimeout = setTimeout(() => {
        setProgress(0);
        setShowCC(false);
        setIsTriggered(false);
        setHasTriggered(false);
        setIsWaitingAtEnd(false);
      }, 30000);
      return () => clearTimeout(resetTimeout);
    }
  }, [isWaitingAtEnd]);

  const toggleCC = () => {
    setShowCC(!showCC);
  };

  const vehiclePos = generateRoutePath(progress);

  return (
    <section className="w-full py-24 bg-tuggi-bg flex flex-col items-center border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-16 items-center">
        {/* Copy */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center space-x-2 text-tuggi-primary font-semibold tracking-wider text-sm uppercase">
            <Radio className="w-5 h-5" />
            <span>{t("tag")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-tuggi-dark">
            {t("title")}
          </h2>
          <p className="text-lg text-tuggi-slate leading-relaxed max-w-prose">
            {t("subtitle")}
          </p>
        </div>

        {/* Enhanced Map Simulator */}
        <div className="flex-1 w-full bg-gradient-to-br from-[#0B1220] to-[#1a2332] rounded-2xl shadow-2xl border border-gray-700/50 p-0 relative overflow-hidden h-[500px]">

          {/* Realistic Map Background SVG */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 600 500"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Park/Green area pattern - more realistic */}
              <pattern id="park-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#2d5a3d" fillOpacity="0.5"/>
                <circle cx="5" cy="5" r="1.5" fill="#3d7a4f" fillOpacity="0.6"/>
                <circle cx="15" cy="12" r="1.5" fill="#3d7a4f" fillOpacity="0.6"/>
                <circle cx="10" cy="15" r="1" fill="#4a8f5f" fillOpacity="0.5"/>
              </pattern>

              {/* Building texture */}
              <pattern id="building-texture" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#1e2936"/>
                <rect x="1" y="1" width="1.5" height="1.5" fill="#2d3f52" opacity="0.3"/>
                <rect x="4.5" y="1" width="1.5" height="1.5" fill="#2d3f52" opacity="0.3"/>
                <rect x="1" y="4.5" width="1.5" height="1.5" fill="#2d3f52" opacity="0.3"/>
                <rect x="4.5" y="4.5" width="1.5" height="1.5" fill="#2d3f52" opacity="0.3"/>
              </pattern>
            </defs>

            {/* Base layer - darker background */}
            <rect width="600" height="500" fill="#0a0e14" />

            {/* City blocks with texture */}
            <g opacity="0.6" stroke="#384858" strokeWidth="1.5">
              {/* Top left blocks */}
              <rect x="20" y="20" width="100" height="80" rx="2" fill="url(#building-texture)" />
              <rect x="130" y="20" width="120" height="80" rx="2" fill="url(#building-texture)" />
              <rect x="260" y="20" width="90" height="80" rx="2" fill="url(#building-texture)" />

              {/* Middle blocks */}
              <rect x="20" y="120" width="80" height="100" rx="2" fill="url(#building-texture)" />
              <rect x="110" y="120" width="100" height="100" rx="2" fill="url(#building-texture)" />
              <rect x="220" y="120" width="130" height="100" rx="2" fill="url(#building-texture)" />
              <rect x="360" y="120" width="110" height="100" rx="2" fill="url(#building-texture)" />

              {/* Bottom blocks */}
              <rect x="20" y="240" width="120" height="90" rx="2" fill="url(#building-texture)" />
              <rect x="150" y="240" width="100" height="90" rx="2" fill="url(#building-texture)" />
              <rect x="260" y="240" width="140" height="90" rx="2" fill="url(#building-texture)" />
              <rect x="410" y="240" width="90" height="90" rx="2" fill="url(#building-texture)" />

              {/* Right side blocks */}
              <rect x="480" y="20" width="100" height="130" rx="2" fill="url(#building-texture)" />
              <rect x="480" y="160" width="100" height="110" rx="2" fill="url(#building-texture)" />
              <rect x="510" y="280" width="70" height="100" rx="2" fill="url(#building-texture)" />
            </g>

            {/* Park/Green area - more visible */}
            <rect x="370" y="30" width="90" height="70" rx="6" fill="url(#park-pattern)" opacity="0.8" stroke="#3d7a4f" strokeWidth="1.5"/>

            {/* Main streets - more realistic */}
            <g opacity="0.7" stroke="#4a5f7a" fill="none">
              <line x1="0" y1="110" x2="600" y2="110" strokeWidth="4" />
              <line x1="0" y1="230" x2="600" y2="230" strokeWidth="4" />
              <line x1="0" y1="340" x2="600" y2="340" strokeWidth="3.5" />
              <line x1="120" y1="0" x2="120" y2="500" strokeWidth="3.5" />
              <line x1="260" y1="0" x2="260" y2="500" strokeWidth="4" />
              <line x1="470" y1="0" x2="470" y2="500" strokeWidth="3.5" />
            </g>

            {/* Street center lines */}
            <g opacity="0.4" stroke="#6b8199" fill="none" strokeDasharray="8 8" strokeWidth="0.8">
              <line x1="0" y1="110" x2="600" y2="110" />
              <line x1="0" y1="230" x2="600" y2="230" />
              <line x1="260" y1="0" x2="260" y2="500" />
            </g>

            {/* Street labels */}
            <g opacity="0.35" fill="#7a8fa5" fontSize="9" fontFamily="monospace" fontWeight="600">
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

            {/* Animated Route Path on Main Street */}
            <motion.path
              d="M 50,230 Q 225,222 400,230 Q 475,238 550,230"
              stroke="#00A8E8"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="1000"
              initial={{ strokeDashoffset: 1000 }}
              animate={{ strokeDashoffset: 1000 - (progress * 10) }}
              style={{ filter: 'drop-shadow(0 0 10px rgba(0, 168, 232, 0.8))' }}
            />

            {/* POI Marker on Main Street */}
            <g transform="translate(400, 230)">
              {/* Geofence radius */}
              <AnimatePresence>
                {isTriggered && (
                  <motion.circle
                    r="50"
                    fill="none"
                    stroke="#FF6F00"
                    strokeWidth="3"
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                )}
              </AnimatePresence>
              <circle r="45" fill="#FF6F00" fillOpacity="0.12" stroke="#FF6F00" strokeWidth="2" strokeOpacity="0.4" />

              {/* Orange Trigger Point Icon (Lightning Bolt) */}
              <g transform="translate(0, 0)">
                {/* Outer circle */}
                <circle r="10" fill="#FF6F00" stroke="white" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 111, 0, 0.8))' }}/>

                {/* Lightning bolt icon */}
                <path
                  d="M 1,-6 L -3,-1 L 0,-1 L -1,6 L 3,1 L 0,1 Z"
                  fill="white"
                  strokeWidth="0"
                />
              </g>
            </g>

            {/* Moving Vehicle */}
            <motion.g
              animate={{
                x: vehiclePos.x,
                y: vehiclePos.y,
                rotate: vehiclePos.angle,
              }}
              transition={{ duration: 0.04, ease: "linear" }}
            >
              <circle r="16" fill="white" style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))' }} />
              <circle r="12" fill="#0B1220" />
              <g transform="translate(-5, -5)">
                <path d="M 5,2 L 8,5 L 5,8 L 5,6 L 2,6 L 2,4 L 5,4 Z" fill="#00A8E8" strokeWidth="0.5" stroke="white"/>
              </g>
            </motion.g>
          </svg>

          {/* Floating Audio Card */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={showCC ? "expanded" : "collapsed"}
                className={`w-full max-w-md mx-auto rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden ${
                  isTriggered
                    ? "bg-gradient-to-br from-tuggi-primary/30 to-tuggi-primary/10 border-tuggi-primary/50"
                    : "bg-gray-900/70 border-gray-700/50"
                }`}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                layout
              >
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {isTriggered ? (
                        <>
                          <motion.div
                            className="p-3 bg-tuggi-primary/20 rounded-full"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Volume2 className="w-6 h-6 text-tuggi-primary" />
                          </motion.div>
                          <div className="flex-1">
                            <p className="text-xs text-tuggi-primary font-semibold uppercase tracking-wider mb-1">
                              {t("playingLabel")}
                            </p>
                            <p className="text-white font-bold text-base">
                              {t("playingText")}
                            </p>
                          </div>
                          {/* Equalizer */}
                          <div className="flex items-end space-x-1 h-8">
                            {[0, 1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 bg-tuggi-primary rounded-full"
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
                          <div className="p-3 bg-gray-800/50 rounded-full">
                            <Navigation className="w-6 h-6 text-tuggi-slate" />
                          </div>
                          <div>
                            <p className="text-xs text-tuggi-slate font-semibold uppercase tracking-wider mb-1">
                              Navegando
                            </p>
                            <p className="text-gray-300 font-semibold">
                              {t("approaching")}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* CC Toggle Button with Label */}
                    {isTriggered && (
                      <div className="ml-4 flex flex-col items-center gap-1">
                        <motion.button
                          onClick={toggleCC}
                          className={`p-3 rounded-lg transition-all ${
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
                          <Subtitles className="w-5 h-5" />
                        </motion.button>
                        <span className="text-[10px] text-white/60 font-medium">
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
                        animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex items-start space-x-2 mb-2">
                            <Subtitles className="w-4 h-4 text-tuggi-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-semibold text-tuggi-primary uppercase tracking-wide">
                              {t("ccTranscriptTitle")}
                            </p>
                          </div>
                          <div className="bg-black/40 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-sm text-white/95 leading-relaxed font-mono">
                              <span className="text-tuggi-primary">[00:01]</span> {t("ccTranscriptText")}
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
          <div className="absolute top-6 left-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-gray-700/50">
            <p className="text-xs text-gray-400 font-semibold flex items-center space-x-2">
              <span className="w-2 h-2 bg-tuggi-primary rounded-full animate-pulse"></span>
              <span>DEMO AO VIVO</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
