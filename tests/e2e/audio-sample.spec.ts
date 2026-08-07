import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";

/**
 * Card #193, component 4.1 — the global audio player, spec §1 of
 * docs/design/spec-repaginacao-site-2026-08.md.
 *
 * The site had three players (`HomeAudioSample`, `DriveSamples`,
 * `RouteStopAudio`), each with a different subset of the same decisions
 * (CLAUDE.md §6, DRY). What this file measures is the §1.10 list, plus the
 * three obligations §6.3 of docs/design/acessibilidade-auditoria-2026-08.md
 * derived from the defects it found in all three.
 *
 * **The transcript is asserted in the state the site is actually in.** Finding
 * 6 of the audit (SC 1.2.1, level A) is missing *content*, not missing markup:
 * no clip on this site has a transcript, and the audit itself says the absence
 * of content is not detectable by a rule. So the assertion is that a sample
 * with `transcript: null` renders **no** disclosure and **no** empty region —
 * a "read the transcript" button over nothing answers the criterion with
 * nothing while looking like it answered — and that the markup for the case
 * where one exists is the one SC 1.2.1 needs: served, then hidden, never
 * mounted on open.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "src");
const CARD = path.join(SRC, "components/blocks/AudioSampleCard.tsx");
const LOCALES = ["pt", "en", "es", "it"] as const;

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return full.endsWith(".tsx") || full.endsWith(".ts") ? [full] : [];
  });
}

/** Source with comments removed — this component explains its own rules in prose. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function messagesFor(locale: string): Record<string, string> {
  const file = path.join(SRC, "messages", `${locale}.json`);
  const all = JSON.parse(fs.readFileSync(file, "utf8")) as {
    AudioSample: Record<string, string>;
  };
  return all.AudioSample;
}

test.describe("spec §1.10 item 1 — one player, and nothing plays audio outside it", () => {
  test("CLAUDE.md §6: <audio> exists in exactly one file", () => {
    const owners = tsxFiles(SRC)
      .filter((file) => /<audio\b/.test(stripComments(fs.readFileSync(file, "utf8"))))
      .map((file) => path.relative(SRC, file));

    expect(owners).toEqual(["components/blocks/AudioSampleCard.tsx"]);
  });

  test("CLAUDE.md §6: the sample paths are written down once", () => {
    const owners = tsxFiles(SRC)
      .filter((file) => /\/audio\/sample\d/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));

    expect(owners).toEqual(["lib/audio-samples.ts"]);
  });

  test("CLAUDE.md §6: no message file keeps a key the old players owned", () => {
    for (const locale of LOCALES) {
      const all = JSON.parse(
        fs.readFileSync(path.join(SRC, "messages", `${locale}.json`), "utf8"),
      ) as Record<string, Record<string, Record<string, unknown>>>;

      for (const dead of ["sample1Title", "sample1Loc", "play", "pause"]) {
        expect(all.Home.AudioSample[dead], `${locale}: Home.AudioSample.${dead}`).toBeUndefined();
        expect(all.Drive.Samples[dead], `${locale}: Drive.Samples.${dead}`).toBeUndefined();
      }
      for (const dead of ["audioPause", "audioPreviewFor", "audioSeek"]) {
        expect(all.Tours[dead], `${locale}: Tours.${dead}`).toBeUndefined();
      }
    }
  });
});

test.describe("SC 1.2.1 — the textual alternative, in the state the site is in", () => {
  test("audit finding 6: no clip claims a transcript it does not have", () => {
    const catalogue = fs.readFileSync(path.join(SRC, "lib/audio-samples.ts"), "utf8");
    // Three files, three explicit nulls. `undefined` would let a call site
    // forget instead of decide, which is why the field is not optional.
    expect(catalogue.match(/transcript: null/g)?.length).toBe(3);
  });

  for (const locale of LOCALES) {
    test(`SC 1.2.1: /${locale} offers no disclosure over an empty transcript`, async ({ page }) => {
      const messages = messagesFor(locale);
      await page.goto(`/${locale}`);

      const section = page.locator("section").filter({ has: page.locator("audio") });
      await expect(section.locator("audio")).toHaveCount(3);
      await expect(section.getByRole("button", { name: messages.transcriptShow })).toHaveCount(0);
      // Nor an empty region left behind by the button that is not there.
      await expect(section.locator("[aria-expanded]")).toHaveCount(0);
    });
  }

  /**
   * The markup the day a transcript exists. An alternative that arrives only
   * after hydration is not an alternative (SC 1.2.1) and is invisible to a
   * crawler, so the panel is served and then hidden — never mounted on open.
   */
  test("spec §1.4: the transcript is served and hidden, not mounted on open", () => {
    const code = stripComments(fs.readFileSync(CARD, "utf8"));
    expect(code).toContain("hidden={!openTranscript}");
    expect(code).toContain("aria-expanded={openTranscript}");
    expect(code).toContain("aria-controls={transcriptId}");
    // The panel is not behind the open state: `openTranscript &&` before the
    // region would be exactly the defect this test names.
    expect(code).not.toMatch(/openTranscript\s*&&\s*\(?\s*</);
  });
});

test.describe("spec §1.10 item 4 / SC 1.4.2 — one clip at a time, and never on its own", () => {
  test("nothing plays on load, on hover or on entering the viewport", async ({ page }) => {
    await page.goto("/pt");
    const code = stripComments(fs.readFileSync(CARD, "utf8"));
    expect(code).not.toContain("autoPlay");
    expect(code).not.toContain("onMouseEnter");

    await page.locator("audio").first().waitFor({ state: "attached" });
    const anyPlaying = await page.evaluate(() =>
      [...document.querySelectorAll("audio")].some((el) => !el.paused),
    );
    expect(anyPlaying).toBe(false);
  });

  test("starting the second card pauses the first", async ({ page }) => {
    await page.goto("/pt");

    // Located by card, not by label: the label is the *action*, so the first
    // button stops matching "play" the moment it starts playing — which is the
    // point of SC 4.1.2 and would make a label locator lose the second card.
    const cards = page.locator("section article").filter({ has: page.locator("audio") });
    await expect(cards).toHaveCount(3);

    // Focus + Enter, not click: the cookie banner sits over the fold this
    // section lands on, and Playwright refuses to click through it. The key
    // press is a real user activation, which is what the browser's autoplay
    // policy requires — a dispatched event would not be.
    await cards.nth(0).getByRole("button").first().focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.evaluate(() => !document.querySelectorAll("audio")[0].paused), {
        timeout: 10_000,
      })
      .toBe(true);

    await cards.nth(1).getByRole("button").first().focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.evaluate(() => document.querySelectorAll("audio")[0].paused), {
        timeout: 10_000,
      })
      .toBe(true);
  });
});

test.describe("SC 2.1.1 and 4.1.2 — operable, and it says what it is", () => {
  test("the play button is reachable by keyboard and toggles on Enter", async ({ page }) => {
    const messages = messagesFor("pt");
    await page.goto("/pt");

    const play = page.getByRole("button", { name: new RegExp(`^${messages.play.split("{")[0]}`) });
    await play.first().focus();
    await expect(play.first()).toBeFocused();

    await page.keyboard.press("Enter");
    // The label names the action, and it is the action that changed.
    await expect(
      page.getByRole("button", { name: new RegExp(`^${messages.pause.split("{")[0]}`) }),
    ).toHaveCount(1);
  });

  test("the seek bar is a native range with a value a screen reader can read", async ({ page }) => {
    await page.goto("/pt");
    const seek = page.locator('input[type="range"]').first();
    await expect(seek).toHaveAttribute("aria-label", /.+/);
    await expect(seek).toHaveAttribute("aria-valuetext", /^\d+:\d\d$/);
  });

  test("DS-A11Y-002: the play button measures at least 44 px on both sides", async ({ page }) => {
    const messages = messagesFor("pt");
    await page.goto("/pt");
    const box = (await page
      .getByRole("button", { name: new RegExp(`^${messages.play.split("{")[0]}`) })
      .first()
      .boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  /**
   * SC 1.4.11, and the reason the audit named it: the glyph is the only thing
   * that says what the control does. `bg-tuggi-primary text-tuggi-dark` is
   * 6.92:1 — inherited from RouteStopAudio, which was the only one of the three
   * that had it right, and the pair DS-COR-004 requires of any filled brand
   * surface. White on cyan is 2.70:1 and fails.
   */
  test("DS-COR-004 / SC 1.4.11: the button carries dark ink on brand cyan", () => {
    const code = stripComments(fs.readFileSync(CARD, "utf8"));
    expect(code).toContain("bg-tuggi-primary text-tuggi-dark");
    expect(code).not.toMatch(/bg-tuggi-primary[^"`]*text-white/);
    // The seek accent is the darker token: brand cyan on the track is 2.70:1.
    expect(code).toContain("accent-tuggi-primary-text");
  });
});

test.describe("spec §1.2 and §1.6 — the anatomy survives the longest language", () => {
  test("the duration comes from the file, not from a translated string", async ({ page }) => {
    await page.goto("/pt");
    // preload="metadata" is what makes the idle card able to say how long the
    // clip is; a translated "1:24" would be a figure written by hand.
    await expect
      .poll(async () => (await page.locator("section article p.text-sm").first().innerText()).trim(), {
        timeout: 10_000,
      })
      .toMatch(/\d+:\d\d/);

    const messages = LOCALES.map((locale) => JSON.stringify(messagesFor(locale)));
    for (const dump of messages) expect(dump).not.toMatch(/\d+:\d\d/);
  });

  test("DS-A11Y-005: at 360 px in Italian nothing is cut without an ellipsis", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/it${localizedPathname("it", "/drive")}`);

    const cards = page.locator("section article").filter({ has: page.locator("audio") });
    await expect(cards).toHaveCount(3);

    for (let index = 0; index < 3; index += 1) {
      const name = cards.nth(index).locator("p.font-bold").first();
      // line-clamp-2, never `truncate`: two lines, and the ellipsis is the
      // browser's. A one-line clamp is what cut "Complesso Monumentale della
      // Pilotta" in the middle of a word.
      await expect(name).toHaveCSS("-webkit-line-clamp", "2");
      const box = (await cards.nth(index).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
    }
  });
});

/**
 * Card #211 — the card's width comes from its grid column, not from the window.
 *
 * The test above is the whole reason the defect shipped: it measures 360 px,
 * which was the one width where the anatomy was right, and it went green while
 * the name of the place had 75 px of column at 1440 px and none at 1024 px.
 * Widths are what this block is measured at now — the four the card names, in
 * the four languages, on both surfaces that build the grid.
 *
 * The three assertions are the card's criteria, and they are about the one
 * piece of content that says what the visitor is about to hear.
 */
const CARD_SURFACES = [360, 768, 1024, 1440] as const;

test.describe("spec §1.6 and card #211 — the name owns the card at every width", () => {
  for (const width of CARD_SURFACES) {
    test(`DS-A11Y-005: at ${width} px the place name is legible in all four languages`, async ({
      page,
    }) => {
      // Eight navigations, each waiting on the clip's metadata: the default
      // 30 s is not the budget for this one.
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });

      for (const locale of LOCALES) {
        for (const surface of ["home", "drive"] as const) {
          const pathname = surface === "home" ? "" : localizedPathname(locale, "/drive");
          const where = `${locale} ${surface} @${width}`;
          await page.goto(`/${locale}${pathname}`);

          const cards = page.locator("section article").filter({ has: page.locator("audio") });
          // An empty locator is the failure this assertion has to survive
          // first: three cards on both surfaces since #194 mounted the third
          // one on the home (spec §6.5).
          await expect(cards, where).toHaveCount(3);

          // The duration only joins the metadata line once the file's header
          // is in, and it is the part that makes the line long. Measuring
          // before it lands measures a string the visitor never sees.
          const metadata = page.locator("section article p.line-clamp-2 + p");
          await expect
            .poll(async () => (await metadata.allInnerTexts()).every((text) => /\d+:\d\d/.test(text)), {
              timeout: 15_000,
              message: where,
            })
            .toBe(true);

          const measured = await cards.evaluateAll((nodes) =>
            nodes.map((card) => {
              const style = getComputedStyle(card);
              const contentWidth =
                card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
              const name = card.querySelector("p.line-clamp-2")!;
              const meta = name.nextElementSibling!;
              const nameWidth = name.getBoundingClientRect().width;
              return {
                name: name.textContent ?? "",
                // The clamp cuts silently: the only way to see it is that the
                // laid-out text is taller than the box that shows it.
                clipped: name.scrollHeight > name.clientHeight + 0.5,
                share: Math.round((nameWidth / contentWidth) * 100),
                metaLines: Math.round(
                  meta.getBoundingClientRect().height /
                    parseFloat(getComputedStyle(meta).lineHeight),
                ),
              };
            }),
          );

          for (const card of measured) {
            expect(card.clipped, `${where}: "${card.name}" is truncated`).toBe(false);
            expect(card.share, `${where}: "${card.name}" holds ${card.share}% of the card`).toBeGreaterThanOrEqual(55);
            expect(card.metaLines, `${where}: metadata of "${card.name}"`).toBeLessThanOrEqual(2);
          }
        }
      }
    });
  }

  /**
   * DS-LAYOUT-002. Both blocks that carry the grid used to declare a width of
   * their own — `max-w-3xl` on the home, `max-w-7xl px-4 sm:px-6 lg:px-8` on
   * /drive, the second one being the rail copied out by hand. Measured against
   * the header, because the header is the element always on screen and the rule
   * is about lining up with it, not about a class name.
   */
  test("DS-LAYOUT-002: the sample blocks sit on the same rail as the header", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const pathname of ["", localizedPathname("pt", "/drive")]) {
      await page.goto(`/pt${pathname}`);
      const rail = (await page.locator("header nav").first().boundingBox())!;
      const block = (await page
        .locator("section")
        .filter({ has: page.locator("article audio") })
        .locator("> div")
        .first()
        .boundingBox())!;

      expect(Math.abs(block.x - rail.x), `/pt${pathname}: left edge`).toBeLessThan(2);
      expect(Math.abs(block.width - rail.width), `/pt${pathname}: width`).toBeLessThan(2);
    }
  });
});

test.describe("spec §1.8 — the three events, or nothing about audio is decidable", () => {
  test("the player emits play, complete and transcript", () => {
    const code = stripComments(fs.readFileSync(CARD, "utf8"));
    for (const event of ["play_audio_sample", "audio_sample_complete", "open_transcript"]) {
      expect(code, `AudioSampleCard.tsx does not emit ${event}`).toContain(event);
    }
  });
});

/**
 * Card #194 — spec §6.5, the order of the samples, and what a chip may claim.
 *
 * Two separate promises live here because one is about which clip is served
 * and the other is about what the card says the clip is.
 */
test.describe("spec §6.5 — the published order, and the file behind each name", () => {
  /**
   * The order the card asked for: Avenida Paulista and Ponte di Rialto before
   * Walt Disney World Resort.
   *
   * The ids stay where they were, and asserting them is the point: §6.5 asked
   * for the swap as a rename of key and file, and the delivery moved the array
   * instead — the `id` is the GA event value and the `sampleN-dir.mp3` beside
   * each `-desc` is the only file whose provenance is established. So the pair
   * (position, file) is what this asserts, and a rename would be as red as a
   * wrong order.
   */
  const PUBLISHED = ["sample2", "sample3", "sample1"] as const;

  for (const locale of LOCALES) {
    test(`spec §6.5: /${locale} plays Paulista, then Rialto, then Disney`, async ({ page }) => {
      const messages = messagesFor(locale);
      await page.goto(`/${locale}`);

      const cards = page.locator("section article").filter({ has: page.locator("audio") });
      await expect(cards).toHaveCount(3);

      expect(await cards.locator("p.line-clamp-2").allInnerTexts()).toEqual(
        PUBLISHED.map((id) => messages[`${id}Name`]),
      );
      expect(
        await cards.locator("audio").evaluateAll((nodes) =>
          nodes.map((el) => new URL((el as HTMLAudioElement).src).pathname),
        ),
      ).toEqual(PUBLISHED.map((id) => `/audio/${id}-desc.mp3`));
    });
  }
});

/**
 * Spec §1.2 — the chips, and the reading of them this card did *not* settle.
 *
 * The pair is the spec's, reused literally: `Direcional` and `História`, both
 * from i18n. It reads like a defect on a card that plays `sampleN-desc.mp3`
 * behind a button saying "Tocar a história de X", while `sampleN-dir.mp3` is
 * requested by no page of this site — the chaining that used to play it left
 * with the global player (#193). That observation was reported on #194 and left
 * to its owners: the copy is the `design`'s, and what those files are is #213,
 * open with the operator.
 *
 * Which is why the shape is asserted rather than described. Someone reading the
 * paragraph above will be tempted to delete the chip, or the files, on the way
 * past — both turn this red, and red is the conversation.
 */
test.describe("spec §1.2 — the chips are the spec's pair, and they come from i18n", () => {
  test("the home labels the story, and /drive draws both halves", async ({ page }) => {
    for (const locale of LOCALES) {
      const messages = messagesFor(locale);
      const expected: Record<string, Set<string>> = {
        "": new Set([messages.tagStory]),
        [localizedPathname(locale, "/drive")]: new Set([
          messages.tagDirectional,
          messages.tagStory,
        ]),
      };

      for (const [pathname, labels] of Object.entries(expected)) {
        await page.goto(`/${locale}${pathname}`);
        const where = `/${locale}${pathname}`;
        const chips = page
          .locator("section article")
          .filter({ has: page.locator("audio") })
          .locator("ul li");

        const rendered = await chips.allInnerTexts();
        // An empty locator is the failure this has to survive first: a chip
        // list that stopped rendering satisfies any assertion about what it
        // does *not* say.
        expect(rendered.length, where).toBeGreaterThan(0);
        expect(new Set(rendered.map((label) => label.trim())), where).toEqual(labels);
      }
    }
  });

  test("the directional clips stay on disk", () => {
    for (const id of ["sample1", "sample2", "sample3"]) {
      expect(
        fs.existsSync(path.join(REPO_ROOT, "public/audio", `${id}-dir.mp3`)),
        `public/audio/${id}-dir.mp3`,
      ).toBe(true);
    }
  });
});
