"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ATTRIBUTION_GATE_ENDPOINT } from "@/lib/consent";

/**
 * The verdict of BR-USUARIO-033 for THIS visit, held in memory and nowhere else.
 *
 * WHAT IT GATES, AND WHY IT IS ONE DOOR AND NOT TWO. The two attribution
 * channels — the `referrer` of the Play link and the `tuggi_click_<uuid>` the
 * App Store CTA puts in the pasteboard — are both built out of one input: the
 * `click_id` in the `tuggi_attr` cookie, read by `useAttributionClickId`
 * (`src/lib/conversionHooks.ts`). Gating that read gates both, which is item 6
 * getting what it asks for by construction: "recusa não se contorna por outro
 * caminho", and the cheapest way to honour that is for there to BE no other
 * door. Gating the two channels separately would have made two doors to keep
 * shut and a third one to forget.
 *
 * THE READ IS THE OPERATION, NOT ONLY THE WRITE. `/api/attribution` already
 * refuses to plant the cookie in a gated territory, so for a visitor who
 * arrives there this changes nothing. It exists for the one it does not cover:
 * the tourist whose first touch was captured lawfully in Brazil and who then
 * opens the site in Portugal. Art. 5(3) reaches any storage OR ACCESS on the
 * terminal equipment (item 3, the EU/EEA line) — the lawfulness of the write
 * does not travel with him, so the read has to ask again, here.
 *
 * IN MEMORY, AND THAT IS THE POINT. The verdict is never written to a cookie
 * nor to `localStorage`: persisting it would be, itself, the write on the
 * device this gate exists to avoid. It is re-asked on every page load, and it
 * costs one same-origin GET.
 *
 * THE RESTING STATE IS "NO". A gate that opens while it is still asking is a
 * gate that is open for the first hundred milliseconds of every visit — long
 * enough for a mount effect, and exactly the failure item 2 describes as the
 * one that only surfaces in an audit. So `false` is the initial value, the
 * value of the context outside any provider, and the value every failure path
 * lands on: fetch rejected, non-2xx, body that is not JSON, `allowed` that is
 * not literally `true`.
 */
const AttributionGateContext = createContext(false);

/**
 * Asks once per page load, on mount — NEVER from inside a click handler.
 *
 * A `fetch` awaited inside the handler would spend the user gesture before
 * `clipboard.writeText` is reached, and WebKit rejects that write outright
 * ("outside the scope of a user gesture ... immediate rejection of the
 * promise", webkit.org/blog/10855, consulted 2026-08-18). That rejection has
 * already been swallowed by an empty `catch` once in this codebase, on every
 * iPhone, for as long as the channel existed — which is why the verdict has to
 * be in hand before the tap, not fetched during it.
 */
export function AttributionGateProvider({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(ATTRIBUTION_GATE_ENDPOINT, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("gate failed"))))
      .then((data: unknown) => {
        // Shape-checked, not trusted: a 200 carrying HTML (a CDN error page,
        // an offline shell) must land on "no", not on a truthy object.
        if (alive) setAllowed((data as { allowed?: unknown } | null)?.allowed === true);
      })
      .catch(() => {
        if (alive) setAllowed(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <AttributionGateContext.Provider value={allowed}>{children}</AttributionGateContext.Provider>
  );
}

/**
 * May this visit read its own first touch, and act on it? — BR-USUARIO-033.
 *
 * `false` until the server says otherwise, including for a component rendered
 * outside the provider: the default of the context is the closed answer, so
 * forgetting to mount it costs commissions rather than compliance.
 */
export function useAttributionAllowed(): boolean {
  return useContext(AttributionGateContext);
}
