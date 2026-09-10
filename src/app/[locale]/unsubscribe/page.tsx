import crypto from "crypto";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSupabaseClient } from "@/lib/supabase-server";
import { buildAlternates } from "@/lib/seo";
import { redirect } from "@/i18n/routing";
import { LOCALES, type SiteLocale } from "@/i18n/locales";
import { CARD, NOTE_BOX, ALERT_BOX } from "@/components/partner-proposal/styles";
import { SubmitButton } from "./SubmitButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Declared, even though the page is noindex: without it the page inherits
  // the layout's alternates, which are the home page's, and /pt/unsubscribe
  // was declaring /pt as its own canonical.
  //
  // The address NEVER reaches this function. The title is what travels in a
  // screenshot and in a shared tab.
  return {
    title: "Unsubscribe",
    alternates: buildAlternates(locale, "unsubscribe"),
    robots: { index: false, follow: false },
  };
}

/**
 * Verifies the stateless HMAC signature minted by the CMS Edge Function
 * `send-newsletter` (HMAC-SHA256 of the address, base64url, no padding). The
 * `NEWSLETTER_SECRET` here has to be the SAME one the Edge Function holds.
 *
 * The signature IS the authorization: it only exists for an address we mailed,
 * and it authorizes nothing but that one address. That is why the link carries
 * no expiry and no nonce — replaying it unsubscribes the same person again,
 * which is the outcome they asked for the first time.
 *
 * Note for anyone writing copy against this: NOTHING HERE EXPIRES. There is no
 * timestamp in the signed material. A link minted in June still verifies today,
 * so a screen may not tell the reader their link "may have expired" — it never
 * does, and the real cause is a link the mail client cut in half.
 */
function verify(emailB64: string, sig: string, secret: string): string | null {
  try {
    const email = Buffer.from(emailB64, "base64url").toString("utf8");
    const expected = crypto.createHmac("sha256", secret).update(email).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return email;
  } catch {
    return null;
  }
}

/**
 * The language of the EMAIL, which is not always the language of the route.
 *
 * `?lang=` wins over the route locale. Newsletters in Italian link to `/en`
 * carrying `?lang=it`, because `SITE_LOCALE` in the CMS still maps `it` to the
 * English route — from a time when the site had no Italian locale. It has one
 * now, but those links sit in inboxes forever, so the override stays.
 */
function emailLanguage(routeLocale: string, langParam?: string): SiteLocale {
  const src = (langParam || routeLocale).toLowerCase();
  return LOCALES.find((l) => src.startsWith(l)) ?? "en";
}

/**
 * What the page is showing.
 *
 * `confirm` is the one that writes nothing, and `failed` is `confirm` wearing
 * an alert: it keeps the button, because saying "this one is on us" and then
 * taking the act away is the same dead end as before with a nicer sentence.
 */
type Screen = "confirm" | "done" | "invalid" | "failed";

const OUTCOMES = new Set<string>(["done", "failed", "invalid"]);

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ e?: string; s?: string; lang?: string; state?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { e, s, lang: langParam, state } = await searchParams;
  const lang = emailLanguage(locale, langParam);
  const t = await getTranslations({ locale: lang, namespace: "Unsubscribe" });
  const tContact = await getTranslations({ locale: lang, namespace: "Contact" });
  // One support address for the whole site, read where the proposal page reads
  // it. A second copy here would be a second thing to update (§6 SSOT).
  const support = tContact("Sidebar.pressValue");

  const secret = process.env.NEWSLETTER_SECRET || "";
  const email = e && s && secret ? verify(e, s, secret) : null;

  /**
   * THE OPT-OUT IS WRITTEN HERE, AND ONLY HERE.
   *
   * It used to run during the render of this page. Rendering a page is a GET,
   * and a GET is what every machine between us and the reader performs without
   * being asked: corporate URL-defense prefetch, antivirus link scanners, the
   * unfurl a messenger runs when the link is pasted into a chat. Each of them
   * was unsubscribing the person, silently, with no click. Only 7 opt-outs
   * exist in total (measured 2026-09-10 in production) and there is no way to
   * tell which of them a human performed.
   *
   * A Server Action is a POST by construction, so the write now takes an act.
   * It is deliberately NOT a route handler: this way the signature never
   * becomes a URL a scanner can follow, and there is no second place in the
   * codebase able to write this row.
   *
   * The automated one-click path — the Gmail "Unsubscribe" button, RFC 8058 —
   * never reaches this page: `List-Unsubscribe` points at the CMS Edge
   * Function, which refuses GET with 405. This is the human path, the link in
   * the footer.
   */
  async function confirmUnsubscribe(formData: FormData) {
    "use server";

    const actionSecret = process.env.NEWSLETTER_SECRET || "";
    const submittedE = String(formData.get("e") ?? "");
    const submittedS = String(formData.get("s") ?? "");
    // Re-verified from the submitted body, never trusted from the closure: a
    // Server Action is its own endpoint, reachable with a body we never
    // rendered.
    const address = actionSecret ? verify(submittedE, submittedS, actionSecret) : null;
    const language = emailLanguage(locale, String(formData.get("lang") ?? "") || undefined);

    let outcome: Screen = "invalid";
    if (address) {
      // service_role, and there is no alternative: `marketing.email_unsubscribes`
      // has RLS on with zero policies and no grant to `anon`. With the
      // publishable key this upsert answers 42501 and the opt-out is not
      // recorded at all.
      const supabase = getSupabaseClient("serviceRole");
      const { error } = await supabase
        .schema("marketing")
        .from("email_unsubscribes")
        .upsert(
          { email: address, source: "footer_link" },
          { onConflict: "email", ignoreDuplicates: true },
        );
      outcome = error ? "failed" : "done";
    }

    // `failed` and `invalid` are separate screens on purpose. They used to be
    // the same one, which told a person whose write WE dropped that their link
    // had expired — so they closed the tab instead of trying again.
    //
    // The signed pair rides along into the outcome, and both screens that
    // follow still need it: `failed` because it keeps offering the act, `done`
    // because it names the address that stopped — which is the whole reason a
    // reader with three addresses can tell the right one was removed. It is
    // the same pair that was already in the URL on the way in, so nothing is
    // exposed that was not, and the page re-verifies it before showing anything.
    redirect({
      href: {
        pathname: "/unsubscribe",
        query: { state: outcome, lang: language, e: submittedE, s: submittedS },
      },
      locale,
    });
  }

  // A `done` or `failed` with no verifiable address cannot render: both
  // sentences name the address, and `failed` offers an act that needs it.
  const requested: Screen | null = state && OUTCOMES.has(state) ? (state as Screen) : null;
  const screen: Screen =
    requested && (requested === "invalid" || email) ? requested : email ? "confirm" : "invalid";
  const actionable = (screen === "confirm" || screen === "failed") && Boolean(email);

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-20">
      <div className={`w-full max-w-md text-center ${CARD}`}>
        {screen === "failed" ? (
          // The alert carries its title in TEXT, not only in a red border —
          // SC 1.4.1, colour is never the only carrier.
          <div className={`${ALERT_BOX} text-left`}>
            <h1 className="text-base font-semibold text-tuggi-error">{t("failed.title")}</h1>
            <p className="mt-2 text-sm text-tuggi-slate">{t("failed.body", { support })}</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-tuggi-dark">{t(`${screen}.title`)}</h1>
            {/* The address sits INSIDE the sentence, and `overflow-wrap` is not
                decoration: a long address overflows the card at 360px, which is
                the width that matters here. */}
            <p className="mt-3 text-sm text-tuggi-slate [overflow-wrap:anywhere]">
              {screen === "invalid"
                ? t("invalid.body", { support })
                : t(`${screen}.body`, { email: email ?? "" })}
            </p>
          </>
        )}

        {screen === "confirm" ? (
          <div className={`${NOTE_BOX} mt-5 text-left`}>
            {/* Said BEFORE the act, not after it: BR-COMUNICACAO-015 item 3 —
                unsubscribing reaches marketing only, and account confirmation
                and password recovery keep arriving. A person who reads "you
                will not receive our emails anymore" and then gets a password
                reset concludes we ignored them, and the next click is "spam". */}
            <p className="text-sm text-tuggi-slate">{t("confirm.notice")}</p>
          </div>
        ) : null}

        {actionable ? (
          <form action={confirmUnsubscribe} className="mt-6">
            <input type="hidden" name="e" value={e} />
            <input type="hidden" name="s" value={s} />
            <input type="hidden" name="lang" value={lang} />
            <SubmitButton
              label={screen === "failed" ? t("failed.retryLabel") : t("confirm.confirmLabel")}
            />
          </form>
        ) : null}
      </div>
    </main>
  );
}
