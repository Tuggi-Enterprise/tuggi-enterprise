"use client";

import { useFormStatus } from "react-dom";
import { BUTTON_PRIMARY } from "@/components/partner-proposal/styles";

/**
 * The one act on the unsubscribe page, in its pending state.
 *
 * It is a client component for exactly one reason: `useFormStatus` is what
 * tells the button the Server Action is in flight. Everything else on the page
 * stays on the server.
 *
 * It goes BUSY, never disabled. A disabled button leaves the tab order, and a
 * screen reader loses its place at the moment the person most needs to be told
 * something is happening — the same choice `PartnerProposalForm` makes.
 */
export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" aria-busy={pending} className={`${BUTTON_PRIMARY} w-full min-h-[48px]`}>
      {label}
    </button>
  );
}
