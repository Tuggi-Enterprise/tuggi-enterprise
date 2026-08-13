/**
 * Phone numbers, in the one format the database accepts.
 *
 * `campaign.inbound_leads.phone_e164` carries
 * `CHECK (phone_e164 ~ '^\+[1-9]\d{1,14}$')` — migration `20260812130000`,
 * card #295 — and nothing about that shape survives contact with a human:
 * people type `+55 (22) 99999-8888`, with spaces, parentheses and a dash. A
 * value the CHECK refuses comes back as a 500 from PostgREST, and a 500 here is
 * a lead that never calls again. So the string is normalized **before** the
 * POST and again **on** the POST, by this function, in both places.
 *
 * ---------------------------------------------------------------------------
 * What it deliberately does not do: guess a country
 * ---------------------------------------------------------------------------
 *
 * A national number — `(22) 99999-8888` — cannot become E.164 without knowing
 * which country dials it, and every source of that guess is wrong often enough
 * to matter: the page locale is a language and not a country (`es` is twenty
 * countries), and the IP is the network's country, not the number's, for
 * exactly the visitor most likely to be on a foreign SIM. A guessed country
 * code produces a number that passes the CHECK, stores clean and rings nobody
 * — the worst of the three outcomes, because it is the only one that is
 * silent.
 *
 * So a number with no country code is **not** accepted, and the field says so
 * before it is typed in: `Partners.form.whatsappHint` carries the example with
 * the country code, and `Partners.form.errorWhatsapp` repeats it as the
 * correction (`DS-COPY-002`). The visitor fixes one field; nobody stores a
 * fiction.
 *
 * `00` is accepted as the international prefix — it is what a keypad in most of
 * the world produces for the `+`, and reading it is free.
 */

/** ITU-T E.164 fixes the maximum at 15 digits, country code included. */
export const PHONE_MAX_DIGITS = 15;

/**
 * The shortest number worth storing. Not a standard — E.164 has no minimum
 * that is useful here — but a floor under the typos: seven digits or fewer,
 * with a country code in front, is not a mobile line anywhere we operate.
 */
export const PHONE_MIN_DIGITS = 8;

/**
 * `raw` in E.164, or `null` when it is not a number this site can store.
 *
 * @example
 *   toE164("+55 (22) 99999-8888")  // "+5522999998888"
 *   toE164("0055 22 99999 8888")   // "+5522999998888"
 *   toE164("(22) 99999-8888")      // null — no country code
 */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const explicitPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  // A leading 00 is the international prefix spelled out, and only when the
  // caller did not already write a `+`: "+00…" is a typo, not two prefixes.
  const doubleZero = !explicitPlus && digits.startsWith("00");
  if (doubleZero) digits = digits.slice(2);

  if (!explicitPlus && !doubleZero) return null;
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) return null;
  // Same guard the column has: no country code starts with zero.
  if (!/^[1-9]/.test(digits)) return null;

  return `+${digits}`;
}
