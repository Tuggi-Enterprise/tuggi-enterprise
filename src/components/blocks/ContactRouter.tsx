"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Car, UserCircle2, Mail, Info } from "lucide-react";

type TriageState = "B2G" | "B2B" | "B2C" | null;

export function ContactRouter() {
  const t = useTranslations("Contact");
  const [activeState, setActiveState] = useState<TriageState>(null);
  
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>, stateType: "B2G" | "B2B") => {
    const value = e.target.value;
    setEmail(value);
    
    // Basic freemail validation
    const lowerEmail = value.toLowerCase();
    const freemails = ["@gmail.com", "@yahoo.com", "@hotmail.com", "@outlook.com", "@icloud.com"];
    
    if (freemails.some(domain => lowerEmail.includes(domain))) {
      setEmailError(stateType === "B2G" ? t("B2G.emailError") : t("B2B.emailError"));
    } else {
      setEmailError("");
    }
  };

  return (
    <section className="bg-tuggi-bg min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* 1. HERO & TRIAGE SELECTION */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-tuggi-dark tracking-tight mb-4">
            {t("Hero.title")}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("Hero.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Card 1: B2G */}
          <button 
            onClick={() => { setActiveState("B2G"); setEmail(""); setEmailError(""); }}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${activeState === "B2G" ? "border-tuggi-primary bg-white shadow-xl scale-105" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"}`}
          >
            <Building2 className={`w-8 h-8 mb-4 ${activeState === "B2G" ? "text-tuggi-primary" : "text-slate-400"}`} />
            <h3 className="text-lg font-bold text-tuggi-dark mb-2">{t("Triage.card1Title")}</h3>
            <p className="text-sm text-slate-500">{t("Triage.card1Desc")}</p>
          </button>

          {/* Card 2: B2B */}
          <button 
             onClick={() => { setActiveState("B2B"); setEmail(""); setEmailError(""); }}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${activeState === "B2B" ? "border-tuggi-primary bg-white shadow-xl scale-105" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"}`}
          >
            <Car className={`w-8 h-8 mb-4 ${activeState === "B2B" ? "text-tuggi-primary" : "text-slate-400"}`} />
            <h3 className="text-lg font-bold text-tuggi-dark mb-2">{t("Triage.card2Title")}</h3>
            <p className="text-sm text-slate-500">{t("Triage.card2Desc")}</p>
          </button>

          {/* Card 3: B2C */}
          <button 
             onClick={() => { setActiveState("B2C"); setEmail(""); setEmailError(""); }}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${activeState === "B2C" ? "border-emerald-500 bg-white shadow-xl scale-105" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"}`}
          >
            <UserCircle2 className={`w-8 h-8 mb-4 ${activeState === "B2C" ? "text-emerald-500" : "text-slate-400"}`} />
            <h3 className="text-lg font-bold text-tuggi-dark mb-2">{t("Triage.card3Title")}</h3>
            <p className="text-sm text-slate-500">{t("Triage.card3Desc")}</p>
          </button>
        </div>

        {/* 2. THE DYNAMIC RENDER AREA & 3. TRUST SIDEBAR */}
        <div className={`transition-opacity duration-500 ${activeState ? "opacity-100" : "opacity-0 pointer-events-none hidden"}`}>
          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* Main Form/Block Area */}
            <div className="flex-1 bg-white p-8 sm:p-10 rounded-3xl shadow-lg border border-slate-100">
              
              {/* STATE: B2G */}
              {activeState === "B2G" && (
                <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-tuggi-dark">{t("B2G.fullName")}</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2 focus:ring-tuggi-primary/50" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-tuggi-dark">{t("B2G.role")}</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2 focus:ring-tuggi-primary/50" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-tuggi-dark">{t("B2G.city")}</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2 focus:ring-tuggi-primary/50" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-tuggi-dark">{t("B2G.email")}</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => handleEmailChange(e, "B2G")}
                      className={`w-full bg-slate-50 border ${emailError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-tuggi-primary/50'} rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2`} 
                      required 
                    />
                    {emailError && <p className="text-xs text-red-500 font-medium mt-1">{emailError}</p>}
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={!!emailError || !email}
                    className="w-full bg-tuggi-dark text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed mt-4">
                    {t("B2G.cta")}
                  </button>
                </form>
              )}

              {/* STATE: B2B */}
              {activeState === "B2B" && (
                <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-tuggi-dark">{t("B2B.fullName")}</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2 focus:ring-tuggi-primary/50" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-tuggi-dark">{t("B2B.company")}</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2 focus:ring-tuggi-primary/50" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-tuggi-dark">{t("B2B.fleetSize")}</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2 focus:ring-tuggi-primary/50 appearance-none" required>
                      <option value="" disabled selected>{t("B2B.fleetTarget")}</option>
                      <option value="1-50">1 - 50</option>
                      <option value="51-200">51 - 200</option>
                      <option value="201-500">201 - 500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-tuggi-dark">{t("B2B.email")}</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => handleEmailChange(e, "B2B")}
                      className={`w-full bg-slate-50 border ${emailError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-tuggi-primary/50'} rounded-xl px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2`} 
                      required 
                    />
                    {emailError && <p className="text-xs text-red-500 font-medium mt-1">{emailError}</p>}
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={!!emailError || !email}
                    className="w-full bg-tuggi-dark text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed mt-4">
                    {t("B2B.cta")}
                  </button>
                </form>
              )}

              {/* STATE: B2C (Support Deflection) */}
              {activeState === "B2C" && (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                    <Mail className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-tuggi-dark mb-4">{t("Triage.card3Title")}</h3>
                  <p className="text-slate-600 mb-10 max-w-md leading-relaxed">
                    {t("B2C.desc")}
                  </p>
                  <a 
                    href="mailto:support@tuggi.app"
                    className="inline-flex items-center justify-center bg-emerald-500 text-white font-bold py-4 px-10 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                  >
                    {t("B2C.cta")}
                  </a>
                </div>
              )}

            </div>

            {/* Trust & Authority Sidebar */}
            <div className="lg:w-80 flex flex-col gap-6">
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="w-10 h-10 bg-blue-50 text-tuggi-primary rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-tuggi-dark uppercase tracking-wider mb-1">{t("Sidebar.hqTitle")}</h4>
                <p className="text-slate-600">{t("Sidebar.hqValue")}</p>
              </div>

              {activeState !== "B2C" && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-tuggi-dark uppercase tracking-wider mb-1">{t("Sidebar.slaTitle")}</h4>
                  <p className="text-slate-600">{t("Sidebar.slaValue")}</p>
                </div>
              )}

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 bg-gradient-to-br from-white to-slate-50">
                <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-tuggi-dark uppercase tracking-wider mb-1">{t("Sidebar.pressTitle")}</h4>
                <a href={`mailto:${t("Sidebar.pressValue")}`} className="text-tuggi-primary font-medium hover:underline">
                  {t("Sidebar.pressValue")}
                </a>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
