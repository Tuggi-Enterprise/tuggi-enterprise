"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useState, useEffect } from "react";

export default function GoogleAnalyticsWrapper({ gaId }: { gaId: string }) {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("tuggi_cookie_consent");
    if (consent === "true") {
      setHasConsent(true);
    }
  }, []);

  if (!hasConsent) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
