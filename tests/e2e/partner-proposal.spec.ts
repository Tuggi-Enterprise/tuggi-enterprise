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
import { MATERIAL_FIELD_IDS, MATERIAL_KINDS, materialFieldId } from "../../src/lib/partner-proposal/fields";
import {
  isCompletePostalCode,
  maskPhoneInput,
  maskPostalCodeInput,
  normalizeInstagramInput,
  normalizeWebsiteInput,
  postalCodeDigits,
} from "../../src/lib/partner-proposal/field-format";
import { readViaCepPayload } from "../../src/lib/partner-proposal/postal-code-lookup";
import { FUNNEL_KINDS, isFunnelKind, isFunnelStep } from "../../src/lib/partner-proposal/funnel";
import {
  FUNNEL_BUCKET,
  FUNNEL_LIMIT_PER_WINDOW,
} from "../../src/lib/partner-proposal/proposal-service";
import { displayAnswer } from "../../src/components/partner-proposal/PartnerProposalField";
import {
  ASIDE_CEILING,
  BREATH_CEILING,
  asideMarks,
  hasDash,
  longestBreath,
  runningTextOf,
} from "./support/copy-ruler";

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
    // The declaration blocks the submission when it is absent (BR-B2B-022 item 5), so a fixture
    // without it would make every test below assert against a 400 about the wrong field.
    legal_status_declaration: "true",
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
    // At least one kind of material is required — see the block at the end of this file. A
    // fixture with none would make every submission test below assert against a 400 that has
    // nothing to do with what it is testing.
    material_table_display_qty: "12",
    plan_choice: "map_only",
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

    // `states.taxIdRegisteredBody` left this list on 2026-08-19 with the refusal it belonged to;
    // `states.unavailableBody` took its place, and `alreadyPartner` is the line that replaced the
    // refusal itself — it carries the address as a `<mail>` chunk, resolved by the component from
    // the same `contactEmail` prop, so the address is still written in exactly one place.
    for (const key of [
      "states.submitErrorBody",
      "states.unavailableBody",
      "states.tooManyBody",
    ]) {
      expect(values.get(key), key).toContain("{email}");
    }
    expect(values.get("alreadyPartner")).toContain("<mail>");
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
    // matches `partner.clients.tax_id`, and both start from this value.
    expect(stored.rows[0].answers.tax_id).toBe("12ABC34501DE35");
  });

  test("BR-B2B-028: a CNPJ that is already a client is answered exactly like any other", async ({
    request,
  }) => {
    // THE 409 LEFT ON 2026-08-19, and this test is the inverse of the one it replaces.
    //
    // The refusal was there to stop one company being registered twice, and it never did that:
    // read-then-insert is a race, and it missed the four other write paths into
    // `partner.clients`. What it did do was answer differently for a CNPJ that is a client —
    // a public oracle of the Tuggi's client list, probeable by anyone.
    //
    // The guarantee moved to `clients_tax_id_normalized_uk`, a UNIQUE index on the same
    // normalised expression (migration `20260819190000`), which refuses the second row on every
    // path without telling anybody anything.
    const mark = probe("registered");
    const response = await submit(
      request,
      mark,
      validAnswers({ tax_id: "90.021.382/0001-22", trade_name: mark })
    );

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ state: "submitted" });

    const stored = await (await request.get(`${MOCK_BASE}/__proposals?trade_name=${mark}`)).json();
    expect(stored.rows.length, "it becomes a proposal like any other").toBe(1);
  });

  test("BR-B2B-028: the public route does not read the client table at all", () => {
    // THE MUTATION THIS CATCHES, and it is narrower than deleting the branch: put the lookup
    // back "just to mark the row" and this goes red. A read kept for any reason at all leaves a
    // difference in TIMING between a CNPJ that is a client and one that is not — a narrower
    // oracle, and still an oracle.
    const source = ["src/app/api/partner-proposal/route.ts", "src/lib/partner-proposal/proposal-service.ts"]
      .map((file) => fs.readFileSync(path.join(REPO_ROOT, file), "utf8"))
      .map((text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""))
      .join("\n");

    expect(source).not.toContain("lookupTaxId");
    expect(source).not.toContain("cnpjLookupValues");
    expect(source).not.toMatch(/from\(\s*CLIENTS\s*\)/);
    expect(source).not.toContain('"clients"');
  });

  test("BR-B2B-028: nothing in the proposal's copy tells anybody a CNPJ is a client", () => {
    // The copy of the refusal left with the refusal. A key surviving here would be the oracle
    // waiting for somebody to mount it again.
    const pt = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, "pt.json"), "utf8"));
    expect(pt.PartnerProposal.states.taxIdRegisteredTitle).toBeUndefined();
    expect(pt.PartnerProposal.states.taxIdRegisteredBody).toBeUndefined();

    // And what took its place is a line shown to EVERY visitor, which is why it discloses
    // nothing: no lookup, no condition, the same sentence for a stranger and for a partner.
    const deflection = pt.PartnerProposal.alreadyPartner as string;
    expect(deflection).toBeTruthy();
    expect(deflection).toContain("<mail>");
    const form = fs.readFileSync(
      path.join(REPO_ROOT, "src/components/partner-proposal/PartnerProposalForm.tsx"),
      "utf8"
    );
    // Rendered unconditionally — no `?`, no `&&`, no state between the key and the paragraph.
    expect(form).toContain('{t.rich("alreadyPartner", {');
    expect(form).not.toMatch(/\w+\s*(\?|&&)\s*t\.rich\("alreadyPartner"/);
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

  test("BR-B2B-026 item 2: a CNPJ typed with a space is stored under the same key", async ({
    request,
  }) => {
    const mark = probe("registered-space");
    const response = await submit(
      request,
      mark,
      // The same company as the test above, typed by somebody who fumbled the keyboard.
      validAnswers({ tax_id: "9002138200012 2", trade_name: mark })
    );

    expect(response.status(), await response.text()).toBe(200);

    const stored = await (await request.get(`${MOCK_BASE}/__proposals?trade_name=${mark}`)).json();
    expect(stored.rows.length).toBe(1);
    // THE WHOLE COST OF #398, and it outlived the refusal it was written for: the value stored
    // is the KEY, so the CMS finds this proposal beside the client and beside any twin of it.
    // Before that fix the space survived into the column and no lookup by shape found it again.
    expect(stored.rows[0].answers.tax_id).toBe("90021382000122");
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

    // `partner.partner_form_submissions.tax_id_normalized` is `GENERATED ALWAYS ... STORED` —
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

  test("the 26 fields are the ones the CMS reads back, and exactly one story is required", () => {
    // The count is the contract's, not a preference: `docs/contracts/partner-proposal-answers.md`
    // lists these ids and the CMS conference indexes `answers` by them.
    //
    // It was 24 until 2026-08-21, when the operator added the two questions the team was asking
    // by hand: whether the establishment is legalized, and which of the two tiers it wants.
    expect(PARTNER_FORM_FIELDS.length).toBe(26);
    const requiredStories = PARTNER_FORM_FIELDS.filter(
      (field) => field.step === 3 && field.required && field.id.startsWith("story_")
    ).map((field) => field.id);
    expect(requiredStories).toEqual(["story_founder"]);
  });

  test("BR-B2B-022 item 5: the legal-status declaration is required, and it is near the top", () => {
    const declaration = PARTNER_FORM_FIELDS.find(
      (field) => field.id === "legal_status_declaration"
    )!;

    // Required is what blocks the submission — there is no second rule for this gate, and the
    // operator's decision of 2026-08-21 was to block rather than to record and let through.
    expect(declaration.required).toBe(true);
    expect(declaration.type).toBe("consent");

    // A gate at the end is a gate somebody hits after typing everything. It sits beside the
    // CNPJ, which is the other fact about the establishment being a real, registered business.
    expect(declaration.step).toBe(1);
    const stepOne = PARTNER_FORM_FIELDS.filter((field) => field.step === 1).map((f) => f.id);
    expect(stepOne.indexOf("legal_status_declaration")).toBe(stepOne.indexOf("tax_id") + 1);
  });

  test("BR-B2B-016 item 6: the plan question names no price, no currency and no recurrence", () => {
    // The operator put the question here on 2026-08-21 with the reason on the record: the
    // commercial team has already explained the cost, and this form's own lede says it is for
    // whoever has already talked to us. What the rule's ceiling still forbids is publishing the
    // NUMBER, and that is what this guards — the divergence about describing what the fee buys
    // is registered for `produto`.
    const copy = flatten(messagesFor("pt").PartnerProposal);
    const surface = [
      copy.get("plans.map_only"),
      copy.get("plans.map_and_description"),
      copy.get("fields.plan_choice.label"),
      copy.get("fields.plan_choice.help"),
    ].join(" ");

    expect(surface).not.toMatch(/R\$|\bBRL\b|\d+[.,]\d{2}|reais/i);
    expect(surface).not.toMatch(/m[êe]s|mensal|anual|assinatura|recorr/i);
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

/* -------------------------------------------------------------------------- */
/* 9. The page names itself, and offers no language it cannot serve (#403)    */
/* -------------------------------------------------------------------------- */

test.describe("the proposal says what it is", () => {
  test("the tab names the page once and the brand once", async ({ request }) => {
    const html = await (await request.get(PROPOSAL_URL)).text();
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];

    // The layout already appends the brand (`template: "%s | TUGGI"`), so a `seo.title` that
    // names it again ships "Proposta de parceria — Tuggi | TUGGI". No other page of the site
    // names the brand in its own title.
    expect(title, "the served <title>").toBe("Proposta de parceria | TUGGI");
  });

  test("DS-COMPONENTE-026: the <h1> is the page, not the step, and the hierarchy has no jump", async ({
    page,
  }) => {
    await page.goto(PROPOSAL_URL);

    const h1 = page.locator("main h1");
    await expect(h1, "one page, one <h1>").toHaveCount(1);
    await expect(h1).toHaveText("Proposta de parceria");

    // The step title is what used to be the <h1>: it changes on every click, so a visitor who
    // arrived from "envie a proposta do seu estabelecimento" read "O seu estabelecimento" as the
    // name of the page and never saw the words they had clicked.
    const stepTitle = page.locator("main h2").first();
    await expect(stepTitle).toHaveText("O seu estabelecimento");

    const levels = await page
      .locator("main h1, main h2, main h3, main h4, main h5, main h6")
      .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));
    expect(levels[0], "the first heading of the page is the <h1>").toBe(1);
    for (let i = 1; i < levels.length; i++) {
      // SC 1.3.1: a level may close as many as it likes and open exactly one at a time.
      expect(levels[i] - levels[i - 1], `heading ${i} jumps from h${levels[i - 1]}`).toBeLessThan(2);
    }
  });
});

test.describe("DS-COMPONENTE-026: the language switcher offers what the route serves", () => {
  test("the proposal offers one language, and it is the one it answers in", async ({ page }) => {
    await page.goto(PROPOSAL_URL);
    await page.locator("[data-locale-trigger]").click();

    const options = page.locator("[data-locale-panel] a");
    // Three of the four used to change the URL and land back here: a no-op control with a flash
    // of URL reads as a broken site, and it is the same defect DS-COMPONENTE-026 names — a path
    // offered where the destination does not exist.
    await expect(options, "only the language this route serves").toHaveCount(1);
    await expect(options).toHaveText(PROPOSAL_LOCALE.toUpperCase());
  });

  test("a route that serves the four still offers the four", async ({ page }) => {
    await page.goto(urlFor("pt", "/partners"));
    await page.locator("[data-locale-trigger]").click();

    // THE MUTATION THIS CATCHES: making the switcher single-locale everywhere instead of on the
    // route that needs it. `localesServedOn` is the predicate, and it answers per route.
    await expect(page.locator("[data-locale-panel] a")).toHaveCount(LOCALES.length);
  });
});


/* -------------------------------------------------------------------------- */
/* 9. O material de divulgação                                                */
/* -------------------------------------------------------------------------- */

test.describe("the promotional material the partner asks for", () => {
  test("BR-B2B-021: a proposal that asks for no material is refused, and the message names the choice", () => {
    // The establishment's side of the contract IS displaying the material. A partner who
    // displays nothing cannot sign, so the form is where that is caught — not the conference,
    // three weeks later, by somebody who has to write and ask.
    const answers = validAnswers();
    for (const id of MATERIAL_FIELD_IDS) delete (answers as Record<string, string>)[id];

    const problems = validateAnswers(answers);
    expect(problems).toContainEqual({ field: MATERIAL_FIELD_IDS[0], code: "material_none" });
  });

  test("any ONE of the three satisfies the rule, and the other two stay blank", () => {
    // Blank is a legitimate answer per kind — that is why there is no checkbox beside each
    // number. What is not legitimate is all three at once.
    for (const kind of MATERIAL_KINDS) {
      const answers = validAnswers();
      for (const id of MATERIAL_FIELD_IDS) delete (answers as Record<string, string>)[id];
      (answers as Record<string, string>)[materialFieldId(kind)] = "1";

      expect(validateAnswers(answers).filter((p) => p.code === "material_none")).toEqual([]);
    }
  });

  test("zero is not an answer: it is the same as blank", () => {
    const answers = validAnswers({ material_sticker_qty: "0" });
    for (const id of MATERIAL_FIELD_IDS) {
      if (id !== "material_sticker_qty") delete (answers as Record<string, string>)[id];
    }
    // `0` fails the shape first, and that is deliberate — `quantity_invalid` says what to fix,
    // where `material_none` would send the person to a different question.
    const problems = validateAnswers(answers);
    expect(problems).toContainEqual({ field: "material_sticker_qty", code: "quantity_invalid" });
    expect(problems.filter((p) => p.code === "material_none")).toEqual([]);
  });

  test("a quantity that is not a plain count is refused by shape", () => {
    // All of these fit inside the 4-character limit, so the SHAPE is what has to catch them.
    // `01` is in the list on purpose: it parses to 1 and would order the right amount, but a
    // leading zero in a printed order is the kind of thing somebody re-reads as 10.
    for (const bad of ["1,5", "-3", "0", "01", "1 2"]) {
      const problems = validateAnswers(validAnswers({ material_sticker_qty: bad }));
      expect(
        problems.filter((p) => p.field === "material_sticker_qty" && p.code === "quantity_invalid"),
        `"${bad}" should be refused by shape`
      ).toHaveLength(1);
    }
  });

  test("a quantity past the limit is refused by length, not by shape", () => {
    // `12 mesas` is what somebody types when the label asks "em quantas mesas?". It never
    // reaches the shape check: `too_long` fires first and says how much to cut, which is the
    // more useful of the two messages. The control strips non-digits as you type, so this
    // arrives only from a client that is not the form.
    for (const long of ["12 mesas", "10000"]) {
      const codes = validateAnswers(validAnswers({ material_sticker_qty: long }))
        .filter((p) => p.field === "material_sticker_qty")
        .map((p) => p.code);
      expect(codes, `"${long}" should be refused`).toEqual(["too_long"]);
    }
  });

  test("the three answer keys derive from the kinds the database accepts", () => {
    // The same vocabulary lives in `partner.material_order_items.kind` (CHECK) and in the CMS
    // mirror. Typing a fourth id here without widening the CHECK writes a row the database
    // refuses at promotion time, weeks after the partner answered.
    expect(MATERIAL_KINDS).toEqual(["sticker", "table_display", "counter_display"]);
    expect(MATERIAL_FIELD_IDS).toEqual([
      "material_sticker_qty",
      "material_table_display_qty",
      "material_counter_display_qty",
    ]);
  });

  test("every material field carries its own copy, like every other field", () => {
    const pt = JSON.parse(
      fs.readFileSync(path.join(MESSAGES_DIR, "pt.json"), "utf8")
    ) as Record<string, any>;
    for (const id of MATERIAL_FIELD_IDS) {
      expect(pt.PartnerProposal.fields[id]?.label, `${id} has no label`).toBeTruthy();
    }
    expect(pt.PartnerProposal.material?.title).toBeTruthy();
    expect(pt.PartnerProposal.errors.material_none).toBeTruthy();
    expect(pt.PartnerProposal.errors.quantity_invalid).toBeTruthy();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The pass of 2026-08-19 — usability, copy and measurement
 *
 * Everything below is a promise the form now makes that it did not make before, and every one of
 * them had a cost that was paid by somebody standing behind a counter with a phone.
 * ------------------------------------------------------------------------------------------- */

test.describe("the field decides itself, and the masks stop the value before the server does", () => {
  test("a mask exists for every field whose shape the copy publishes", () => {
    // The CEP had NO filter at all until this date: `onChange` passed the raw value through, so
    // a letter and nine characters of anything were accepted and only refused on `Continuar`,
    // three screens from where they were typed — while the quantity field one declaration away
    // had the filter and the comment saying why.
    expect(maskPostalCodeInput("abc12345678")).toBe("12345-678");
    expect(maskPostalCodeInput("12345")).toBe("12345");
    expect(postalCodeDigits("12345-678")).toBe("12345678");
    expect(isCompletePostalCode("12345-67")).toBe(false);
  });

  test("BR-B2B-026: the phone mask is as generous as the validation, and never eats the +55", () => {
    // #402: the landing page one click earlier publishes `+55 21 90000-0000` as its example, so
    // a mask that dropped the country code would delete, keystroke by keystroke, the exact
    // number the site had just taught.
    expect(maskPhoneInput("21999998888")).toBe("(21) 99999-8888");
    expect(maskPhoneInput("+5521999998888")).toBe("+55 (21) 99999-8888");
    expect(maskPhoneInput("2133334444")).toBe("(21) 3333-4444");

    // And what the mask produces is what the validation accepts — the two ends of one promise.
    for (const typed of ["21999998888", "+5521999998888", "2133334444"]) {
      const masked = maskPhoneInput(typed);
      const problems = validateAnswers(validAnswers({ representative_phone: masked }));
      expect(problems.filter((p) => p.field === "representative_phone")).toEqual([]);
    }
  });

  test("a pasted Instagram URL becomes the handle, and a site gets its scheme", () => {
    expect(normalizeInstagramInput("https://instagram.com/meubar?igsh=xyz")).toBe("meubar");
    expect(normalizeInstagramInput("@meubar")).toBe("meubar");
    expect(normalizeWebsiteInput("meurestaurante.com.br")).toBe("https://meurestaurante.com.br");
    expect(normalizeWebsiteInput("https://ja.tem")).toBe("https://ja.tem");
    expect(normalizeWebsiteInput("")).toBe("");
  });

  test("every declared prop of the field component has a caller", () => {
    // `onBlur` was declared on `PartnerProposalField` and NO CALLER EVER PASSED IT, so validation
    // only ran on `Continuar` while the lead form of the landing page had validated on blur since
    // #294. Orphan code (CLAUDE.md §6) with a product cost, and this is the guard against it
    // coming back.
    const component = fs.readFileSync(
      path.join(REPO_ROOT, "src/components/partner-proposal/PartnerProposalField.tsx"),
      "utf8"
    );
    const form = fs.readFileSync(
      path.join(REPO_ROOT, "src/components/partner-proposal/PartnerProposalForm.tsx"),
      "utf8"
    );
    const declared = [...component.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]);
    const props = declared.filter((name) =>
      ["field", "value", "problem", "onChange", "onBlur", "nudge", "note", "last"].includes(name)
    );
    expect(props.length).toBeGreaterThan(0);
    for (const prop of props) {
      expect(form.includes(`${prop}=`), `<PartnerProposalField> never receives ${prop}`).toBe(true);
    }
  });

  test("each step is a real form, so the phone keyboard has somewhere to go", () => {
    // No `<form>` existed: `<div>`s and `type="button"`. On a phone that costs the keyboard's own
    // action key, and it costs the address grouping autofill does around a form boundary — which
    // is the exact thing the CEP lookup is trying to make cheap.
    const form = fs.readFileSync(
      path.join(REPO_ROOT, "src/components/partner-proposal/PartnerProposalForm.tsx"),
      "utf8"
    );
    expect(form).toContain("<form onSubmit={onFormSubmit}");
    expect(form).toContain('type="submit"');
  });
});

test.describe("nothing surprises the person at the end that could have been said at the start", () => {
  test("#400: a counter that could not answer is a 503, and only a real limit is a 429", async ({
    request,
  }) => {
    // The mutation this pins: give the 503 branch back the 429 body and this goes red. A deploy
    // without `PARTNER_FORM_HASH_SECRET` refuses 100% of proposals; saying "too many, wait a few
    // minutes" tells every restaurant owner something false about a state that never passes.
    const route = fs.readFileSync(
      path.join(REPO_ROOT, "src/app/api/partner-proposal/route.ts"),
      "utf8"
    );
    expect(route).toContain('limit.reason === "unavailable"');
    expect(route.indexOf('limit.reason === "unavailable"')).toBeLessThan(
      route.indexOf("too_many_submissions")
    );

    // And the copy for it is its own pair of keys, never the limit's.
    const pt = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, "pt.json"), "utf8"));
    expect(pt.PartnerProposal.states.unavailableTitle).toBeTruthy();
    expect(pt.PartnerProposal.states.unavailableBody).toBeTruthy();
    expect(pt.PartnerProposal.states.unavailableBody).not.toEqual(
      pt.PartnerProposal.states.tooManyBody
    );
    // DS-COPY-018: it points at an address the site publishes, and does not promise waiting.
    expect(pt.PartnerProposal.states.unavailableBody).toContain("{email}");
    expect(pt.PartnerProposal.states.unavailableBody).not.toMatch(/minutos?|mais tarde/i);

    // The route still answers something for a well-formed request, so the branch above is the
    // only difference this test introduced.
    const response = await request.post("/api/partner-proposal", {
      data: { answers: validAnswers({ trade_name: `Probe 400 ${Date.now()}` }) },
      headers: { "x-forwarded-for": `10.40.0.${Math.floor(Math.random() * 200) + 1}` },
    });
    expect([200, 429, 503]).toContain(response.status());
  });

  test("the copy of the offline state does not promise a send that does not exist", () => {
    // DS-COPY-018. `states.offlineBody` said "a gente envia quando a conexão voltar" and there is
    // no queue, no `online` handler that submits and no retry: whoever wrote offline, read that
    // sentence and closed the tab had sent nothing.
    const form = fs.readFileSync(
      path.join(REPO_ROOT, "src/components/partner-proposal/PartnerProposalForm.tsx"),
      "utf8"
    );
    expect(form).not.toMatch(/addEventListener\("online"[\s\S]{0,200}handleSubmit/);

    for (const file of fs.readdirSync(MESSAGES_DIR)) {
      const messages = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, file), "utf8"));
      const offline = messages.PartnerProposal?.states?.offlineBody;
      if (!offline) continue;
      expect(offline, `${file} promises an automatic send`).not.toMatch(
        /a gente envia|enviamos (quando|assim)/i
      );
    }
  });

  test("#404: the review shows the label of a choice, never its identifier", () => {
    // The one screen that says "confira o que você escreveu" was showing `bar_cafe` to somebody
    // who had picked "Bar ou café". Mutation: render `answers[field.id]` there again and this
    // goes red.
    const pt = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, "pt.json"), "utf8"));
    const category = PARTNER_FORM_FIELDS.find((field) => field.id === "category")!;
    const state = PARTNER_FORM_FIELDS.find((field) => field.id === "state")!;
    const translate = (key: string) => {
      const parts = key.split(".");
      let node: any = pt.PartnerProposal;
      for (const part of parts) node = node?.[part];
      return typeof node === "string" ? node : key;
    };

    expect(displayAnswer(category, "bar_cafe", translate)).toBe("Bar ou café");
    expect(displayAnswer(category, "bar_cafe", translate)).not.toBe("bar_cafe");
    expect(displayAnswer(state, "RJ", translate)).toContain("Rio de Janeiro");
    // Everything that is not a choice is shown as typed.
    const tradeName = PARTNER_FORM_FIELDS.find((field) => field.id === "trade_name")!;
    expect(displayAnswer(tradeName, "Cantina do Zé", translate)).toBe("Cantina do Zé");

    const form = fs.readFileSync(
      path.join(REPO_ROOT, "src/components/partner-proposal/PartnerProposalForm.tsx"),
      "utf8"
    );
    expect(form).toContain("displayAnswer(field,");
  });
});

test.describe("the CEP fills the address, and never blocks anybody", () => {
  test("an unknown CEP and a broken upstream both answer with a null address", async ({
    request,
  }) => {
    for (const cep of ["", "123", "abcdefgh"]) {
      const response = await request.get(`/api/postal-code?cep=${cep}`);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ address: null });
    }
  });

  test("the reader of the upstream payload keeps the four fields and nothing else", () => {
    expect(
      readViaCepPayload({
        cep: "28950-000",
        logradouro: "Rua das Palmeiras",
        bairro: "Centro",
        localidade: "Armação dos Búzios",
        uf: "rj",
        ibge: "3300100",
        ddd: "22",
      })
    ).toEqual({
      street: "Rua das Palmeiras",
      district: "Centro",
      city: "Armação dos Búzios",
      state: "RJ",
    });

    // ViaCEP answers `{ "erro": "true" }` — a string — for a code nobody uses.
    expect(readViaCepPayload({ erro: "true" })).toBeNull();
    expect(readViaCepPayload({ erro: true })).toBeNull();
    expect(readViaCepPayload(null)).toBeNull();
    // A single-range CEP has no street and no district, and that is a legitimate answer.
    expect(readViaCepPayload({ logradouro: "", bairro: "", localidade: "Búzios", uf: "RJ" })).toEqual(
      { street: "", district: "", city: "Búzios", state: "RJ" }
    );
  });

  test("the lookup only ever writes into empty fields", () => {
    const form = fs.readFileSync(
      path.join(REPO_ROOT, "src/components/partner-proposal/PartnerProposalForm.tsx"),
      "utf8"
    );
    // Somebody who typed the street before the CEP keeps what they typed.
    expect(form).toContain('if ((next[id] ?? "").trim()) return;');
  });
});

test.describe("BR-USUARIO-030: the funnel is counted, and it carries nothing about anybody", () => {
  test("the vocabulary is closed on both ends", () => {
    expect(FUNNEL_KINDS).toEqual(["view", "start", "step", "submitted", "failed"]);
    expect(isFunnelKind("view")).toBe(true);
    expect(isFunnelKind("answers")).toBe(false);
    expect(isFunnelStep(1)).toBe(true);
    expect(isFunnelStep(5)).toBe(false);
    expect(isFunnelStep("1")).toBe(false);
  });

  test("a row is two values, and a body that carries a third is dropped", async ({ request }) => {
    const accepted = await request.post("/api/partner-proposal/funnel", {
      data: { kind: "view", step: 2, answers: { tax_id: "12345678000199" }, session: "abc" },
    });
    expect(accepted.status()).toBe(204);

    // ASSERTED OVER EVERY ROW, not over the one this test wrote, and that is deliberate: the
    // suite runs fully parallel and the counting table has no per-test marker to filter on — it
    // is the table's whole point that a row identifies nobody and nothing. So the promise is
    // stated the way it is actually made: NO row, from any test, carries anything else.
    const rows: Record<string, unknown>[] = await (await request.get(`${MOCK_BASE}/__funnel`)).json();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(["event", "step"]);
    }
    expect(JSON.stringify(rows)).not.toContain("12345678000199");
    expect(JSON.stringify(rows)).not.toContain("abc");
  });

  test("an unknown kind writes nothing and still answers 204", async ({ request }) => {
    const response = await request.post("/api/partner-proposal/funnel", {
      data: { kind: "exfiltrate", step: 1 },
    });
    expect(response.status()).toBe(204);

    // Same reasoning as above: the guarantee is about the vocabulary of the table, so it is
    // asserted against the table and not against a delta a neighbouring test can move.
    const rows: { event: string }[] = await (await request.get(`${MOCK_BASE}/__funnel`)).json();
    const unknown = rows.map((row) => row.event).filter((event) => !FUNNEL_KINDS.includes(event as never));
    expect(unknown).toEqual([]);
  });

  test("the address is counted and never written", () => {
    // The route DOES read the caller's address, and that changed on review: an unbounded
    // anonymous INSERT is unbounded disk, not just a skewed chart, so the same counter that
    // guards the submission guards this — containing abuse on this public door is already the
    // fourth declared purpose of the collection, and the key-hashed address is already the
    // mechanism the policy publishes.
    //
    // What must stay true is the other half: the address reaches the COUNTER and never the row.
    const route = fs
      .readFileSync(path.join(REPO_ROOT, "src/app/api/partner-proposal/funnel/route.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(route).toContain("registerFunnelAttempt(clientAddressOf(request.headers))");
    // `recordFunnelEvent` takes the kind and the step, and there is no third argument to slip an
    // address into.
    expect(route).toMatch(/recordFunnelEvent\(\s*kind\s*,[^)]*\)/);
    expect(route).not.toContain("hashClientAddress");
  });

  test("the funnel has a budget of its own, and it is not the submission's", () => {
    // A tab left open on the form cannot spend the budget its own submission needs. The bucket
    // goes into the key-hash, which is what keeps the two apart.
    expect(FUNNEL_BUCKET).toBe("proposal-funnel");
    expect(FUNNEL_BUCKET).not.toBe("");
    expect(FUNNEL_LIMIT_PER_WINDOW).toBeGreaterThan(SUBMISSION_LIMIT_PER_WINDOW);

    // Same address, different bucket, different key — so neither counter can see the other's
    // attempts. Skipped where the secret is absent, because there is no key to compare.
    const address = "203.0.113.77";
    const submissionKey = hashClientAddress(address, "");
    const funnelKey = hashClientAddress(address, FUNNEL_BUCKET);
    if (submissionKey && funnelKey) expect(submissionKey).not.toBe(funnelKey);
  });

  test("BR-USUARIO-028 item 1: the fifth purpose is declared in the four languages", () => {
    // The counter and the line of the policy are the SAME delivery. A table counting without the
    // paragraph published is exactly the defect that rule exists to stop, so this test fails if
    // the events module ships and any locale still says the purposes are four.
    const declared = {
      pt: [/cinco coisas/, /medir onde o formulário atrapalha/],
      en: [/five things/, /measuring where the form gets in the way/],
      es: [/cinco cosas/, /medir dónde estorba el formulario/],
      it: [/cinque cose/, /misurare dove il modulo crea difficoltà/],
    } as const;

    for (const [locale, patterns] of Object.entries(declared)) {
      const messages = JSON.parse(
        fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")
      );
      const item = messages.Legal.Privacy.s1Item5 as string;
      for (const pattern of patterns) {
        expect(item, `${locale} does not declare the fifth purpose`).toMatch(pattern);
      }
      // The negative is qualified by the collection it belongs to — the trap of #304.
      expect(item, `${locale} keeps an unqualified negative`).toMatch(
        /Para essa contagem|For that count|Para esa cuenta|Per questo conteggio/
      );
    }
  });
});

test.describe("DS-COPY-013: the proposal is punctuated by a person", () => {
  const pt = () =>
    JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, "pt.json"), "utf8")) as Record<string, any>;

  // Widened here and not in `partner-offer-ladder.spec.ts` because `PartnerProposal` exists in
  // `pt` alone: the proposal is Brazil by construction (CNPJ with a check digit, UF, an
  // eight-digit CEP), and a loop over the four locales would assert three absences.
  test("criterion 32: no value carries more than one aside mark", () => {
    const offenders = runningTextOf(pt().PartnerProposal, "PartnerProposal")
      .filter(([, value]) => asideMarks(value) > ASIDE_CEILING)
      .map(([key, value]) => `${key}: ${asideMarks(value)} aside marks`);
    expect(offenders).toEqual([]);
  });

  test("criterion 33: no value runs ninety characters without a pause", () => {
    const offenders = runningTextOf(pt().PartnerProposal, "PartnerProposal")
      .filter(([, value]) => longestBreath(value) > BREATH_CEILING)
      .map(([key, value]) => `${key}: ${longestBreath(value)} characters without a pause`);
    expect(offenders).toEqual([]);
  });

  test("the proposal reaches for no dash at all, which is tighter than the rule asks", () => {
    // The frequency clause allows a third of a block. The rewrite of 2026-08-19 needed none, and
    // zero is the line that makes a reintroduced dash a red build rather than a judgement call.
    const withDash = runningTextOf(pt().PartnerProposal, "PartnerProposal")
      .filter(([, value]) => hasDash(value))
      .map(([key]) => key);
    expect(withDash).toEqual([]);
  });

  test("the material block says what BR-B2B-021 allows and nothing it does not", () => {
    const material = pt().PartnerProposal.material;
    const help = material.help as string;
    // Ratified by `produto` on 2026-08-19: the confirmation happens, so the sentence may be
    // published. It is what holds an expectation the contract does not cover.
    expect(help).toMatch(/confirma a quantidade/);
    // What may never appear: a joining fee, a kit, a gift, a commercial counterpart.
    expect(`${material.title} ${help}`).not.toMatch(/taxa|kit|brinde|contrapartida|ades[ãa]o/i);
  });
});

test.describe("the promotional material moved out of step 1", () => {
  test("step 1 is the thirteen fields on the facade, plus the legal-status gate", () => {
    const stepOne = PARTNER_FORM_FIELDS.filter((field) => field.step === 1);
    expect(stepOne.length).toBe(14);
    expect(stepOne.some((field) => MATERIAL_FIELD_IDS.includes(field.id))).toBe(false);
  });

  test("the three quantities share one step, and it is the last one that asks", () => {
    const steps = new Set(
      MATERIAL_FIELD_IDS.map((id) => PARTNER_FORM_FIELDS.find((field) => field.id === id)!.step)
    );
    expect([...steps]).toEqual([3]);
    // The step that asks last, with the review after it — not a fifth step, which three numbers
    // do not pay for.
    expect(Math.max(...PARTNER_FORM_FIELDS.map((field) => field.step))).toBe(3);
  });

  test("the answers contract still carries all 26 keys, and the ids did not move", () => {
    // Moving the step is a change to the contract document and to the CMS mirror; moving an ID
    // would be a migration. This is the guard that the second did not happen by accident.
    expect(PARTNER_FIELD_IDS.length).toBe(26);
    for (const kind of MATERIAL_KINDS) {
      expect(PARTNER_FIELD_IDS).toContain(materialFieldId(kind));
    }
  });
});
