"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function DataDeletionForm() {
  const t = useTranslations("Legal.DataDeletion.Form");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const locale = useState(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/");
      return parts[1] || "en";
    }
    return "en";
  })[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const response = await fetch("/api/data-deletion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, locale }),
      });

      if (!response.ok) throw new Error("Failed to submit request");
      
      setStatus("success");
    } catch (error) {
      console.error("Error requesting deletion:", error);
      setStatus("error");
    }
  };

  return (
    <form className="flex flex-col sm:flex-row gap-4 relative" onSubmit={handleSubmit}>
      <input 
        id="deletion-email"
        type="email" 
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading" || status === "success"}
        className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-3 text-tuggi-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary/50 transition-all disabled:opacity-60 disabled:bg-slate-50"
        required
      />
      <button 
        type="submit"
        disabled={status === "loading" || status === "success"}
        className="bg-tuggi-dark text-white font-bold px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors shadow-md whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px] focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-primary/50"
      >
        {status === "loading" && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
        {status === "success" ? t("success") : t("submit")}
      </button>
    </form>
  );
}
