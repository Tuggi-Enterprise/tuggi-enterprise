"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { consentGranted, storedConsent } from "@/lib/consent";

export default function MicrosoftClarity({ id }: { id: string }) {
  // Only load Clarity AFTER the user accepts cookies — same gate as GA/Apollo.
  // Clarity sets third-party cookies (clarity.ms / bing.com); loading it before
  // consent both fails Lighthouse Best Practices and is non-compliant (LGPD/GDPR).
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    if (consentGranted(storedConsent())) {
      setHasConsent(true);
    }
  }, []);

  if (!hasConsent) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${id}");
        `,
      }}
    />
  );
}
