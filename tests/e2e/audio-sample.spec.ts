import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { AUDIO_SAMPLE_FILES } from "../../src/lib/audio-samples";

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

test.describe("spec §6.5 — the published order, and the file behind each name", () => {
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
 * Spec §1.2 — the chips, and what each one is now allowed to claim.
 *
 * The pair is the spec's, reused literally: `Direcional` and `História`, both
 * from i18n. For two cards it read like a defect, because unifying the players
 * (#193) dropped the chaining and left "Direcional" over a card that played
 * only `sampleN-desc.mp3` — reported on #194, and the reason #213 found the
 * three cue files referenced by no line of `src/`. The operator's answer was to
 * put the cue back on the air, so the chip describes what the card plays again
 * and the block below asserts exactly that: a page draws the chip of a half it
 * plays, and no other.
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

/** What a card records about itself while it plays. */
type Played = { sources: string[]; chips: string[] };

/**
 * Watches one card from the browser, instead of polling it from here.
 *
 * The cue is barely over a second long: a poll can step over the whole clip
 * and see only the story, which is also what a card that never chained looks
 * like. `timeupdate` only fires while a source is *running*, so the list it
 * builds is the sources that actually played, in order — and the observer on
 * `aria-current` catches a chip that is marked and unmarked between two
 * polls (DS-A11Y-003).
 */
async function watchCard(page: Page, index: number) {
  await page.evaluate((cardIndex) => {
    const cards = [...document.querySelectorAll("section article")].filter((card) =>
      card.querySelector("audio"),
    );
    const card = cards[cardIndex];
    const el = card.querySelector("audio") as HTMLAudioElement;
    const played: Played = { sources: [], chips: [] };
    (window as unknown as { __played: Played }).__played = played;

    const pushSource = () => {
      const source = new URL(el.currentSrc || el.src, location.href).pathname;
      if (played.sources[played.sources.length - 1] !== source) played.sources.push(source);
    };
    el.addEventListener("timeupdate", pushSource);

    const chips = card.querySelector("ul");
    if (chips) {
      const observer = new MutationObserver(() => {
        const label = chips.querySelector("[aria-current]")?.textContent?.trim();
        if (label && played.chips[played.chips.length - 1] !== label) played.chips.push(label);
      });
      observer.observe(chips, {
        attributes: true,
        subtree: true,
        attributeFilter: ["aria-current"],
      });
    }
  }, index);
}

const readPlayed = (page: Page) =>
  page.evaluate(() => (window as unknown as { __played: Played }).__played);

/** Focus + Enter, never click: the reason is in the note on SC 1.4.2 above. */
async function press(page: Page, index: number) {
  const cards = page.locator("section article").filter({ has: page.locator("audio") });
  await cards.nth(index).getByRole("button").first().focus();
  await page.keyboard.press("Enter");
}

/**
 * Card #213 — the pair is played again, and this block is what keeps it that
 * way.
 *
 * The regression it answers had no error and no red test: unifying the players
 * (e5a8c16) gave the model a single `src`, the chaining `DriveSamples` did with
 * two elements (`onEnded={handleDirEnded}`) had nowhere to live, and the three
 * `sampleN-dir.mp3` quietly stopped being requested by anything. Nobody noticed
 * until the operator did — *"tudo tocava, por que parou de tocar?"*. A
 * behaviour with no test is a behaviour that leaves without a sound, so what is
 * asserted here is the behaviour itself: the second source enters playback on
 * its own, after the first, from one press of the visitor.
 *
 * The three helpers above were declared inside this block until #224 needed
 * them too — one watcher, one press, both used by the block that measures the
 * happy path and by the one that measures the refused path (CLAUDE.md §6).
 */
test.describe("#213 — the cue plays, and the story follows it", () => {
  test("the second source enters playback on its own, after the first", async ({ page }) => {
    // A press, a clip of ~1.2 s, and the swap that follows it: the default
    // 30 s covers it, but not on a cold static asset.
    test.setTimeout(90_000);
    await page.goto(`/pt${localizedPathname("pt", "/drive")}`);

    const cards = page.locator("section article").filter({ has: page.locator("audio") });
    await expect(cards).toHaveCount(3);
    await watchCard(page, 0);
    await press(page, 0);

    // Two sources, in this order, both having actually produced playback —
    // and the second one started by nothing but the end of the first.
    await expect
      .poll(async () => (await readPlayed(page)).sources, { timeout: 30_000 })
      .toEqual([`/audio/${PUBLISHED[0]}-dir.mp3`, `/audio/${PUBLISHED[0]}-desc.mp3`]);

    expect(
      await page.evaluate(() => {
        const el = [...document.querySelectorAll("audio")][0] as HTMLAudioElement;
        return { paused: el.paused, playing: el.currentTime > 0 };
      }),
    ).toEqual({ paused: false, playing: true });
  });

  test("DS-A11Y-003: the chip of the half that is playing is the one marked", async ({ page }) => {
    test.setTimeout(90_000);
    const messages = messagesFor("pt");
    await page.goto(`/pt${localizedPathname("pt", "/drive")}`);

    const cards = page.locator("section article").filter({ has: page.locator("audio") });
    await expect(cards).toHaveCount(3);
    // At rest nothing is marked: `aria-current` says what is playing, and a
    // card that is not playing has no current half to point at.
    await expect(cards.first().locator("li[aria-current]")).toHaveCount(0);

    await watchCard(page, 0);
    await press(page, 0);

    // The state that used to be carried by a colour and nothing else (audit
    // finding 16) now moves in the accessibility tree, in the order the clips
    // play.
    await expect
      .poll(async () => (await readPlayed(page)).chips, { timeout: 30_000 })
      .toEqual([messages.tagDirectional, messages.tagStory]);

    // ...and it is said in words, for whoever is not looking at the chips.
    await expect(cards.first().locator('[role="status"]')).toHaveText(messages.tagStory);
  });

  test("the idle card carries the story, so the length on its face is the story's", async ({
    page,
  }) => {
    await page.goto(`/pt${localizedPathname("pt", "/drive")}`);
    const cards = page.locator("section article").filter({ has: page.locator("audio") });

    // What a crawler and a visitor with no JavaScript get, and what the
    // metadata line is measuring: the narration, never the one-second cue in
    // front of it.
    expect(
      await cards.locator("audio").evaluateAll((nodes) =>
        nodes.map((el) => new URL((el as HTMLAudioElement).src).pathname),
      ),
    ).toEqual(PUBLISHED.map((id) => `/audio/${id}-desc.mp3`));

    await expect
      .poll(
        async () =>
          (await cards.locator("p.line-clamp-2 + p").allInnerTexts()).every((text) =>
            /\d+:\d\d/.test(text),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);
  });

  test("CLAUDE.md §6: the sequence is in the model, and both halves are in it", () => {
    const catalogue = fs.readFileSync(path.join(SRC, "lib/audio-samples.ts"), "utf8");
    for (const id of PUBLISHED) {
      // The regression was exactly this: a model with room for one source per
      // sample, and a file that no line of `src/` named any more.
      expect(catalogue, `${id}: the directional cue`).toContain(`/audio/${id}-dir.mp3`);
      expect(catalogue, `${id}: the story`).toContain(`/audio/${id}-desc.mp3`);
    }
    // One element, still: a sequence is a list of sources, not a second player
    // (spec §1.10 item 1, asserted over the whole of `src/` above).
    const code = fs.readFileSync(CARD, "utf8");
    expect(code.match(/<audio\b/g)?.length).toBe(1);
  });
});

/**
 * Card #224 — what a refused continuation is allowed to cost.
 *
 * The sequence has one call that is not made from inside a gesture, and every
 * autoplay policy in the three documents the component cites reserves the right
 * to refuse it. `bb7ac14` shipped the refusal path anyway — and, on the way
 * back from it, read `ended || currentTime === 0` off an element that `load()`
 * had just reset. A story that was refused permission to play and a story that
 * has already finished are the same three attributes, so the card rewound to
 * the cue: press, cue, refusal, press, cue, refusal — the narration
 * unreachable, on the page whose job is to prove how the product sounds.
 *
 * There was no red test because there was no test of the refusal at all: the
 * block above measures the path where the policy says yes. This one is the
 * other half, and the criterion it holds the component to is behavioural, not
 * structural — **the story always plays**. The cue is the bonus; whatever any
 * browser decides about the continuation, a press has to reach the narration
 * and none may go backwards.
 */
test.describe("#224 — a refused continuation never costs the narration", () => {
  /**
   * Refuses every `play()` that is not made from inside a gesture handler —
   * the strictest reading of the policies, and the one WebKit tells sites to
   * assume ("websites should assume any use of `<video>` or `<audio>` requires
   * a user gesture click to play").
   *
   * It has to be a double: WebKit is not installed on the machines this suite
   * runs on, and Chromium does not implement this policy, so the real refusal
   * cannot be produced here. What is asserted is therefore not "iOS behaves
   * like this" — it is that the component survives a refusal, which is the
   * only half of the question the repository can answer.
   */
  async function refuseUngesturedPlay(page: Page) {
    await page.addInitScript(() => {
      let insideGesture = false;
      const openGesture = () => {
        insideGesture = true;
        // The window is the *task*, and it has to be: the HTML spec performs a
        // microtask checkpoint after every listener whose stack empties, so a
        // `queueMicrotask` here closes the window between this listener and
        // React's — and refuses the press itself, which is not the policy
        // anyone documents. A task boundary is the honest reading of "directly
        // resulted from a handler": the whole dispatch is inside it, and the
        // `ended` that arrives a second later is not.
        setTimeout(() => {
          insideGesture = false;
        }, 0);
      };
      for (const type of ["click", "keydown", "touchend"]) {
        document.addEventListener(type, openGesture, true);
      }

      const refusals: string[] = [];
      (window as unknown as { __refusals: string[] }).__refusals = refusals;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function refusingPlay(this: HTMLMediaElement) {
        // `src`, never `currentSrc`: the component sets the attribute and calls
        // play() in the same breath, and `currentSrc` is still naming the clip
        // that was in the element before the swap.
        if (insideGesture) return play.call(this);
        refusals.push(new URL(this.src, location.href).pathname);
        return Promise.reject(new DOMException("Refused by the test", "NotAllowedError"));
      };
    });
  }

  const readRefusals = (page: Page) =>
    page.evaluate(() => (window as unknown as { __refusals: string[] }).__refusals);

  /** The three attributes the old condition was reading, from the first card. */
  const elementState = (page: Page) =>
    page.evaluate(() => {
      const el = document.querySelector("section article audio") as HTMLAudioElement;
      return {
        source: new URL(el.currentSrc || el.src, location.href).pathname,
        paused: el.paused,
        currentTime: el.currentTime,
      };
    });

  for (const locale of ["pt", "it"] as const) {
    test(`/${locale}/drive: the press after a refusal plays the story, and no press replays the cue`, async ({
      page,
    }) => {
      // Two presses, a clip of ~1,2 s and two swaps, on assets that may be
      // cold: the default 30 s is not the budget for this one.
      test.setTimeout(120_000);
      await refuseUngesturedPlay(page);
      await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);

      const cards = page.locator("section article").filter({ has: page.locator("audio") });
      await expect(cards).toHaveCount(3);
      await watchCard(page, 0);

      const cue = `/audio/${PUBLISHED[0]}-dir.mp3`;
      const story = `/audio/${PUBLISHED[0]}-desc.mp3`;

      // The press is granted, because it is a press: the cue plays.
      await press(page, 0);
      await expect
        .poll(async () => (await readPlayed(page)).sources, { timeout: 30_000 })
        .toEqual([cue]);

      // ...and the continuation is refused. This assertion is what keeps the
      // rest of the test honest: if the swap stopped happening, or if the
      // double stopped refusing, everything below would pass over a path
      // nobody exercised.
      await expect.poll(() => readRefusals(page), { timeout: 30_000 }).toEqual([story]);

      // The state that has no reading: the story is loaded, paused, at zero,
      // which is attribute for attribute what a *finished* sequence looks
      // like. Nothing in the DOM tells the two apart — the component has to
      // have kept the answer itself.
      expect(await elementState(page)).toEqual({ source: story, paused: true, currentTime: 0 });

      // The press that pays for the refusal. It costs one press and it reaches
      // the narration: the cue does not play a second time, and the story
      // advances. Rewinding would leave `sources` at [cue] and this red.
      await press(page, 0);
      await expect
        .poll(async () => (await readPlayed(page)).sources, { timeout: 30_000 })
        .toEqual([cue, story]);
      await expect
        .poll(async () => (await elementState(page)).currentTime, { timeout: 15_000 })
        .toBeGreaterThan(0);
      expect((await elementState(page)).source).toBe(story);
      // And the second press asked for nothing the policy could refuse: one
      // refusal in the whole run, the continuation's.
      expect(await readRefusals(page)).toEqual([story]);
    });
  }
});

/**
 * Card #225 — the line describes the sample, so the row stops moving.
 *
 * The metadata line used to take its length and its language from the clip
 * that was loaded, which meant a press changed its subject: "São Paulo,
 * Brasil · 0:28" became "São Paulo, Brasil · 0:01 · português (Brasil)" for the
 * 1,2 s the cue lasts, wrapped to two lines, and took the card from 152 px to
 * 172 px. A grid levels a row, so the two cards nobody touched moved with it,
 * and the way back landed ~1,2 s after the press — outside the 500 ms in which
 * a shift is excused as a consequence of the visitor's own input.
 *
 * Measured by the browser and not by polling: the whole event is shorter than
 * a reliable poll interval, which is how it reached production.
 */
test.describe("#225 — the card keeps its height while the sample plays", () => {
  const CASES = [
    { locale: "pt", width: 768 },
    { locale: "it", width: 768 },
    { locale: "it", width: 1440 },
  ] as const;

  for (const { locale, width } of CASES) {
    test(`/${locale}/drive at ${width} px: no card of the row changes height between the cue and the story`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}${localizedPathname(locale, "/drive")}`);

      const cards = page.locator("section article").filter({ has: page.locator("audio") });
      await expect(cards).toHaveCount(3);

      // Measured only once the line is complete: the duration lands with the
      // file's header, and a card measured before it is a card in a state no
      // visitor decides in.
      const metadata = page.locator("section article p.line-clamp-2 + p");
      await expect
        .poll(async () => (await metadata.allInnerTexts()).every((text) => /\d+:\d\d/.test(text)), {
          timeout: 15_000,
        })
        .toBe(true);
      const atRest = await metadata.allInnerTexts();

      // Every height each card of the row takes from here on.
      await page.evaluate(() => {
        const row = [...document.querySelectorAll("section article")].filter((card) =>
          card.querySelector("audio"),
        );
        const seen: number[][] = row.map(() => []);
        (window as unknown as { __heights: number[][] }).__heights = seen;
        row.forEach((card, index) => {
          const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
              const height = Math.round(entry.contentRect.height);
              const list = seen[index];
              if (list[list.length - 1] !== height) list.push(height);
            }
          });
          observer.observe(card);
        });
      });

      await watchCard(page, 0);
      await press(page, 0);
      // Through the cue and into the story: the window in which the line used
      // to be saying something else about something else.
      await expect
        .poll(async () => (await readPlayed(page)).sources, { timeout: 30_000 })
        .toEqual([`/audio/${PUBLISHED[0]}-dir.mp3`, `/audio/${PUBLISHED[0]}-desc.mp3`]);
      await expect
        .poll(
          () =>
            page
              .locator("section article audio")
              .first()
              .evaluate((el) => (el as HTMLAudioElement).currentTime),
          { timeout: 20_000 },
        )
        .toBeGreaterThan(1);

      const heights = await page.evaluate(
        () => (window as unknown as { __heights: number[][] }).__heights,
      );
      heights.forEach((taken, index) => {
        expect(taken, `card ${index} took the heights ${taken.join(" → ")}`).toHaveLength(1);
      });
      // ...and it is the same line, not a line that survived by saying less.
      expect(await metadata.allInnerTexts()).toEqual(atRest);
      expect(atRest.every((text) => /\d+:\d\d/.test(text))).toBe(true);
    });
  }
});

/**
 * Card #213 — the route stop keeps its languages.
 *
 * `RouteStopAudio` consumes the same player, and it is the one surface where
 * the visitor picks the language of what he is about to hear: one recording per
 * language per stop, `audio_url` by `language`
 * (docs/contracts/cms-para-site.md). BR-AUDIO-020 is the promise underneath —
 * the content is heard in the language the user chooses — and the player now
 * moves its own source while a sequence plays, which is a new way for that
 * switch to break. It does not: the card is remounted per language, so the
 * chosen recording arrives as a new element and not as a source swapped under a
 * running one.
 */
test.describe("#213 / BR-AUDIO-020 — the stop's language switch survives the sequence", () => {
  test("choosing a language changes the recording, and changing back restores it", async ({
    page,
  }) => {
    const tours = JSON.parse(fs.readFileSync(path.join(SRC, "messages", "pt.json"), "utf8")) as {
      Tours: Record<string, string>;
    };
    // A stop of this route publishes en, es and pt-br (routes-snapshot.json),
    // which is what makes the group render at all.
    await page.goto("/pt/tours/brazil/as-maravilhas-do-rio-em-um-dia");

    const group = page.getByRole("group", { name: tours.Tours.audioLanguages }).first();
    await expect(group).toBeVisible();
    const player = group.locator("xpath=following-sibling::article");
    const source = () =>
      player.locator("audio").evaluate((el) => (el as HTMLAudioElement).src);

    // The page's own dialect is the one selected — nothing was chosen yet.
    await expect(group.getByRole("button", { pressed: true })).toHaveCount(1);
    const initial = await source();
    expect(initial).not.toBe("");

    await group.getByRole("button", { name: "EN" }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(source, { timeout: 10_000 }).not.toBe(initial);
    await expect(group.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // One recording, one element: the switch replaces the card, it does not
    // add a second player beside it.
    await expect(player.locator("audio")).toHaveCount(1);

    await group.getByRole("button", { name: "PT-BR" }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(source, { timeout: 10_000 }).toBe(initial);
  });
});

/**
 * Card #216 — the block's copy never says how many samples the block has.
 *
 * BR-COMUNICACAO-002 item 2 is the family: a figure and a counted noun typed
 * next to each other, where the figure has an owner somewhere else. The four
 * subtitles said "two short stories" over a grid that has rendered three since
 * `bf7d5f1` (spec §1.3 raised the home from two to three), which is the same
 * defect `tests/e2e/figure-noun-pair.spec.ts` watches for POI counts — with a
 * spelled numeral instead of a digit, which is why no existing ruler saw it.
 *
 * `DS-COPY-005` is the rule that is literally on point ("no product figure is
 * written into an i18n string"), and it is still `proposta` in
 * docs/design/spec-repaginacao-site-2026-08.md §8 — never promoted to
 * `heuristica.md`, so `regra.sh` does not know it. Noted on the card.
 *
 * **The owner is `AUDIO_SAMPLE_FILES`, not the copy.** Spec §1.3 authorises one
 * to three samples, and /parcerias and the segment pages will ask this same
 * component for two. Any figure in this namespace re-declares a count the array
 * decides, and goes stale the next time the array moves — so the assertion is
 * "no figure at all", over the whole namespace rather than over `subtitle`, so
 * it still holds when the sentence moves to the heading.
 *
 * Singular is deliberately not on the list: `um`/`uno`/`una`/`one` are articles
 * in three of the four languages, and a ruler that flags "a story you hear
 * while exploring" would be turned off by the next person to write copy here.
 * The defect is a plural count written by hand.
 */
const HAND_WRITTEN_COUNT = new RegExp(
  "\\d|\\b(?:" +
    [
      "dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez",
      "two|three|four|five|six|seven|eight|nine|ten",
      "dos|tres|cuatro|siete|ocho|nueve|diez",
      "due|tre|quattro|cinque|sei|sette|otto|dieci",
    ].join("|") +
    ")\\b",
  "i",
);

function homeAudioSampleMessages(locale: string): Record<string, string> {
  const file = path.join(SRC, "messages", `${locale}.json`);
  const all = JSON.parse(fs.readFileSync(file, "utf8")) as {
    Home: { AudioSample: Record<string, string> };
  };
  return all.Home.AudioSample;
}

test.describe("BR-COMUNICACAO-002 item 2 / DS-COPY-005 — the sample block states no count of its own", () => {
  test("control: the namespace is there, in all four languages, and it has something to say", () => {
    // An assertion about what a set of strings does *not* contain is satisfied
    // by an empty set. This is what keeps the four tests below load-bearing.
    for (const locale of LOCALES) {
      const strings = Object.values(homeAudioSampleMessages(locale));
      expect(strings.length, locale).toBeGreaterThan(1);
      expect(
        strings.every((value) => value.trim().length > 0),
        locale,
      ).toBe(true);
    }
    // And the count the copy must not state is a real one: more than one sample
    // is published, so "how many" is a question the copy could get wrong.
    expect(AUDIO_SAMPLE_FILES.length).toBeGreaterThan(1);
  });

  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-002 item 2: Home.AudioSample in ${locale} writes down no number of samples`, () => {
      const offenders = Object.entries(homeAudioSampleMessages(locale))
        .filter(([, value]) => HAND_WRITTEN_COUNT.test(value))
        .map(([key, value]) => `Home.AudioSample.${key} — "${value}"`);

      expect(
        offenders,
        "This copy states how many samples the block shows. The count belongs to " +
          "AUDIO_SAMPLE_FILES (spec §1.3 authorises one to three, and other pages ask " +
          "for a different number of the same component), so a figure written here is a " +
          "second owner that goes stale the next time the array moves.",
      ).toEqual([]);
    });
  }
});
