"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePartnerEvents } from "@/components/partner-page/ClientPartnerParts";

const COPIED_FEEDBACK_MS = 2000;
/** How long the refusal stays on the button (copy #1254 §1.5). */
const COPY_FAILED_FEEDBACK_MS = 4000;

/**
 * The fallback under the three steps: the partner's @ to type in the app, with
 * a button that copies it (spec onda 1 §1, copy onda 1 §1). It is the way in
 * for whoever is in a territory without attribution consent, where the
 * pasteboard never receives the link (BR-B2B-058: the @ is the one identifier
 * the visitor sees).
 *
 * `writeText` runs inside the click, the gesture WebKit requires. Refused or
 * missing, the @ is selected instead, one long-press away from the system Copy,
 * and the button says for a few seconds that it could not copy and what to type.
 *
 * The tap sends `partner_handle_copied` with `result: "copied" | "failed"`
 * (#1289): the @ itself is not sent, `partner_id` already says whose it is.
 */
export function PartnerHandleReserve({ handle, partnerId }: { handle: string; partnerId?: string }) {
  const t = useTranslations("PartnerPage");
  const track = usePartnerEvents(partnerId);
  const handleRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const select = () => {
    const el = handleRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;
    selection.removeAllRanges();
    selection.selectAllChildren(el);
  };

  const show = (next: "copied" | "failed", ms: number) => {
    setState(next);
    window.setTimeout(() => setState("idle"), ms);
  };

  const fail = () => {
    select();
    show("failed", COPY_FAILED_FEEDBACK_MS);
    track("partner_handle_copied", { result: "failed" });
  };

  const copy = () => {
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      fail();
      return;
    }
    clipboard.writeText(`@${handle}`).then(() => {
      show("copied", COPIED_FEEDBACK_MS);
      track("partner_handle_copied", { result: "copied" });
    }, fail);
  };

  const label =
    state === "copied" ? t("handleCopied") : state === "failed" ? t("handleCopyFailed", { handle }) : t("handleCopy");

  return (
    <div data-testid="partner-handle-reserve" className="mt-2 flex items-center justify-between gap-3 text-sm leading-[19px] text-tuggi-slate">
      <p className="min-w-0">
        {t.rich("handleReserve", {
          handle,
          b: (chunks) => (
            <strong ref={handleRef} className="select-all font-bold text-tuggi-dark">
              {chunks}
            </strong>
          ),
        })}
      </p>
      <button
        type="button"
        onClick={copy}
        aria-label={state === "idle" ? t("handleCopyA11y", { handle }) : label}
        data-testid="partner-handle-copy"
        className={`min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm font-bold text-tuggi-primary-text underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark ${
          state === "failed" ? "max-w-[55%] text-left" : ""
        }`}
      >
        <span aria-live="polite">{label}</span>
      </button>
    </div>
  );
}
