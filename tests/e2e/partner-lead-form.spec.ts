import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { MOCK_SUPABASE_PORT } from "../../playwright.config";
import { localizedPathname } from "../../src/i18n/pathnames";
import { LOCALES } from "../../src/i18n/locales";
import { toE164 } from "../../src/lib/phone";
import { businessTypeCode, LEAD_BUSINESS_TYPES } from "../../src/lib/business-types";
import { measuredTextContrast } from "./support/contrast";

/**
 * The partnership lead form of `/parcerias` — card #294, §3 of
 * `docs/design/spec-lp-parcerias-2026-08.md`, and the columns card #295 added
 * to `campaign.inbound_leads`.
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

/** The form's own block, so a `role="alert"` from the framework is not read as ours. */
const FORM = '[data-block="partner-lead-form"]';

function hubUrl(locale: string): string {
  return `/${locale}${localizedPathname(locale, "/partners")}`;
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

/**
 * The consent banner is `fixed` at the bottom with `z-[100]` and the form is
 * the last block of the page, so on a first visit it sits over the submit
 * button. Declining it up front is the state of a returning visitor and keeps
 * these tests about the form; the banner itself is `partner-hero.spec.ts`.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("tuggi_cookie_consent", "false");
  });
});

async function fillCommonFields(page: Page, fullName: string) {
  await page.locator("#lead-name").fill(fullName);
  await page.locator("#lead-business").fill("Pousada E2E");
  await page.locator("#lead-business-type").selectOption("lodging");
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
    // outside it is a 23514 — a 500 on the route and a lead lost.
    const domain = [
      "restaurant_bar",
      "hotel_inn",
      "tours_activities",
      "transfer",
      "car_rental",
      "other",
    ];
    for (const option of LEAD_BUSINESS_TYPES) {
      expect(domain, option).toContain(businessTypeCode(option));
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Half 2 — the two paths that have to store a row                            */
/* -------------------------------------------------------------------------- */

test.describe("BR-USUARIO-029 — the lead is stored on the channel the prospect chose", () => {
  test("the WhatsApp-only path stores a row, with the number normalized before the POST", async ({
    page,
    request,
  }) => {
    // #295 relaxed `email NOT NULL` for exactly this path: the owner of a
    // restaurant answers WhatsApp and does not open commercial email.
    const fullName = uniqueName("whatsapp");
    await page.goto(hubUrl("pt"));
    await fillCommonFields(page, fullName);
    // Typed the way a human types it — parentheses, space and dash, all of
    // which the column refuses.
    await page.locator("#lead-contact").fill("+55 (22) 99999-8888");
    await page.locator("#lead-consent").check();
    await page.getByRole("button", { name: at(messagesFor("pt"), "Segments.cta.action") }).click();

    await expect(page.getByText(at(messagesFor("pt"), "Partners.form.successTitle"))).toBeVisible();

    const [row] = await storedLeads(request, fullName);
    expect(row, "no row reached campaign.inbound_leads").toBeTruthy();
    expect(row.phone_e164).toBe("+5522999998888");
    expect(row.email).toBeNull();
    expect(row.lead_type).toBe("B2B_PARTNER");
    expect(row.business_type).toBe("hotel_inn");
    expect(row.locale).toBe("pt");
  });

  test("the email-only path stores a row, and freemail goes through", async ({ page, request }) => {
    // Criterion 16 of spec §9: `ContactRouter` rejects gmail and this funnel
    // may not — the owner of a restaurant uses gmail.
    const fullName = uniqueName("email");
    await page.goto(hubUrl("pt"));
    await fillCommonFields(page, fullName);
    await page.getByRole("radio").nth(1).check();
    await page.locator("#lead-contact").fill("dono@gmail.com");
    await page.locator("#lead-consent").check();
    await page.getByRole("button", { name: at(messagesFor("pt"), "Segments.cta.action") }).click();

    await expect(page.getByText(at(messagesFor("pt"), "Partners.form.successTitle"))).toBeVisible();
    // Scoped to the block: Next's own route announcer is a `role="alert"` too,
    // and it is not this form's.
    await expect(page.locator(`${FORM} [role="alert"]`)).toHaveCount(0);

    const [row] = await storedLeads(request, fullName);
    expect(row.email).toBe("dono@gmail.com");
    expect(row.phone_e164).toBeNull();
  });

  test("BR-USUARIO-028 item 1: the row carries no field the policy does not declare", async ({
    page,
    request,
  }) => {
    // Criterion 27. The policy says the IP is read for the approximate city
    // and not stored, and says nothing about a user agent — so neither may
    // appear anywhere in the row.
    const fullName = uniqueName("payload");
    await page.goto(hubUrl("en"));
    await fillCommonFields(page, fullName);
    await page.locator("#lead-contact").fill("+1 555 000 0000");
    await page.locator("#lead-consent").check();
    await page.getByRole("button", { name: at(messagesFor("en"), "Segments.cta.action") }).click();
    await expect(page.getByText(at(messagesFor("en"), "Partners.form.successTitle"))).toBeVisible();

    const [row] = await storedLeads(request, fullName);
    const serialized = JSON.stringify(row).toLowerCase();
    expect(Object.keys(row)).not.toContain("ip");
    expect(Object.keys(row)).not.toContain("user_agent");
    expect(serialized).not.toMatch(/mozilla|chrome\/|headless/);
    expect(serialized).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    // The city is resolved from `x-vercel-ip-city`, which no local request
    // carries: absent header, absent city. What may never happen is a city
    // the visitor typed — this form does not ask for one.
    expect(row.city).toBeNull();
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
});

/* -------------------------------------------------------------------------- */
/* Half 3 — what the form does before it sends anything                       */
/* -------------------------------------------------------------------------- */

test.describe("spec §3 — validation, consent and focus", () => {
  test("BR-USUARIO-029: an unticked consent box blocks the send, and nothing is stored", async ({
    page,
    request,
  }) => {
    // LGPD art. 8 and Planet49 (CJEU, C-673/17): the box is never pre-ticked,
    // and consent is what authorizes the contact the whole page is asking for.
    const fullName = uniqueName("consent");
    const messages = messagesFor("pt");
    await page.goto(hubUrl("pt"));

    await expect(page.locator("#lead-consent")).not.toBeChecked();

    await fillCommonFields(page, fullName);
    await page.locator("#lead-contact").fill("+55 22 99999-8888");

    const submit = page.getByRole("button", { name: at(messages, "Segments.cta.action") });
    // Criterion 13: the button is never disabled — the click is what validates.
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.locator(`${FORM} [role="alert"]`)).toContainText(
      at(messages, "Partners.form.errorSummary")
    );
    await expect(page.getByText(at(messages, "Partners.form.errorConsent"))).toBeVisible();
    await expect(page.locator("#lead-consent")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#lead-consent")).toBeFocused();

    expect(await storedLeads(request, fullName)).toEqual([]);
  });

  test("DS-COPY-002: an empty send names every field and puts focus on the first", async ({
    page,
  }) => {
    const messages = messagesFor("pt");
    await page.goto(hubUrl("pt"));
    await page.getByRole("button", { name: at(messages, "Segments.cta.action") }).click();

    for (const key of ["errorName", "errorBusiness", "errorBusinessType", "errorWhatsapp"]) {
      await expect(page.getByText(at(messages, `Partners.form.${key}`))).toBeVisible();
    }
    await expect(page.locator("#lead-name")).toBeFocused();
    await expect(page.locator("#lead-name")).toHaveAttribute("aria-invalid", "true");
    // The message is reachable from the field, in text — colour is never the
    // only channel (DS-A11Y-003, SC 1.4.1).
    const describedBy = await page.locator("#lead-name").getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toBeVisible();
  });

  test("spec §3.7: the contrast of the error text and of the field border is the measured one", async ({
    page,
  }) => {
    await page.goto(hubUrl("pt"));
    await page.getByRole("button", { name: at(messagesFor("pt"), "Segments.cta.action") }).click();

    const describedBy = await page.locator("#lead-name").getAttribute("aria-describedby");
    // SC 1.4.3 asks 4.5:1 of the message; `text-red-500`, which ContactRouter
    // uses, measures 3.76:1 and is the reason this is asserted.
    expect(await measuredTextContrast(page, `#${describedBy}`)).toBeGreaterThanOrEqual(4.5);

    // SC 1.4.11 asks 3:1 of the border, and here the border is the only thing
    // that identifies the control: `bg-slate-50` inside a white card is 1.03:1.
    const borders = await page
      .locator("#lead-business, #lead-business-type")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).borderTopColor));
    for (const border of borders) {
      const ratio = await page.evaluate((color) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        const paint = (value: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 1, 1);
          ctx.fillStyle = value;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const luminance = ([r, g, b]: number[]) => {
          const channel = (value: number) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
        };
        const [a, b] = [luminance(paint(color)), luminance(paint("#ffffff"))].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      }, border);
      expect(ratio, `border ${border}`).toBeGreaterThanOrEqual(3);
    }
  });

  test("spec §3.4: switching channel keeps what was typed in the other one", async ({ page }) => {
    await page.goto(hubUrl("pt"));
    const contact = page.locator("#lead-contact");
    const [whatsappRadio, emailRadio] = [
      page.getByRole("radio").nth(0),
      page.getByRole("radio").nth(1),
    ];

    await contact.fill("+55 22 99999-8888");
    await emailRadio.check();
    await expect(page.locator("#lead-contact")).toHaveValue("");
    await page.locator("#lead-contact").fill("dono@gmail.com");
    await whatsappRadio.check();
    await expect(page.locator("#lead-contact")).toHaveValue("+55 22 99999-8888");
    // SC 1.3.5: the field declares its purpose, and it is one or the other.
    await expect(page.locator("#lead-contact")).toHaveAttribute("autocomplete", "tel");
    await emailRadio.check();
    await expect(page.locator("#lead-contact")).toHaveValue("dono@gmail.com");
    await expect(page.locator("#lead-contact")).toHaveAttribute("autocomplete", "email");
  });

  test("spec §6.3: clicking a card jumps to the form with the type already chosen", async ({
    page,
  }) => {
    await page.goto(hubUrl("pt"));
    await page.locator('[data-business-type="restaurants"]').click();
    await expect(page.locator("#lead-business-type")).toHaveValue("restaurants");
  });

  test("spec §3.9: every control is at least 16 px and 48 px tall", async ({ page }) => {
    // Criterion 20, measured and not read off the Tailwind class: below 16 px
    // Safari on iOS zooms on focus and throws the page out of alignment.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(hubUrl("it"));

    const controls = await page
      .locator("#lead-name, #lead-business, #lead-business-type, #lead-contact")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: node.id,
          fontSize: parseFloat(getComputedStyle(node).fontSize),
          height: node.getBoundingClientRect().height,
        }))
      );

    expect(controls).toHaveLength(4);
    for (const control of controls) {
      expect(control.fontSize, `${control.id} font-size`).toBeGreaterThanOrEqual(16);
      expect(control.height, `${control.id} height`).toBeGreaterThanOrEqual(48);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Half 4 — the form the server serves, and the policy that goes with it      */
/* -------------------------------------------------------------------------- */

test.describe("#191 — the form with no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the five labels are in the served HTML and the way out is the email", async ({ page }) => {
    // Criterion 18: the form exists, is legible and focusable, and says how to
    // reach us when it cannot send.
    await page.goto(hubUrl("pt"));
    const messages = messagesFor("pt");

    for (const key of ["name", "business", "businessType", "whatsappLabel", "allRequired"]) {
      await expect(
        page.getByText(at(messages, `Partners.form.${key}`), { exact: true }).first()
      ).toBeVisible();
    }
    await expect(page.locator("#lead-consent")).not.toBeChecked();
    // `<noscript>` is not visible text to Playwright's innerText, so it is read
    // as markup — the one place in this suite where that is the honest read.
    const noscript = await page.locator("noscript").allTextContents();
    expect(noscript.join("\n")).toContain(at(messages, "Contact.Sidebar.pressValue"));
  });
});

test.describe("BR-USUARIO-028 item 1 — the field and the policy ship together", () => {
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
      const address = at(messages, "Legal.Privacy.s5ItemLeadEmail");
      const link = page.getByRole("link", { name: address });
      await expect(link).toHaveAttribute("href", `mailto:${address}`);
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

    test(`BR-USUARIO-029: no Partners.* string promises a deadline in ${locale}`, () => {
      // Criterion 24 and §7 of the spec: no response deadline, and no
      // accessibility conformance claim without a subject.
      const form = (messagesFor(locale)["Partners"] as Messages)["form"] as Messages;
      const consent = (messagesFor(locale)["Partners"] as Messages)["cta"] as Messages;
      for (const [key, value] of [...Object.entries(form), ...Object.entries(consent)]) {
        expect(String(value), key).not.toMatch(/WCAG|24 horas|48 horas|24h|48h/i);
      }
    });
  }
});
