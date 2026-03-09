"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Apple, PlayCircle, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

interface PartnerHeroProps {
  partnerId?: string;
}

const REDIRECT_DELAY_SECONDS = 5;
const APP_STORE_URL = "https://apps.apple.com/app/tuggi-drive/id6744379818";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.tuggidrive.app";

export function PartnerHero({ partnerId }: PartnerHeroProps) {
  const [isLogged, setIsLogged] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    // Hide Global Header & Footer for this LP
    document.body.classList.add('no-layout');

    // Detect Platform
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setPlatform("ios");
    } else if (/android/i.test(userAgent)) {
      setPlatform("android");
    }

    if (partnerId && !isLogged) {
      captureFingerprint(partnerId);
    }

    return () => {
      document.body.classList.remove('no-layout');
    };
  }, [partnerId]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isRedirecting) {
      handleRedirect();
    }
  }, [countdown]);

  const captureFingerprint = async (pId: string) => {
    try {
      const response = await fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: pId,
          user_agent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (response.ok) {
        setIsLogged(true);
      }
    } catch (err) {
      console.warn("Atribuição falhou, mas redirecionando mesmo assim...", err);
    }
  };

  const handleRedirect = () => {
    setIsRedirecting(true);
    const targetUrl = platform === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    window.location.href = targetUrl;
  };

  return (
    <section className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-white selection:bg-tuggi-secondary selection:text-white">
      {/* Background with animated gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-tuggi-secondary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-tuggi-primary/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container relative z-10 mx-auto px-6 py-12 flex flex-col items-center text-center">
        {/* Partner Branding / Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-tuggi-secondary mb-8 backdrop-blur-xl"
        >
          <ShieldCheck size={16} className="animate-pulse" />
          CONVITE PARCEIRO TUGGI ATIVADO
        </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center lg:text-left order-2 lg:order-1"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Sua experiência <br />
              <span className="text-tuggi-secondary italic">cultural</span> já começou.
            </h1>
            
            <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Estamos preparando tudo para você. Você será redirecionado para a loja oficial em instantes.
            </p>

            {/* Redirection Status Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between font-bold text-sm uppercase tracking-widest text-slate-500">
                  <span>Redirecionando</span>
                  <span className="text-tuggi-secondary">{countdown}s</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: REDIRECT_DELAY_SECONDS, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-tuggi-secondary to-tuggi-primary"
                  />
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  {isRedirecting ? (
                    <Loader2 size={18} className="animate-spin text-tuggi-secondary" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-tuggi-secondary animate-ping" />
                  )}
                  <span className="text-sm font-medium">
                    {isRedirecting ? "Abrindo loja..." : `Iniciando download para ${platform === 'ios' ? 'iPhone' : 'Android'}...`}
                  </span>
                </div>

                <button 
                  onClick={handleRedirect}
                  className="mt-2 flex items-center justify-center gap-2 w-full py-4 bg-white text-slate-950 font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all group"
                >
                  IR PARA A LOJA AGORA
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Visual Side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative order-1 lg:order-2"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(236,72,153,0.1)] group">
              <Image
                src="/images/partner-hero.png"
                alt="Tuggi Experience"
                width={500}
                height={650}
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
              
              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-tuggi-secondary flex items-center justify-center shadow-lg">
                  <Download size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-bold uppercase opacity-50">App Oficial</div>
                  <div className="text-sm font-black">TUGGI DRIVE</div>
                </div>
              </motion.div>
            </div>
            
            {/* Background blur decorative circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-tuggi-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-tuggi-secondary/20 rounded-full blur-3xl" />
          </motion.div>
        </div>

        {/* Footer / Trust */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold"
        >
          Secure Connection &bull; Official App Distribution &bull; Powered by Tuggi
        </motion.div>
      </div>
    </section>
  );
}
