import { useTranslations } from "next-intl";

/**
 * The scene block — item 3 of the home, spec §6.2 (card #194).
 *
 * **It is the only block on this page that asks for nothing.** No screenshot,
 * no illustration, no CTA, no link, no capture. It sits between "Comece a ouvir
 * em um minuto" and the samples, and its whole job is to make the visitor want
 * to press play on the block below — which is also why §6.4 refuses a play
 * button in the hero: putting one up there spends the desire before this block
 * creates it.
 *
 * The form is the argument:
 *
 *  - **Dark surface**, the operator's "fundo distinto". White on
 *    `--color-tuggi-dark` measures 18.72:1. `--color-tuggi-slate` measures
 *    3.13:1 there and fails SC 1.4.3 — it is the trap this file, the player and
 *    the proof block all name, because the token reads like body text and is
 *    not one on this surface.
 *  - **Two lines, not one paragraph.** "Ouviu nenhuma." is the turn, and it may
 *    not land in the middle of a line. The break lives in the message rather
 *    than in this file (`whitespace-pre-line`): where the beat falls is a
 *    property of the sentence, and each language moves it.
 *  - **Left-aligned in a 3xl measure.** Centred ragged text over three lines
 *    loses the eye's return point.
 *  - **No entrance animation.** A text about what went past unnoticed does not
 *    slide in — and the copy of this site does not depend on JavaScript
 *    arriving (`no-javascript.spec.ts`, #191).
 */
export function HomeSceneBlock() {
  const t = useTranslations("Home.Scene");

  return (
    <section data-block="scene" className="bg-tuggi-dark py-24 lg:py-32">
      <div className="page-shell">
        <div className="max-w-3xl">
          <p className="whitespace-pre-line text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white">
            {t("lead")}
          </p>
          <p className="mt-8 text-lg leading-relaxed text-white">{t("body")}</p>
        </div>
      </div>
    </section>
  );
}
