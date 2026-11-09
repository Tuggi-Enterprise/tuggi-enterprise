"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { PageReportField } from "@/lib/public-page";

export interface PageReportLabels {
  trigger: string;
  title: string;
  /** One label per field the page shows; a field left out is not offered. */
  options: Partial<Record<PageReportField, string>>;
  send: string;
  received: string;
  failed: string;
  close: string;
}

interface PageReportProps {
  /** The page's own report route, `/@nome/report`: the name the page showed. */
  action: string;
  labels: PageReportLabels;
}

type Phase = "idle" | "sending" | "received" | "failed";

/**
 * "Denunciar este perfil" in the footer of a creator's page (BR-USUARIO-051
 * item 5): a native dialog, no account, nothing asked about the person. The
 * visitor picks what is wrong and sends; the server answers "received" for
 * every name, so the dialog has one success and one failure, and the failure
 * keeps the choice for another try.
 */
export function PageReport({ action, labels }: PageReportProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [field, setField] = useState<PageReportField | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const options = (Object.entries(labels.options) as [PageReportField, string][]).filter(([, label]) => label);

  function open() {
    setField(null);
    setPhase("idle");
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!field || phase === "sending") return;
    setPhase("sending");
    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ field }),
      });
      setPhase(res.ok ? "received" : "failed");
    } catch {
      setPhase("failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        data-testid="page-report-open"
        className="underline-offset-4 hover:underline hover:text-tuggi-dark"
      >
        {labels.trigger}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        data-testid="page-report-dialog"
        className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-2xl bg-white p-6 text-tuggi-dark shadow-xl backdrop:bg-tuggi-dark/50"
      >
        <h2 id={titleId} className="text-lg font-extrabold leading-snug">
          {labels.title}
        </h2>
        {phase === "received" ? (
          <p role="status" data-testid="page-report-received" className="mt-4 text-base leading-relaxed">
            {labels.received}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{labels.title}</legend>
              {options.map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-base has-[:checked]:border-tuggi-primary"
                >
                  <input
                    type="radio"
                    name="field"
                    value={value}
                    checked={field === value}
                    onChange={() => setField(value)}
                    className="h-4 w-4 accent-tuggi-primary"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {phase === "failed" && (
              <p role="alert" data-testid="page-report-failed" className="mt-3 text-sm text-red-700">
                {labels.failed}
              </p>
            )}
            <button
              type="submit"
              disabled={!field || phase === "sending"}
              className="mt-5 w-full rounded-xl bg-tuggi-secondary px-4 py-3 text-base font-bold text-tuggi-dark hover:bg-tuggi-secondary-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {labels.send}
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-bold text-tuggi-slate hover:text-tuggi-dark"
        >
          {labels.close}
        </button>
      </dialog>
    </>
  );
}
