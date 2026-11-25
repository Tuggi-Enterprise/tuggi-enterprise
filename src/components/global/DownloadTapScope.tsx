"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { DownloadTapTarget, PartnerPageVia } from "@/lib/download-tap";

const DownloadTapContext = createContext<DownloadTapTarget | null>(null);

/**
 * Marks the part of a page whose store buttons count a tap on the download
 * button (BR-B2B-068 item 2.f). The partner page renders it exactly where it
 * counts the opening (2.e), with the same client and door, so a tap is
 * counted on the pages a visit is and nowhere else. Every store button takes
 * it through `useStoreCampaign`, so a new one inside the page counts with no
 * change of its own. Outside it (the footer, every other page) nothing is sent.
 */
export function DownloadTapScope({
  clientId,
  via,
  children,
}: {
  clientId: string;
  via: PartnerPageVia;
  children: ReactNode;
}) {
  const target = useMemo(() => ({ clientId, via }), [clientId, via]);
  return <DownloadTapContext.Provider value={target}>{children}</DownloadTapContext.Provider>;
}

/** The page whose taps are counted, or null outside a partner page. */
export function useDownloadTapTarget(): DownloadTapTarget | null {
  return useContext(DownloadTapContext);
}
