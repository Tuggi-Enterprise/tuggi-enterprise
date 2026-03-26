"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function ApolloTracker({ appId }: { appId: string }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [nocache, setNocache] = useState("");

  useEffect(() => {
    // Set nocache on mount to avoid hydration mismatch while keeping it dynamic per-session
    setNocache(Math.random().toString(36).substring(7));
    
    const consent = localStorage.getItem("tuggi_cookie_consent");
    if (consent === "true") {
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
