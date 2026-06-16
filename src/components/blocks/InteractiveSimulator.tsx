"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Volume2, Navigation, Subtitles, Radio } from "lucide-react";

const generateRoutePath = (progress: number) => {
  const startX = 50;
  const startY = 230;
  const poiX = 400;
  const poiY = 230;
  const endX = 550;

  const t = progress / 100;

  if (t <= 0.5) {
    const segmentT = t * 2;
    const x = startX + (poiX - startX) * segmentT;
    const y = startY + Math.sin(segmentT * Math.PI) * 8; 
    return { x, y, angle: 0 };
  } else {
    const segmentT = (t - 0.5) * 2;
    const x = poiX + (endX - poiX) * segmentT;
    const y = poiY + Math.sin(segmentT * Math.PI) * 8; 
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
  const [shrinkX, setShrinkX] = useState(50); 
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isWaitingAtEnd) return 100;
        if (prev >= 100) {
          setIsWaitingAtEnd(true);
          return 100;
        }
        const next = Math.min(prev + 0.5, 100);
        if (next >= 45 && next <= 55 && !hasTriggered) {
          setIsTriggered(true);
          setHasTriggered(true);
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [hasTriggered, isWaitingAtEnd, mounted]);

  useEffect(() => {
    if (!mounted || !isWaitingAtEnd) return;
    const increment = 500 / 750;
    const shrinkInterval = setInterval(() => {
      setShrinkX((prev) => Math.min(prev + increment, 550));
    }, 40);
    return () => clearInterval(shrinkInterval);
  }, [isWaitingAtEnd, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (isWaitingAtEnd && shrinkX >= 550) {
      setProgress(0);
      setShowCC(false);
      setIsTriggered(false);
      setHasTriggered(false);
      setIsWaitingAtEnd(false);
      setShrinkX(50);
    }
  }, [shrinkX, isWaitingAtEnd, mounted]);

  const toggleCC = () => {
    setShowCC(!showCC);
  };

  const vehiclePos = generateRoutePath(progress);

  return (
    <section className="w-full py-12 md:py-24 bg-[#F7F9FC] flex flex-col items-center border-b border-gray-200 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
        <div className="flex-1 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 text-[#007AA5] font-semibold tracking-wider text-sm uppercase">
            <Radio className="w-5 h-5" />
            <span>{t("tag")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#0B1220]">
            {t("title")}
          </h2>
          <p className="text-lg text-[#5B6472] leading-relaxed max-w-prose">
            {t("subtitle")}
          </p>
        </div>

        <div 
          className="w-full lg:flex-1 bg-[#020617] rounded-2xl shadow-2xl border border-gray-800 p-0 relative overflow-hidden"
          style={{ height: '500px' }}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 600 500"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <rect width="600" height="500" fill="#020617" />
 
            <g stroke="#1e293b" strokeWidth="1">
              <rect x="20"  y="20"  width="100" height="80"  rx="3" fill="#0f172a" />
              <rect x="130" y="20"  width="120" height="80"  rx="3" fill="#0f172a" />
              <rect x="260" y="20"  width="90"  height="80"  rx="3" fill="#0f172a" />
              <rect x="20"  y="120" width="80"  height="100" rx="3" fill="#0f172a" />
              <rect x="110" y="120" width="100" height="100" rx="3" fill="#0f172a" />
              <rect x="220" y="120" width="130" height="100" rx="3" fill="#0f172a" />
              <rect x="360" y="120" width="110" height="100" rx="3" fill="#0f172a" />
              <rect x="20"  y="240" width="120" height="90"  rx="3" fill="#0f172a" />
              <rect x="150" y="240" width="100" height="90"  rx="3" fill="#0f172a" />
              <rect x="260" y="240" width="140" height="90"  rx="3" fill="#0f172a" />
              <rect x="410" y="240" width="90"  height="90"  rx="3" fill="#0f172a" />
              <rect x="480" y="20"  width="100" height="130" rx="3" fill="#0f172a" />
              <rect x="480" y="160" width="100" height="110" rx="3" fill="#0f172a" />
              <rect x="510" y="280" width="70"  height="100" rx="3" fill="#0f172a" />
            </g>

            <rect x="370" y="30" width="90" height="70" rx="6" fill="#064e3b" stroke="#059669" strokeWidth="1"/>

            <g stroke="#1e293b" fill="none">
              <line x1="0" y1="110" x2="600" y2="110" strokeWidth="7" />
              <line x1="0" y1="230" x2="600" y2="230" strokeWidth="7" />
              <line x1="0" y1="340" x2="600" y2="340" strokeWidth="6" />
              <line x1="120" y1="0" x2="120" y2="500" strokeWidth="6" />
              <line x1="260" y1="0" x2="260" y2="500" strokeWidth="7" />
              <line x1="470" y1="0" x2="470" y2="500" strokeWidth="6" />
            </g>

            <g stroke="#334155" fill="none" strokeDasharray="8 8" strokeWidth="1">
              <line x1="0" y1="110" x2="600" y2="110" />
              <line x1="0" y1="230" x2="600" y2="230" />
              <line x1="260" y1="0" x2="260" y2="500" />
            </g>

            <g fill="#475569" fontSize="8" fontFamily="sans-serif" fontWeight="bold">
              <text x="270" y="225">{t("mainStreet")}</text>
              <text x="130" y="18">{t("historicAve")}</text>
            </g>

            <g transform="translate(415, 65)">
               <path
                  d="M 0,-25 C -10,-25 -18,-17 -18,-7 C -18,3 0,25 0,25 C 0,25 18,3 18,-7 C 18,-17 10,-25 0,-25 Z"
                  fill="#00A8E8"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx="0" cy="-7" r="6" fill="white"/>
                <circle cx="0" cy="-7" r="3" fill="#00A8E8"/>
            </g>

            <path
              d="M 50,230 Q 225,222 400,230 Q 475,238 550,230"
              stroke="#00A8E8"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.2"
            />
            
            <path
              d="M 50,230 Q 225,222 400,230 Q 475,238 550,230"
              stroke="#00A8E8"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />

            <rect 
              x={vehiclePos.x} 
              y="200" 
              width={Math.max(0, 600 - vehiclePos.x)} 
              height="60" 
              fill="#020617" 
            />
            <rect 
              x="0" 
              y="200" 
              width={shrinkX} 
              height="60" 
              fill="#020617" 
            />

            <g transform="translate(400, 230)">
              <circle r="40" fill="#FF6F00" fillOpacity="0.1" stroke="#FF6F00" strokeWidth="1" />
              <circle r="10" fill="#FF6F00" stroke="white" strokeWidth="1.5"/>
              <path d="M 1,-6 L -3,-1 L 0,-1 L -1,6 L 3,1 L 0,1 Z" fill="white" />
            </g>

            {mounted && (
              <g transform={`translate(${vehiclePos.x}, ${vehiclePos.y})`}>
                <circle r="16" fill="white" />
                <circle r="12" fill="#020617" />
                <path d="M -3,-2 L 3,0 L -3,2 Z" fill="#00A8E8" transform="scale(1.5)" />
              </g>
            )}
          </svg>

          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
            <div
              className={`w-full rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-500 ${
                isTriggered
                  ? "bg-blue-600/20 border-blue-400/50"
                  : "bg-slate-900/80 border-slate-700/50"
              }`}
            >
              <div className="px-3 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                    {isTriggered ? (
                      <>
                        <div className="p-2 sm:p-3 bg-blue-500/20 rounded-full flex-shrink-0 animate-pulse">
                          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#00A8E8]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs text-[#00A8E8] font-bold uppercase tracking-wider mb-0.5">
                            {t("playingLabel")}
                          </p>
                          <p className="text-white font-bold text-sm sm:text-base truncate">
                            {t("playingText")}
                          </p>
                        </div>
                        <div className="flex items-end space-x-0.5 h-6 flex-shrink-0">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="w-1 bg-[#00A8E8] rounded-full animate-bounce"
                              style={{ height: `${20 + (i * 20)}%`, animationDelay: `${i * 0.1}s` }}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 sm:p-3 bg-slate-800 rounded-full flex-shrink-0">
                          <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                            {t("navigating")}
                          </p>
                          <p className="text-slate-200 font-semibold text-sm sm:text-base truncate">
                            {t("approaching")}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {isTriggered && (
                    <div className="ml-2 sm:ml-4 flex flex-col items-center gap-1 flex-shrink-0">
                      <button
                        onClick={toggleCC}
                        className={`p-2 sm:p-3 rounded-lg transition-all ${
                          showCC
                            ? "bg-[#00A8E8] text-white"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        <Subtitles className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <span className="text-[9px] text-white/60 font-medium">
                        {t("ccLabel")}
                      </span>
                    </div>
                  )}
                </div>

                {showCC && isTriggered && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="bg-black/40 rounded-lg p-3">
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
                        <span className="text-[#00A8E8] font-bold">[00:25]</span> {t("ccTranscriptText")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-3 left-3 sm:top-6 sm:left-6 px-3 py-1.5 sm:px-4 sm:py-2 bg-black/50 backdrop-blur-md rounded-full border border-gray-700/50">
            <p className="text-[10px] sm:text-xs text-gray-400 font-semibold flex items-center space-x-2">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#00A8E8] rounded-full animate-pulse"></span>
              <span>{t("liveDemo")}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
