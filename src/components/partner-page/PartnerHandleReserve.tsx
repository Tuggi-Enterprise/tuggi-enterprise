"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

const COPIED_FEEDBACK_MS = 2000;

/**
 * The fallback under the three steps: the partner's @ to type in the app, with
 * a button that copies it (spec onda 1 §1, copy onda 1 §1). It is the way in
 * for whoever is in a territory without attribution consent, where the
 * pasteboard never receives the link (BR-B2B-058: the @ is the one identifier
 * the visitor sees).
 *
 * `writeText` runs inside the click, the gesture WebKit requires. Refused or
 * missing, the @ is selected instead, one long-press away from the system Copy.
 */
export function PartnerHandleReserve({ handle }: { handle: string }) {
  const t = useTranslations("PartnerPage");
  const handleRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const select = () => {
    const el = handleRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;
    selection.removeAllRanges();
    selection.selectAllChildren(el);
  };

  const copy = () => {
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      select();
      return;
    }
    clipboard.writeText(`@${handle}`).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
      },
      () => select()
    );
  };

  return (
    <div data-testid="partner-handle-reserve" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tuggi-slate">
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
        aria-label={copied ? t("handleCopied") : t("handleCopyA11y", { handle })}
        data-testid="partner-handle-copy"
        className="min-h-11 rounded-lg px-2 text-sm font-bold text-tuggi-primary-text underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-tuggi-dark"
      >
        <span aria-live="polite">{copied ? t("handleCopied") : t("handleCopy")}</span>
      </button>
    </div>
  );
}
