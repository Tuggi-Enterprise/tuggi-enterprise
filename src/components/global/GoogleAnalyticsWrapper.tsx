"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useState, useEffect } from "react";
import { consentGranted, storedConsent } from "@/lib/consent";

export default function GoogleAnalyticsWrapper({ gaId }: { gaId: string }) {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    if (consentGranted(storedConsent())) {
      setHasConsent(true);
    }
  }, []);

  if (!hasConsent) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
