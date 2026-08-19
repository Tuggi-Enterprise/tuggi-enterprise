/**
 * The shapes the proposal's fields take AS THE PERSON TYPES — mask, filter and normalisation.
 *
 * WHY THIS IS A MODULE AND NOT FOUR CLOSURES IN THE COMPONENT. Each function here is a promise
 * with a test: `12 mesas` never reaches the server, a CEP never carries a letter, a pasted
 * Instagram URL becomes a handle. A promise that a test can break does not live inside a
 * `switch` in a render function.
 *
 * WHAT IS DELIBERATELY NOT HERE: the CNPJ, whose mask is `@/lib/cnpj` because the same
 * expression validates it, formats it and builds the deduplication key that the CMS asks the
 * same question of. Two masks for one document is the defect `normalizeCnpj` already cost once
 * (#398).
 *
 * The rule every function obeys: **the value the person sees is the value stored**, minus what
 * was never an answer. None of them refuses; refusing is `validateAnswers`, and it happens at
 * the field's blur and again at the click. Something that got past a mask still gets a message.
 */

/** `00000-000` — the CEP's own notation, and the length `postal_code` declares (9). */
export const POSTAL_CODE_PLACEHOLDER = "00000-000";

/**
 * The CEP as it is typed: digits only, hyphen after the fifth, never more than eight digits.
 *
 * Until 2026-08-19 this field had no filter at all — `onChange` passed `event.target.value`
 * straight through, so a letter, a space and nine characters of anything were all accepted and
 * only refused on `Continuar`, three screens from where they were typed. The quantity field one
 * declaration away had the filter and the comment explaining why; this one was the omission.
 */
export function maskPostalCodeInput(value: string): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** The eight digits, with no mask — what `validateAnswers` and the CEP lookup both read. */
export function postalCodeDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "").slice(0, 8);
}

/** Whether this is a CEP that can be looked up: eight digits, nothing else. */
export function isCompletePostalCode(value: string): boolean {
  return postalCodeDigits(value).length === 8;
}

/** `(00) 00000-0000` — the shape `representative_phone.help` publishes, with the DDD. */
export const PHONE_PLACEHOLDER = "(00) 00000-0000";

/**
 * A Brazilian number as it is typed, with the country code tolerated in front.
 *
 * THE MASK IS AS GENEROUS AS THE VALIDATION, and that is the whole design. `PHONE_DIGITS` in
 * `schema.ts` accepts ten or eleven digits with an optional `55` in front, because the landing
 * page one click earlier publishes `+55 21 90000-0000` as its example (#402). A mask that
 * refused the `55` would delete, keystroke by keystroke, the exact number the site had just
 * taught — so the `55` is kept and shown as `+55`, and only what is past eleven national digits
 * is dropped.
 */
export function maskPhoneInput(value: string): string {
  let digits = (value ?? "").replace(/\D/g, "");

  let country = "";
  // Only when there is more than a national number in there: `5521999999999` is 55 + 11 digits,
  // while `5521999999` is a landline in São Paulo state and must not lose its first two digits.
  if (digits.startsWith("55") && digits.length > 11) {
    country = "+55 ";
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (digits.length === 0) return country.trim();
  if (digits.length <= 2) return `${country}(${digits}`;
  const area = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `${country}(${area}) ${rest}`;
  const split = rest.length > 8 ? 5 : 4;
  return `${country}(${area}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/**
 * The Instagram handle, out of whatever was pasted.
 *
 * `instagram.help` used to ask for "só o @", and the field accepted anything. The gesture a
 * person actually makes is to open the app, copy the profile link and paste it — which arrives
 * as `https://instagram.com/meubar?igsh=…`. Stripping it here means the help can say "paste the
 * link" instead of asking somebody to edit a URL by hand on a phone.
 *
 * The `@` is dropped rather than kept: the value is the handle, and the `@` is notation. The
 * CMS renders it back with the `@` in front, where it is decoration and not data.
 */
export function normalizeInstagramInput(value: string): string {
  let handle = (value ?? "").trim();
  handle = handle.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  handle = handle.replace(/^(?:m\.)?instagram\.com\//i, "");
  handle = handle.split(/[/?#]/)[0];
  handle = handle.replace(/^@+/, "");
  // The characters Instagram itself allows in a handle; anything else was never part of one.
  return handle.replace(/[^A-Za-z0-9._]/g, "");
}

/**
 * The website as it should be stored: whatever was typed, with a scheme in front of it.
 *
 * `website` declares `type: "url"` and the component rendered it as a plain text input with no
 * `inputMode` and no validation of any kind, so `meurestaurante` was accepted and reached the
 * CMS as something nobody can click. Adding the scheme is the smallest honest fix: it does not
 * refuse anybody, and what is stored is openable.
 *
 * NORMALISATION IS ON BLUR, NEVER ON KEYSTROKE. Prefixing `https://` while somebody is still
 * typing the first letter puts the cursor after a scheme they did not ask for.
 */
export function normalizeWebsiteInput(value: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  // Someone who typed a scheme we do not want to guess about keeps what they typed.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  return `https://${raw}`;
}

/** Whether a website value is shaped like a host — one dot, no space. Never blocks; see below. */
export function looksLikeWebsite(value: string): boolean {
  const raw = normalizeWebsiteInput(value);
  if (!raw) return true;
  try {
    const url = new URL(raw);
    return url.hostname.includes(".") && !/\s/.test(url.hostname);
  } catch {
    return false;
  }
}
