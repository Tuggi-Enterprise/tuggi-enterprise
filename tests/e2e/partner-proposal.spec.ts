import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import { LOCALES, type SiteLocale } from "../../src/i18n/locales";
import { localizedPathname } from "../../src/i18n/pathnames";
import { PROPOSAL_LOCALE, PROPOSAL_ROUTE } from "../../src/lib/partner-proposal/link";
import {
  FORBIDDEN_FIELDS,
  PARTNER_FIELD_IDS,
  PARTNER_FORM_FIELDS,
} from "../../src/lib/partner-proposal/fields";
import {
  normalizeAnswers,
  validateAnswers,
  type FieldProblem,
} from "../../src/lib/partner-proposal/schema";
import {
  HASH_SECRET_VAR,
  SUBMISSION_COLUMNS,
  SUBMISSION_LIMIT_PER_WINDOW,
  hashClientAddress,
} from "../../src/lib/partner-proposal/proposal-service";
import { CNPJ_REFERENCE_VECTORS, isValidCnpj, normalizeCnpj } from "../../src/lib/cnpj";

/**
 * The partnership proposal, moved from `tuggi-cms` to the site — card #396.
 *
 * The rules under test, and what each one costs when it breaks:
 *
 *  - **BR-B2B-026, item 2** — one public address, no credential of any kind, and the CNPJ is
 *    what keeps an establishment from being registered twice. This surface is a door on the
 *    internet in front of a `service_role` write, so the two things standing in front of that
 *    write are proved by MUTATION here and not by reading the route: take the CNPJ lookup out,
 *    or take the attempt counter out, and a test below has to go red.
 *  - **BR-B2B-022** — the form asks for no document and offers no upload; the alvará and the
 *    contrato social are checked in person, and the gate is closed at the conference in the CMS.
 *  - **BR-USUARIO-028, item 1** — a public surface collects no category the published policy
 *    does not declare, and the policy may not keep a negative the move made false. The sentence
 *    that said the form lived outside this site is now checked, in four languages.
 *  - **DS-COMPONENTE-026** — the bridge to a second surface renders only where that surface can
 *    be completed, and the way back is above the first field.
 *  - **DS-COPY-018** — copy only points at a channel the system opens. "Fale com a pessoa que
 *    passou este link" was true in the CMS and is false on a landing page.
 *
 * WHAT `answers` LOOKS LIKE IS NOW A CROSS-REPOSITORY CONTRACT — the site writes it and the CMS
 * reads it — and it is written down in `docs/contracts/partner-proposal-answers.md`. The half of
 * it this file can prove is the writing half.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const MESSAGES_DIR = path.join(REPO_ROOT, "src/messages");
const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

const PROPOSAL_URL = `/${PROPOSAL_LOCALE}${localizedPathname(PROPOSAL_LOCALE, PROPOSAL_ROUTE)}`;

function urlFor(locale: SiteLocale, route: string): string {
  return `/${locale}${localizedPathname(locale, route)}`;
}

function messagesFor(locale: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"));
}

/** Every leaf string of a namespace, by dotted key. */
function flatten(node: unknown, prefix = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof node === "string") out.set(prefix, node);
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

/**
 * A probe that is unique per run and per worker.
 *
 * Playwright reuses a running `webServer` between local runs, so the double keeps its rows and
 * its per-address counter across them: a fixed trade name would make the second run of the day
 * read the first run's rows, and a fixed address would arrive at its own limit before the first
 * assertion. A CNPJ cannot carry the uniqueness — it has to be a valid one — so the probe does,
 * and the address is derived from it.
 */
const RUN = `${process.pid.toString(36)}${Date.now().toString(36)}`;
const probe = (label: string) => `probe-${label}-${RUN}`;

/**
 * A complete, valid set of answers. `tax_id` is the Serpro alphanumeric example — the one shape
 * a pre-2026 implementation gets wrong while passing every test written with numeric data.
 */
function validAnswers(overrides: Record<string, string> = {}) {
  return {
    trade_name: "Cantina do Antônio",
    legal_name: "Cantina do Antônio Ltda",
    tax_id: "12.ABC.345/01DE-35",
    category: "restaurant",
    address: "Rua das Palmeiras, 120",
    district: "Centro",
    postal_code: "28950-000",
    city: "Búzios",
    state: "RJ",
    representative_name: "Antônio Ferreira",
    representative_role: "Sócio",
    representative_email: "antonio@exemplo.com.br",
    representative_phone: "(22) 99876-5432",
    story_founder:
      "Meu avô, Antônio, abriu a casa em 1961 num galpão que era da fábrica de guarda-chuvas do bairro.",
    ...overrides,
  };
}

/**
 * One submission, from one address. The address is what the per-address counter keys on, so
 * every test that submits brings its own — the suite runs fully parallel and a shared bucket
 * would make the rate-limit test depend on the order of the others.
 */
async function submit(
  request: APIRequestContext,
  address: string,
  answers: Record<string, string>
) {
  return request.post("/api/partner-proposal", {
    headers: { "content-type": "application/json", "x-forwarded-for": address },
    data: { answers },
    maxRedirects: 0,
  });
}

/* -------------------------------------------------------------------------- */
/* 1. The route, the redirect and the indexation                              */
/* -------------------------------------------------------------------------- */

test.describe("the proposal answers at one address, in one language", () => {
  test("BR-B2B-026 item 2: the pt page answers 200 and the other three redirect to it", async ({
    request,
  }) => {
    const pt = await request.get(PROPOSAL_URL, { maxRedirects: 0 });
    expect(pt.status(), PROPOSAL_URL).toBe(200);

    for (const locale of LOCALES.filter((one) => one !== PROPOSAL_LOCALE)) {
      const target = urlFor(locale, PROPOSAL_ROUTE);
      const response = await request.get(target, { maxRedirects: 0 });
      // 3xx and never 404: the four slugs are declared, and a stranger who edits the locale in
      // the address bar is sent to the one language the form can be finished in.
      expect(response.status(), `${target} status`).toBeGreaterThanOrEqual(300);
      expect(response.status(), `${target} status`).toBeLessThan(400);
      // TEMPORARY on purpose. "Only pt" is a reversible product decision, and a 308 is cached by
      // the browser for as long as it likes: the day the other three are published, everybody
      // who already knocked would never see them.
      expect(response.status(), `${target} is temporary, not permanent`).toBe(307);
      expect(new URL(response.headers()["location"], "http://x").pathname, `${target} target`).toBe(
        PROPOSAL_URL
      );
    }
  });

  test("the page is noindex and declares no hreflang alternate", async ({ request }) => {
    const html = await (await request.get(PROPOSAL_URL)).text();

    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    // hreflang on a noindex page is a contradictory signal, and three of the four would point
    // at a redirect.
    expect(html).not.toContain('rel="alternate"');
  });

  test("none of the four URLs is in the sitemap", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const locale of LOCALES) {
      expect(xml, `${locale} slug in sitemap`).not.toContain(urlFor(locale, PROPOSAL_ROUTE));
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 2. DS-COMPONENTE-026 — the bridge, and the way back                        */
/* -------------------------------------------------------------------------- */

test.describe("DS-COMPONENTE-026: a bridge only where the destination can be completed", () => {
  test("the pt hub links to the proposal and the other three hubs do not", async ({ request }) => {
    const pt = await (await request.get(urlFor("pt", "/partners"))).text();
    expect(pt, "pt hub links to the proposal").toContain(`href="${PROPOSAL_URL}"`);

    for (const locale of LOCALES.filter((one) => one !== PROPOSAL_LOCALE)) {
      const html = await (await request.get(urlFor(locale, "/partners"))).text();
      // Every slug variant, not just this locale's: a link built with the wrong locale would be
      // a path to the same unfinishable task.
      for (const variant of LOCALES) {
        expect(html, `${locale} hub must not link to the ${variant} slug`).not.toContain(
          `href="${urlFor(variant, PROPOSAL_ROUTE)}"`
        );
      }
    }
  });

  test("the way back is above the first field, and it points at the landing form", async ({
    request,
  }) => {
    const html = await (await request.get(PROPOSAL_URL)).text();
    const backHref = `${urlFor("pt", "/partners")}#lead-form`;

    const back = html.indexOf(`href="${backHref}"`);
    const firstInput = html.indexOf("<input");

    expect(back, `link to ${backHref}`).toBeGreaterThan(-1);
    expect(firstInput, "the page renders a field").toBeGreaterThan(-1);
    // Whoever landed on the wrong surface has to find out before 21 fields, not after three
    // steps.
    expect(back, "the way back comes before the first <input>").toBeLessThan(firstInput);
  });

  test("the bridge is not a button: it carries no filled-surface class", async ({ request }) => {
    const html = await (await request.get(urlFor("pt", "/partners"))).text();
    const anchor = html.slice(
      html.indexOf(`href="${PROPOSAL_URL}"`) - 400,
      html.indexOf(`href="${PROPOSAL_URL}"`) + 200
    );
    // The page has one destination by a registered decision; a second target with the weight of
    // a button divides the funnel.
    expect(anchor, "the bridge must not use the filled action surface").not.toContain(
      "bg-tuggi-secondary"
    );
    expect(anchor).toContain("underline");
  });
});

/* -------------------------------------------------------------------------- */
/* 3. DS-COPY-018 and BR-USUARIO-028 — what the copy may say                  */
/* -------------------------------------------------------------------------- */

test.describe("DS-COPY-018: the copy points at a channel that exists", () => {
  test("no value of the proposal names the link somebody passed on", () => {
    const values = flatten(messagesFor("pt").PartnerProposal);
    expect(values.size, "the namespace exists in pt.json").toBeGreaterThan(100);

    const offenders: string[] = [];
    for (const [key, value] of values) {
      // The four wordings of the same instruction. On a landing page there is no person who
      // passed a link — there is an address the site publishes.
      if (/este link|questo link|este enlace|this link/i.test(value)) {
        offenders.push(`${key} — "${value}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("the address is never written inside a value; it arrives as {email}", () => {
    const values = flatten(messagesFor("pt").PartnerProposal);
    const offenders = [...values]
      .filter(([, value]) => /@\s*tuggi\.app/i.test(value))
      .map(([key]) => key);
    // One owner for the address: `Contact.Sidebar.pressValue`, the way `Partners.form.noscript`
    // already takes it.
    expect(offenders).toEqual([]);

    for (const key of ["states.submitErrorBody", "states.taxIdRegisteredBody", "states.tooManyBody"]) {
      expect(values.get(key), key).toContain("{email}");
    }
  });

  test("BR-USUARIO-028 item 1: the policy no longer says the form is outside this site", () => {
    const FALSE_NOW: Record<string, string> = {
      pt: "fora deste site",
      en: "outside this site",
      es: "fuera de este sitio",
      it: "fuori da questo sito",
    };
    for (const [locale, phrase] of Object.entries(FALSE_NOW)) {
      const messages = messagesFor(locale) as {
        Legal: { Privacy: { s1Item5: string } };
      };
      const item = messages.Legal.Privacy.s1Item5;
      // A published negative is what an authority quotes literally, and this one became false
      // the moment the form moved here.
      expect(item, `${locale}.json Legal.Privacy.s1Item5`).not.toContain(phrase);
      // …and the rest of the item survives whole: the categories, the four purposes and the code
      // derived from the IP are the half BR-USUARIO-030 fixes, and they did not move.
      expect(item.length, `${locale}.json s1Item5 keeps the rest of the item`).toBeGreaterThan(600);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 4. The CNPJ — alphanumeric, and it is the deduplication key                */
/* -------------------------------------------------------------------------- */

test.describe("BR-B2B-026 item 2: the CNPJ is what keeps a company from entering twice", () => {
  test("the alphanumeric reference vectors are honoured, uppercase only", () => {
    for (const cnpj of CNPJ_REFERENCE_VECTORS.valid) {
      expect(isValidCnpj(normalizeCnpj(cnpj)), `valid: ${cnpj}`).toBe(true);
    }
    for (const cnpj of CNPJ_REFERENCE_VECTORS.invalid) {
      // `12.ABc.…` is in the invalid list precisely because the reference refuses lowercase, so
      // the raw value is what is checked here — not the normalized one.
      expect(isValidCnpj(cnpj), `invalid: ${cnpj}`).toBe(false);
    }
  });

  test("a valid alphanumeric CNPJ is accepted and stored normalized", async ({ request }) => {
    const mark = probe("alphanumeric");
    const response = await submit(request, mark, validAnswers({ trade_name: mark }));
    expect(response.status(), await response.text()).toBe(200);
    expect((await response.json()).contactEmail).toBe("antonio@exemplo.com.br");

    const stored = await (await request.get(`${MOCK_BASE}/__proposals?trade_name=${mark}`)).json();
    expect(stored.rows.length, "the row reached the table").toBe(1);
    // The mask never reaches the column: the CMS filters `tax_id_normalized` and the promotion
    // matches `core.clients.tax_id`, and both start from this value.
    expect(stored.rows[0].answers.tax_id).toBe("12ABC34501DE35");
  });

  test("a CNPJ already in core.clients is refused with 409 and never becomes a row", async ({
    request,
  }) => {
    const mark = probe("registered");
    const response = await submit(
      request,
      mark,
      validAnswers({ tax_id: "90.021.382/0001-22", trade_name: mark })
    );

    // 409 and not 400: nothing the person typed is wrong.
    expect(response.status()).toBe(409);
    expect(await response.json()).toMatchObject({ error: "tax_id_registered", field: "tax_id" });

    const stored = await (await request.get(`${MOCK_BASE}/__proposals?trade_name=${mark}`)).json();
    // THE MUTATION THIS CATCHES: delete the `taxId === "registered"` branch from the route and
    // the same company gets a second proposal — and, one promotion later, a second client
    // record somebody has to unpick by hand.
    expect(stored.rows, "a registered company writes no row").toEqual([]);
  });

  test("BR-B2B-026 item 2: a CNPJ carrying an invisible character is stored clean", () => {
    // The four shapes measured on the real modules in #398. Each one passed `validateAnswers`
    // — which strips `[^A-Z0-9]` before checking the digits — and was then STORED by a second
    // expression that only removed `.` `/` `-`. Nothing was too long either: `12ABC34501DE3 5`
    // is 15 characters against a `maxLength` of 18.
    const DIRTY: Record<string, string> = {
      space: "12ABC34501DE3 5",
      tab: "12ABC34501DE3\t5",
      underscore: "12ABC_34501DE35",
      // Escapes, not the characters themselves: a literal zero-width or non-breaking
      // character in a source file is invisible to the next reader and to every diff.
      "zero width": "12ABC34501DE3\u200B5",
      "non-breaking space": "12ABC34501DE3\u00A05",
    };

    for (const [name, typed] of Object.entries(DIRTY)) {
      const answers = normalizeAnswers({ tax_id: typed });
      // THE MUTATION THIS CATCHES: put `normalizeCnpj` back in `normalizeAnswers` and the value
      // stored keeps the rubbish — which is what made the "already a client" refusal stop
      // matching and the CMS conference screen report no existing client.
      expect(answers?.tax_id, `${name} must not survive into the stored value`).toBe(
        "12ABC34501DE35"
      );
      expect(validateAnswers(answers!).filter((p) => p.field === "tax_id")).toEqual([]);
    }
  });

  test("BR-B2B-026 item 2: a registered CNPJ typed with a space is still refused with 409", async ({
    request,
  }) => {
    const mark = probe("registered-space");
    const response = await submit(
      request,
      mark,
      // The same company as the 409 test above, typed by somebody who fumbled the keyboard —
      // or by somebody who worked out that a space was enough to walk past the third barrier.
      validAnswers({ tax_id: "9002138200012 2", trade_name: mark })
    );

    expect(response.status(), await response.text()).toBe(409);
    expect(await response.json()).toMatchObject({ error: "tax_id_registered", field: "tax_id" });

    const stored = await (await request.get(`${MOCK_BASE}/__proposals?trade_name=${mark}`)).json();
    // The whole cost of #398 in one assertion: before the fix this answered 200, wrote the row,
    // and a stranger had a proposal in the queue under a partner's CNPJ that no lookup by shape
    // would ever find again.
    expect(stored.rows, "a registered company writes no row, however it was typed").toEqual([]);
  });

  test("an invalid CNPJ is refused before anything is written", async ({ request }) => {
    const response = await submit(
      request,
      probe("invalid-cnpj"),
      validAnswers({ tax_id: "12.ABC.345/01DE-34" })
    );
    expect(response.status()).toBe(400);
    const payload = await response.json();
    expect(payload.error).toBe("invalid_answers");
    expect(payload.problems).toContainEqual({ field: "tax_id", code: "cnpj_invalid" });
  });
});

/* -------------------------------------------------------------------------- */
/* 5. The barrier                                                             */
/* -------------------------------------------------------------------------- */

test.describe("the per-address limit is the barrier in front of a service_role write", () => {
  test("BR-B2B-026: the eleventh submission from one address is refused with 429", async ({
    request,
  }) => {
    const address = probe("limit");

    for (let i = 0; i < SUBMISSION_LIMIT_PER_WINDOW; i++) {
      const response = await submit(
        request,
        address,
        validAnswers({ tax_id: `9002138200012${i % 10}`, trade_name: `${address}-${i}` })
      );
      // Some of these are refused for their own CNPJ being invalid — that is fine and is not
      // what is measured: an attempt is counted before the body is even parsed, which is the
      // point of registering it first.
      expect(response.status(), `attempt ${i + 1}`).not.toBe(429);
    }

    const refused = await submit(
      request,
      address,
      validAnswers({ trade_name: `${address}-over` })
    );
    // THE MUTATION THIS CATCHES: delete the `registerSubmissionAttempt` call and this route
    // becomes an open pipe into a table that only `service_role` can reach.
    expect(refused.status()).toBe(429);
    expect(await refused.json()).toMatchObject({ error: "too_many_submissions" });
    expect(Number(refused.headers()["retry-after"])).toBeGreaterThan(0);
  });

  test("the counter's key is an HMAC, and with no secret there is no key at all", () => {
    const before = process.env[HASH_SECRET_VAR];
    try {
      process.env[HASH_SECRET_VAR] = "";
      // NULL, never an unsalted digest. Falling back to a bare `sha256(ip)` would leave the door
      // open, write rows indistinguishable from the good ones, and be reversible by anybody who
      // gets the table — the whole IPv4 space is 2^32 digests. The caller refuses instead, and
      // the type is what forces it to.
      expect(hashClientAddress("203.0.113.1")).toBeNull();

      process.env[HASH_SECRET_VAR] = "a-secret";
      const keyed = hashClientAddress("203.0.113.1");
      expect(keyed).toMatch(/^[0-9a-f]{64}$/);
      // The raw address is not derivable from the row, and a plain digest of it is not what is
      // stored: `Legal.Privacy.s1Item5` publishes "um código calculado a partir do endereço de
      // IP, e não o endereço", and this is the sentence being kept.
      expect(keyed).not.toBe(createHash("sha256").update("203.0.113.1").digest("hex"));
      // The same address always produces the same value — that is the point, the counter has to
      // recognise a repeat caller — which is also why the policy calls it not anonymous.
      expect(hashClientAddress("203.0.113.1")).toBe(keyed);
      expect(hashClientAddress("203.0.113.2")).not.toBe(keyed);
    } finally {
      if (before === undefined) delete process.env[HASH_SECRET_VAR];
      else process.env[HASH_SECRET_VAR] = before;
    }
  });

  test("another address is not affected by a neighbour's limit", async ({ request }) => {
    const mark = probe("neighbour");
    const response = await submit(
      request,
      mark,
      validAnswers({ tax_id: "00000000000191", trade_name: mark })
    );
    expect(response.status(), await response.text()).toBe(200);
  });
});

/* -------------------------------------------------------------------------- */
/* 6. What the INSERT carries — the key the write may not name                */
/* -------------------------------------------------------------------------- */

test.describe("the write never touches the deduplication key", () => {
  test("the row carries exactly four columns, and tax_id_normalized is not one of them", async ({
    request,
  }) => {
    const mark = probe("columns");
    const response = await submit(
      request,
      mark,
      validAnswers({ tax_id: "44108058000129", trade_name: mark })
    );
    expect(response.status(), await response.text()).toBe(200);

    const stored = await (await request.get(`${MOCK_BASE}/__proposals?trade_name=${mark}`)).json();
    expect(stored.rows.length).toBe(1);

    // `core.partner_form_submissions.tax_id_normalized` is `GENERATED ALWAYS ... STORED` —
    // measured on the live database on 2026-08-17, and the migration that created it carries a
    // probe for the same thing. Postgres refuses an INSERT that supplies a generated column
    // (428C9), so naming it here would not corrupt the deduplication key: it would 500 every
    // submission. Either way the write has no business naming it, and this is the assertion that
    // says so out loud (#398 fixed the three places that claimed the column was a DEFAULT).
    expect(Object.keys(stored.rows[0]).sort()).toEqual([...SUBMISSION_COLUMNS].sort());
    expect(Object.keys(stored.rows[0])).not.toContain("tax_id_normalized");
  });

  test("a column posted by hand is stripped before the write, not refused after it", async ({
    request,
  }) => {
    const mark = probe("stripped");
    const response = await submit(request, mark, {
      ...validAnswers({ tax_id: "90024778000123", trade_name: mark }),
      // The two shapes an attacker would try: the generated key itself, and a client column.
      tax_id_normalized: "ATTACKERKEY001",
      commission_rate: "0",
    });
    expect(response.status(), await response.text()).toBe(200);

    const stored = await (await request.get(`${MOCK_BASE}/__proposals?trade_name=${mark}`)).json();
    expect(stored.rows.length).toBe(1);
    expect(Object.keys(stored.rows[0].answers).sort()).toEqual(
      Object.keys(validAnswers()).sort()
    );
  });
});

/* -------------------------------------------------------------------------- */
/* 7. The field list is the contract                                          */
/* -------------------------------------------------------------------------- */

test.describe("BR-B2B-022 / BR-USUARIO-030: the list of what is asked", () => {
  test("no banking column, no billing address, no client column", () => {
    const asked = new Set<string>(PARTNER_FIELD_IDS);
    const forbidden = FORBIDDEN_FIELDS.filter((field) => asked.has(field));
    expect(forbidden).toEqual([]);
  });

  test("the 21 fields are the ones the CMS reads back, and exactly one story is required", () => {
    // The count is the contract's, not a preference: `docs/contracts/partner-proposal-answers.md`
    // lists these ids and the CMS conference indexes `answers` by them.
    expect(PARTNER_FORM_FIELDS.length).toBe(21);
    const requiredStories = PARTNER_FORM_FIELDS.filter(
      (field) => field.step === 3 && field.required
    ).map((field) => field.id);
    expect(requiredStories).toEqual(["story_founder"]);
  });

  test("every field has a label, and every required field has its own message", () => {
    const values = flatten(messagesFor("pt").PartnerProposal);
    const missing: string[] = [];

    for (const field of PARTNER_FORM_FIELDS) {
      // A missing key renders the key itself on screen — the whole reason there is no generic
      // `errors.required` fallback (DS-COMPONENTE-016).
      if (!values.get(`fields.${field.id}.label`)) missing.push(`fields.${field.id}.label`);

      // The message names the field ("Preencha o CNPJ"), never "campo obrigatório", so it only
      // exists where it can be reached: `errorMessage` asks for it on code `required`, and only
      // a required field — or a select with an option outside its list — produces that code.
      const requiredError = values.get(`fields.${field.id}.requiredError`);
      if (field.required && !requiredError) missing.push(`fields.${field.id}.requiredError`);
      if (!field.required && requiredError !== undefined) {
        missing.push(`fields.${field.id}.requiredError exists for an optional field`);
      }
    }

    expect(missing).toEqual([]);
  });

  test("an absent help key is absence, never an empty value", () => {
    const values = flatten(messagesFor("pt").PartnerProposal);
    // The CMS carried `help: ""` for the fields that need none. An empty value renders nothing
    // and is indistinguishable from a translation nobody wrote, so the site refuses it and the
    // key is simply not there — which is why the component asks `t.has` before reading.
    const empty = [...values].filter(([, value]) => value.trim() === "").map(([key]) => key);
    expect(empty).toEqual([]);
  });

  test("an unknown key never reaches the answers, and a non-string body is refused", () => {
    const stripped = normalizeAnswers({ trade_name: "Casa", commission_rate: "0.5" });
    expect(stripped).toEqual({ trade_name: "Casa" });

    // The shape that used to return `{}` and be saved OVER the draft, with a 200 on top.
    expect(normalizeAnswers({ trade_name: 42 })).toBeNull();
    expect(normalizeAnswers([])).toBeNull();
    expect(normalizeAnswers("nope")).toBeNull();
    // An absent body is an empty draft, which is legitimate.
    expect(normalizeAnswers(undefined)).toEqual({});
  });

  test("the CNPJ is upper-cased on the way in, and the mask is stripped", () => {
    // Exactly 18 characters, which is `tax_id`'s own limit: the length is checked on the RAW
    // value, before trimming, so padding the same CNPJ with spaces is refused as a malformed
    // body rather than trimmed into shape. That is the behaviour the CMS had and it is kept.
    expect(normalizeAnswers({ tax_id: "  12.abc.345/01de-35 " })).toBeNull();

    const answers = normalizeAnswers({ tax_id: "12.abc.345/01de-35" });
    // The order matters and is part of the contract: strip, then upper-case. Inverting it lets a
    // case-folding rule reach the key — `ß` upper-cases to `SS` — and puts one company under two
    // keys depending on which end normalised it.
    expect(answers?.tax_id).toBe("12ABC34501DE35");
    expect(validateAnswers(answers!).filter((p) => p.field === "tax_id")).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* 8. The telephone — one journey, one format (#402)                          */
/* -------------------------------------------------------------------------- */

/** What this form says about one telephone, and nothing about the other twenty fields. */
function phoneProblems(typed: string): FieldProblem[] {
  const answers = normalizeAnswers(validAnswers({ representative_phone: typed }));
  return validateAnswers(answers!).filter((problem) => problem.field === "representative_phone");
}

test.describe("BR-B2B-026: the proposal takes the number the site taught one click earlier", () => {
  test("BR-B2B-026: every shape of a Brazilian number is accepted, with or without +55", () => {
    const ACCEPTED = [
      "+55 21 90000-0000",
      "+5521900000000",
      "55 21 90000-0000",
      "(21) 90000-0000",
      "21900000000",
      "(22) 3333-4444",
      "2233334444",
    ];
    for (const typed of ACCEPTED) {
      expect(phoneProblems(typed), `${typed} must be accepted`).toEqual([]);
    }

    // The floor did not move: a number without the area code is still refused, which is what
    // `errors.phone_short` says — and, since this change, all it says.
    //
    // What is NOT asserted, deliberately: that a foreign number is refused. `+1 555 000 0000`
    // is eleven digits and so is a Brazilian mobile with its area code, so counting digits
    // cannot tell them apart — it could not before this change either. The field asks for a
    // number the team can call about this partnership; whether the establishment is in Brazil
    // is decided by the CNPJ, which has a check digit.
    for (const typed of ["90000-0000", "900000000"]) {
      expect(phoneProblems(typed), `${typed} must still be refused`).toEqual([
        { field: "representative_phone", code: "phone_short" },
      ]);
    }
  });

  test("BR-B2B-026: the example published on the landing page passes this form's validation", () => {
    // THE POINT OF THIS TEST IS THE JOIN, not either side. `Partners.form.whatsappHint` is the
    // hint under the telephone field of the landing form, one click before this one, and it
    // publishes a number with the country code. Until #402 this form answered "Escreva o
    // telefone com DDD" to that exact number — a message that denied what the person had just
    // done and asked for a correction they had already made.
    const hint = flatten(messagesFor("pt").Partners as Record<string, unknown>).get(
      "form.whatsappHint"
    );
    expect(hint, "Partners.form.whatsappHint exists in pt.json").toBeTruthy();

    const example = hint!.match(/\+\d[\d\s()-]*\d/)?.[0];
    expect(example, `the hint publishes a number to copy — got "${hint}"`).toBeTruthy();

    // Editing either side alone turns this red: change the hint's example to a shape the form
    // refuses, or narrow `PHONE_DIGITS` back, and the divergence is caught here instead of by a
    // merchant on step 2 of 4.
    expect(phoneProblems(example!), `the published example "${example}" must be accepted`).toEqual(
      []
    );
  });

  test("BR-B2B-026: the field's own help carries an example this form accepts", () => {
    const help = flatten(messagesFor("pt").PartnerProposal).get(
      "fields.representative_phone.help"
    );
    expect(help, "the telephone field explains its format").toBeTruthy();

    const example = help!.match(/\d[\d\s()-]*\d/)?.[0];
    expect(example, `the help publishes an example — got "${help}"`).toBeTruthy();
    expect(phoneProblems(example!), `the help's example "${example}" must be accepted`).toEqual([]);
  });
});
