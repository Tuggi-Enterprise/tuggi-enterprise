import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import { localizedPathname } from "../../src/i18n/pathnames";
import { LOCALES } from "../../src/i18n/locales";
import { toE164 } from "../../src/lib/phone";
import { businessTypeCode, LEAD_BUSINESS_TYPES } from "../../src/lib/business-types";
import { cityOf } from "../../src/lib/territory";

/**
 * The partnership leads of `/api/leads` — card #294, §3 of
 * `docs/design/spec-lp-parcerias-2026-08.md`, and the columns card #295 added
 * to `campaign.inbound_leads`.
 *
 * The form that sent them lived on the site's partnership page, which became
 * the Locais portal in #990. What stays under test is the route, which still
 * accepts `B2B_PARTNER`, and the privacy policy, which still declares the
 * contacts already stored.
 *
 * Rules under test, each cited where it is proved: **BR-USUARIO-029** (the
 * contact has one purpose, two channels and a finite cycle — what is testable
 * in software is the published text and the absence of any automated sending),
 * **BR-USUARIO-028** item 1 (the field and the line in the policy are the same
 * release), **BR-B2B-007** and **BR-B2B-010** (what the page may state),
 * `DS-A11Y-002`, `DS-A11Y-003`, `DS-COPY-001`, `DS-COPY-002`.
 *
 * ---------------------------------------------------------------------------
 * Why the assertions read the stored row and not the page
 * ---------------------------------------------------------------------------
 *
 * The defect this form exists to avoid is invisible from the browser: a phone
 * that reaches the database as `(22) 99999-8888` is refused by
 * `CHECK (phone_e164 ~ '^\+[1-9]\d{1,14}$')`, comes back as a 500 and becomes a
 * lead nobody ever calls. So the double in `mock-supabase-server.mjs` enforces
 * the three CHECK constraints of the real table and keeps every row, and the
 * tests read them back over `GET /__leads`.
 *
 * Nothing here reads `page.content()`: next-intl ships the whole message file
 * in the RSC payload, so raw HTML contains every string of every page.
 */

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;
const MESSAGES_DIR = path.resolve(__dirname, "../../src/messages");

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Messages;
}

function at(messages: Messages, dotted: string): string {
  const value = dotted.split(".").reduce<string | Messages | undefined>(
    (node, part) => (typeof node === "object" && node ? node[part] : undefined),
    messages
  );
  expect(typeof value, `${dotted} is a string`).toBe("string");
  return value as string;
}

type StoredLead = Record<string, string | null>;

/** The rows the app inserted for one full_name — see the double. */
async function storedLeads(request: APIRequestContext, fullName: string): Promise<StoredLead[]> {
  const response = await request.get(`${MOCK_BASE}/__leads?full_name=${encodeURIComponent(fullName)}`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { rows: StoredLead[] }).rows;
}

/**
 * A name unique to each test: the suite runs in parallel against one double,
 * and a shared fixture name would make two tests read each other's row.
 */
function uniqueName(label: string): string {
  return `E2E ${label} ${Math.random().toString(36).slice(2, 10)}`;
}

/* -------------------------------------------------------------------------- */
/* Half 1 — E.164, before a browser is involved                               */
/* -------------------------------------------------------------------------- */

test.describe("#295 — the phone reaches the column in the only shape it accepts", () => {
  const CHECK = /^\+[1-9]\d{1,14}$/;

  test("BR-USUARIO-029: what a human types becomes E.164", () => {
    // The punctuation is not the exception, it is what everybody types.
    expect(toE164("+55 (22) 99999-8888")).toBe("+5522999998888");
    expect(toE164("+55 22 99999 8888")).toBe("+5522999998888");
    expect(toE164("0055 22 99999-8888")).toBe("+5522999998888");
    expect(toE164("  +1 555 000 0000  ")).toBe("+15550000000");
    for (const raw of ["+55 (22) 99999-8888", "0055 22 99999-8888", "+39 320 000 0000"]) {
      expect(toE164(raw)!, raw).toMatch(CHECK);
    }
  });

  test("#295: nothing the CHECK would refuse is ever built", () => {
    // A national number has no country in it, and every source of a guess is
    // wrong often enough to store a number that rings nobody. The field's hint
    // and its error both ask for the country code.
    expect(toE164("(22) 99999-8888")).toBeNull();
    expect(toE164("22999998888")).toBeNull();
    expect(toE164("")).toBeNull();
    expect(toE164("+")).toBeNull();
    expect(toE164("+55 9999")).toBeNull(); // under the floor
    expect(toE164("+5522999998888999")).toBeNull(); // over E.164's 15 digits
    expect(toE164("+0055 22 99999-8888")).toBeNull(); // no country code starts with 0
    expect(toE164("not a phone")).toBeNull();
  });

  test("#295: every business type the form offers is inside the column's domain", () => {
    // `inbound_leads_business_type_dominio` is a closed list, and a value
    // outside it is a 23514 — a 500 on the route and a lead lost. Transcribed
    // from `pg_get_constraintdef` after migration `20260812150000` (#302), the
    // same list the double in `mock-supabase-server.mjs` enforces.
    const domain = [
      "restaurant_bar",
      "hotel_inn",
      "tours_activities",
      "transfer",
      "car_rental",
      "motorhome",
      "other",
    ];
    for (const option of LEAD_BUSINESS_TYPES) {
      expect(domain, option).toContain(businessTypeCode(option));
    }
  });

  test("BR-B2B-013 / #302: motorhome is written as motorhome, and no segment borrows another's code", () => {
    // Being inside the domain was never enough: `motorhome` mapped to `other`
    // for as long as the CHECK had no code for it, and every such lead reached
    // the column as a segment nobody typed. `other` written by the map and
    // `other` chosen by the visitor are the same text, and the form keeps no
    // copy of what was selected — the row cannot be reclassified afterwards,
    // only guessed at.
    expect(businessTypeCode("motorhome")).toBe("motorhome");

    // The assertion that would have caught it the day the map was written: it
    // is injective. A segment sharing a code with another one is a declaration
    // the database can no longer give back, so a segment with no code of its
    // own is a migration to ask for — never a neighbouring bucket to borrow.
    const codes = LEAD_BUSINESS_TYPES.map((option) => businessTypeCode(option));
    expect(new Set(codes).size, codes.join(", ")).toBe(codes.length);
  });
});

/* -------------------------------------------------------------------------- */
/* Half 2 — what the route stores and what it refuses                         */
/* -------------------------------------------------------------------------- */

test.describe("BR-USUARIO-029 — the route stores the lead on the channel it was given", () => {
  test("BR-USUARIO-028 item 1: the row carries no field the policy does not declare", async ({
    request,
  }) => {
    // Criterion 27. The policy says the IP is read for the approximate city
    // and not stored, and says nothing about a user agent — so neither may
    // appear anywhere in the row, even when the request carries both.
    const fullName = uniqueName("payload");
    const response = await request.post("/api/leads", {
      headers: {
        "user-agent": "Mozilla/5.0 HeadlessChrome/140.0",
        "x-forwarded-for": "203.0.113.7",
      },
      data: {
        lead_type: "B2B_PARTNER",
        full_name: fullName,
        company: "Pousada E2E",
        business_type: "lodging",
        phone_e164: "+15550000000",
        locale: "en",
      },
    });
    expect(response.status()).toBe(201);

    const [row] = await storedLeads(request, fullName);
    const serialized = JSON.stringify(row).toLowerCase();
    expect(Object.keys(row)).not.toContain("ip");
    expect(Object.keys(row)).not.toContain("user_agent");
    expect(serialized).not.toMatch(/mozilla|chrome\/|headless/);
    expect(serialized).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    // The city comes from the host (`cityOf`), and no local request carries
    // one: absent city on both servers of the suite. What may never happen is
    // a city the visitor typed — this form does not ask for one.
    expect(row.city).toBeNull();
  });

  test("#987: the city is request.cf on the Worker and the decoded Vercel header elsewhere", () => {
    // Vercel percent-encodes the header; Cloudflare's runtime hands a plain
    // string. On the Worker the header is never read: a client can send it.
    const vercel = new Headers({ "x-vercel-ip-city": "S%C3%A3o%20Paulo" });
    expect(cityOf(vercel, null)).toBe("São Paulo");
    expect(cityOf(new Headers({ "x-vercel-ip-city": "%E0%A4%A" }), null)).toBeNull();
    expect(cityOf(new Headers(), null)).toBeNull();

    expect(cityOf(vercel, { country: "BR", city: "Búzios" })).toBe("Búzios");
    expect(cityOf(vercel, { country: "BR", city: null })).toBeNull();
  });

  test("#294: the route refuses the malformed number with a 400, never a 500", async ({
    request,
  }) => {
    // The form normalizes, and the server normalizes again — a client is not a
    // guarantee. What the route may not do is hand the CHECK a value it
    // refuses: that is a 500, and a 500 here is a lead lost.
    const response = await request.post("/api/leads", {
      data: {
        lead_type: "B2B_PARTNER",
        full_name: uniqueName("raw"),
        phone_e164: "(22) 99999-8888",
        business_type: "restaurants",
        locale: "pt",
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("invalid_phone");
  });

  test("#294: a lead with neither channel is refused before the database sees it", async ({
    request,
  }) => {
    const response = await request.post("/api/leads", {
      data: { lead_type: "B2B_PARTNER", full_name: uniqueName("empty"), locale: "pt" },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("missing_contact");
  });

  test("#294: a business type outside the column's domain is refused", async ({ request }) => {
    const response = await request.post("/api/leads", {
      data: {
        lead_type: "B2B_PARTNER",
        full_name: uniqueName("domain"),
        email: "x@example.com",
        business_type: "casino",
        locale: "pt",
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("invalid_business_type");
  });

  test("BR-B2B-013 / #302: a motorhome lead reaches the column as motorhome", async ({
    request,
  }) => {
    // The end of the path the unit assertion above only covers halfway: the
    // route accepts the wire value, the double applies the real CHECK, and the
    // stored row carries the segment the prospect declared. Against a double
    // that still knew six codes this is a 23514 — a 500 on the route and a lead
    // lost, which is what production would have answered.
    const fullName = uniqueName("motorhome");
    const response = await request.post("/api/leads", {
      data: {
        lead_type: "B2B_PARTNER",
        full_name: fullName,
        email: "dono@example.com",
        business_type: "motorhome",
        locale: "pt",
      },
    });
    expect(response.status()).toBe(201);

    const [row] = await storedLeads(request, fullName);
    expect(row, "no row reached campaign.inbound_leads").toBeTruthy();
    expect(row.business_type).toBe("motorhome");
  });
});

/* --------------------------------------------------------------------------
 * BR-USUARIO-028 item 6 — the IP denial and its scope
 * ------------------------------------------------------------------------ */

/** What the denial has to be about, one token per locale. */
const IP_SCOPE = /\bcontato\b|\bdetails\b|\bcontacto\b|\bcontatto\b/i;
const IP_DENIAL = /\b(n[ãa]o|no|not|never|nunca|non|mai|sin|senza|without)\b/i;
const IP_WORD = /\bIP\b/;

/**
 * The other admissible form of the same requirement, and the one
 * BR-USUARIO-028 item 6 actually writes down: *"não guardamos X **junto com**
 * Y"* — affirm what is kept, then deny the rest, in one clause. `s1Item5`
 * ("we store a code calculated from the IP address, and not the address") and
 * `s1Item7` ("the IP address is stored as it is, and not turned into a code")
 * are that form, and neither can be read as the site-wide promise #304 was.
 *
 * **Position is the whole point.** The bare defect — "não guardamos o endereço
 * de IP", and its passive twin "o endereço de IP não é guardado" — puts the
 * denial *first*, so requiring the storage verb before it keeps both red.
 * A noun list cannot do this job: it knew `contato` because there was one
 * collection, and the two collections of BR-USUARIO-030 and BR-USUARIO-031
 * are scoped by a count and by a record.
 */
const IP_KEPT = /\b(guarda\w*|conserv\w*|stor\w*|keep\w*|kept)\b/i;

function affirmsBeforeDenying(clause: string): boolean {
  const kept = clause.search(IP_KEPT);
  const denial = clause.search(IP_DENIAL);
  return kept >= 0 && denial >= 0 && kept < denial;
}

/**
 * #304. The sentence used to read "we do not store the IP", full stop, and it
 * was true of the lead row and false of the site: the attribution route writes
 * `ip_address` and `user_agent` into `drive.click_fingerprints`. So what this
 * asserts is not a wording — it is that the scope travels with the denial.
 */
function unscopedIpDenials(privacy: Messages): string[] {
  const unscoped: string[] = [];
  for (const [key, value] of Object.entries(privacy)) {
    // A clause ends at the punctuation that closes a thought — full stop,
    // semicolon or the colon that introduces one. Not the comma: "we store
    // that city, not the IP address" is a single clause, and splitting on
    // commas would tear the scope off the denial it qualifies.
    for (const clause of String(value).split(/[.;:]/)) {
      if (!IP_WORD.test(clause) || !IP_DENIAL.test(clause)) continue;
      if (IP_SCOPE.test(clause) || affirmsBeforeDenying(clause)) continue;
      unscoped.push(`${key}: ${clause.trim()}`);
    }
  }
  return unscoped;
}

test.describe("BR-USUARIO-028 item 1 — the field and the policy ship together", () => {
  /**
   * Positive control, because the check above grew a second way to pass and a
   * ruler that stopped catching the #304 shape would be green for the wrong
   * reason. The four sentences are the defect itself, in both voices — the
   * active one that was published and the passive one that puts a storage verb
   * in the clause *after* the denial.
   */
  test("BR-USUARIO-028 item 6: the bare IP denial is still caught, in every voice", () => {
    const defects: Messages = {
      pt: "Não guardamos o endereço de IP.",
      ptPassive: "O endereço de IP não é guardado.",
      en: "We do not store the IP address.",
      enPassive: "The IP address is not stored.",
      es: "No guardamos la dirección IP.",
      it: "Non conserviamo l'indirizzo IP.",
    };

    expect(unscopedIpDenials(defects).map((hit) => hit.split(":")[0])).toEqual(
      Object.keys(defects),
    );
  });

  for (const locale of LOCALES) {
    test(`the policy declares the business contact category in ${locale}`, async ({ page }) => {
      // Criterion 25: without this line in all four languages the phone field
      // may not go live at all. A missing key does not break the build — it
      // prints its own path, which is what the second assertion looks for.
      const messages = messagesFor(locale);
      await page.goto(`/${locale}${localizedPathname(locale, "/trust-center/privacy-policy")}`);

      const text = await page.evaluate(() => document.body.innerText);
      expect(text).toContain(at(messages, "Legal.Privacy.s1Item4").replace(/<\/?strong>/g, ""));
      expect(text).not.toContain("Legal.Privacy.");

      // Criterion 28: the way out is clickable, is the same string in the label
      // and in the href, and is not the account deletion page.
      // Two items name the address since #344: the lead way out
      // (BR-USUARIO-029 item 6) and the proposal way out (BR-USUARIO-030
      // item 7), and both read it from `s5ItemLeadEmail` — one owner for the
      // address. So the assertion is over every link that carries it, not over
      // "the" link: a second one that drifted to another mailbox is exactly
      // what #325 cost, and `.first()` would not see it.
      const address = at(messages, "Legal.Privacy.s5ItemLeadEmail");
      const links = page.getByRole("link", { name: address });
      await expect(links).toHaveCount(2);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute("href", `mailto:${address}`);
      }
      // The account route still exists, as a **separate** item: the way out of
      // a lead is not the way out of an account (BR-USUARIO-029 item 6). The
      // footer links there too, so the count is taken inside the policy.
      await expect(page.locator('article a[href*="data-deletion"]')).toHaveCount(1);
    });

    test(`BR-USUARIO-029: the policy names four contacts, fourteen days and no other figure in ${locale}`, () => {
      // Criterion 29. The four numbers of item 3 are the limit of the
      // treatment; a response deadline would be the site's third clock and is
      // not published anywhere in this delivery.
      const item = at(messagesFor(locale), "Legal.Privacy.s1Item4");
      // The two numbers of the cycle, plus the cross-reference to section 5,
      // which is where the way out is written. Criterion 29 of the spec names
      // only the first two and its own copy in §5.8 carries the third — the
      // discrepancy is registered in the comment of #294; a section number is
      // navigation, not a figure about the product.
      expect(item.match(/[0-9]+/g)).toEqual(["4", "14", "5"]);
      expect(item).not.toMatch(/útil|business day|día hábil|giorno lavorativo|24|48|72/i);
      // Item 5: the contact is never used for a recurring channel, and the
      // policy has to say so.
      expect(item.toLowerCase()).toMatch(/newsletter/);
    });

    test(`BR-USUARIO-028: no clause denies the IP without saying where, in ${locale}`, () => {
      const privacy = (messagesFor(locale)["Legal"] as Messages)["Privacy"] as Messages;
      const unscoped = unscopedIpDenials(privacy);

      expect(
        unscoped,
        "BR-USUARIO-028 item 6: a denial with no scope speaks for the whole site. " +
          "Either name the collection in the clause, or affirm what is kept about " +
          "the address before denying the rest — never the bare denial.",
      ).toEqual([]);
    });
  }
});
