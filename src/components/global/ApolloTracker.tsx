"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { consentGranted, storedConsent } from "@/lib/consent";

export default function ApolloTracker({ appId }: { appId: string }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [nocache, setNocache] = useState("");

  useEffect(() => {
    // Set nocache on mount to avoid hydration mismatch while keeping it dynamic per-session
    setNocache(Math.random().toString(36).substring(7));
    
    if (consentGranted(storedConsent())) {
      setHasConsent(true);
    }
  }, []);

  if (!hasConsent || !nocache) return null;

  return (
    <Script
      id="apollo-tracker"
      src={`https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=${nocache}`}
      strategy="afterInteractive"
      onLoad={() => {
        // @ts-ignore
        if (window.trackingFunctions) {
          // @ts-ignore
          window.trackingFunctions.onLoad({ appId });
        }
      }}
    />
  );
}
