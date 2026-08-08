import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { localizedPathname } from "../../src/i18n/pathnames";
import { getCoverageData } from "../../src/lib/coverage";
import { localizedCountryLabel } from "../../src/lib/countryNames";

/**
 * Content that explains the product does not depend on JavaScript to be
 * visible — #191, and the executable half of DS-COMPONENTE-006.
 *
 * This is a robustness card, not an accessibility one, and the distinction is
 * deliberate: `docs/design/acessibilidade-auditoria-2026-08.md` tested this SC
 * by SC and WCAG Conformance Requirement 4 allows depending on JavaScript.
 * What it does not survive is a crawler, a print, a full-page screenshot, or a
 * phone that scrolled past the block before the observer fired.
 *
 * Three failure modes, measured on 2026-08-06, each with a test below:
 *
 *   1. No JavaScript at all. framer-motion server-renders `initial` as an
 *      inline style, so `initial={{opacity: 0}}` is what the HTML ships: the
 *      country list, the comparison table, the pricing cards and the feature
 *      rows were in the DOM and invisible. /pt/coverage shipped 48 such
 *      elements, /pt/drive 23.
 *   2. `page.screenshot({fullPage: true})`. It resizes the viewport instead of
 *      scrolling, so an IntersectionObserver bound to `whileInView` never
 *      re-evaluates and everything below the first fold stays hidden.
 *   3. A fling on a phone. Jumping to the end of the document left all 6 rows
 *      of the comparison table at `opacity: 0` permanently.
 *
 * All three come from the same cause, so the fix is one rule: reveal
 * animations move, they do not fade in from nothing. The resting state — what
 * the server ships and what a browser without JS keeps forever — is the state
 * the reader is supposed to see.
 */

const ROUTES = {
  home: "/",
  coverage: "/coverage",
  drive: "/drive",
} as const;

const url = (locale: string, route: string) =>
  `/${locale}${localizedPathname(locale, route) === "/" ? "" : localizedPathname(locale, route)}`;

// ───────────────────────────────────────────────────────────────────────────
// The sweep — what the browser computed, not what the source says
// ───────────────────────────────────────────────────────────────────────────

type Offender = {
  tag: string;
  className: string;
  text: string;
  /** Index of the ancestor <section>, or -1 when there is none. */
  section: number;
};

/**
 * Every element the reader cannot see because something set `opacity: 0`,
 * reported outermost-first so a hidden section is one line and not eighty.
 *
 * Not counted, and each exclusion has a reason:
 *   - `visibility: hidden` — a closed menu (the header's locale dropdown is
 *     `opacity-0 invisible`); it is not content waiting to be read.
 *   - anything under `aria-hidden="true"` — decoration by its own declaration.
 *   - elements with neither text nor an image — a wrapper carries no content.
 */
async function invisibleContent(page: import("@playwright/test").Page) {
  return page.evaluate<Offender[]>(() => {
    const sections = [...document.querySelectorAll("section")];
    const hidden = (el: Element) => getComputedStyle(el).opacity === "0";

    return [...document.querySelectorAll("body *")]
      .filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.opacity !== "0" || cs.visibility === "hidden") return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        const carriesContent =
          (el.textContent ?? "").trim().length > 0 || el.querySelector("img") !== null;
        if (!carriesContent) return false;
        // Outermost only: a hidden ancestor already explains this one.
        for (let p = el.parentElement; p; p = p.parentElement) if (hidden(p)) return false;
        return true;
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        className: el.getAttribute("class") ?? "",
        text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
        section: sections.indexOf(el.closest("section") as HTMLElement),
      }));
  });
}

const describe = (o: Offender[]) =>
  o.map((x) => `<${x.tag}> [section ${x.section}] ${x.text || x.className}`).join("\n");

/**
 * O texto que um leitor realmente vê — `innerText` do Playwright ignora
 * `display: none` mas conta o que está em `opacity: 0`, e é justamente essa a
 * diferença que este arquivo mede.
 */
async function readableText(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const walk = (el: Element) => {
      const cs = getComputedStyle(el);
      if (cs.opacity === "0" || cs.visibility === "hidden" || cs.display === "none") return;
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) out.push(node.nodeValue ?? "");
        else if (node.nodeType === Node.ELEMENT_NODE) walk(node as Element);
      }
    };
    walk(document.body);
    return out.join(" ").replace(/\s+/g, " ");
  });
}

// ───────────────────────────────────────────────────────────────────────────
// 1 — Sem JavaScript nenhum
// ───────────────────────────────────────────────────────────────────────────

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("/pt/drive serve o comparativo, os planos, os recursos e os idiomas visíveis (#191)", async ({
    page,
  }) => {
    await page.goto(url("pt", ROUTES.drive));
    const offenders = await invisibleContent(page);
    expect(offenders, describe(offenders)).toEqual([]);

    // The four blocks by name, so a failure says which one regressed rather
    // than just "something is invisible".
    await expect(page.locator("table tbody tr")).toHaveCount(6);
    for (const row of await page.locator("table tbody tr").all()) {
      await expect(row).toHaveCSS("opacity", "1");
    }
  });

  test("/pt renderiza os passos e as linhas de funcionalidade sem JS (#191)", async ({ page }) => {
    await page.goto(url("pt", ROUTES.home));
    const offenders = await invisibleContent(page);
    expect(offenders, describe(offenders)).toEqual([]);

    await expect(page.locator("ol li")).not.toHaveCount(0);
    for (const step of await page.locator("ol li").all()) {
      await expect(step).toHaveCSS("opacity", "1");
    }
  });

  /**
   * DS-COMPONENTE-006 — a visualização de dado tem alternativa textual servida
   * pelo servidor. O mapa de /coverage é `aria-hidden` e feito de 4.773 paths
   * de uma lib de terceiro; a alternativa é a lista de países abaixo dele, e a
   * regra exige que ela esteja legível no HTML servido, sem hidratação e sem
   * JavaScript. Era exatamente o que faltava: a lista nascia em `opacity: 0`
   * esperando um IntersectionObserver.
   */
  test("DS-COMPONENTE-006 — a alternativa textual do mapa é legível no HTML servido (#191)", async ({
    page,
  }) => {
    await page.goto(url("pt", ROUTES.coverage));
    const text = await readableText(page);

    // Ancorar em nome de país seria uma régua que passa sozinha: as pílulas de
    // filtro **acima** do mapa já imprimem os 48 nomes, e a lista podia estar
    // invisível com o teste verde — foi o que a mutação mostrou. O que só
    // existe dentro da alternativa é a região dentro do país, e é nela que
    // este teste ancora.
    const { states } = await getCoverageData();
    const topRegionByCountry = new Map<string, string>();
    for (const s of states) {
      if (s.activeCount === 0) continue;
      // O agrupamento é pelo rótulo cru do snapshot — a identidade —, e o que
      // se procura na página é o nome escrito em português, que é o que o
      // leitor de `/pt/coverage` vê desde o #215.
      const best = states
        .filter((o) => o.country === s.country && o.activeCount > 0)
        .sort((a, b) => b.activeCount - a.activeCount)[0];
      topRegionByCountry.set(localizedCountryLabel(s.country, "pt"), best.state);
    }
    expect(topRegionByCountry.size).toBeGreaterThan(10);

    const missing = [...topRegionByCountry].filter(
      ([country, region]) => !text.includes(country) || !text.includes(region)
    );
    expect(
      missing.map(([c, r]) => `${c} / ${r}`),
      "país ou região ausente do texto legível de /pt/coverage sem JS"
    ).toEqual([]);

    // E o título da seção junto: sem ele a lista é uma grade de cartões sem
    // nome, que é o que a regra chama de "não é `alt`, não é `title`".
    const heading = page.getByRole("heading", { level: 2 }).first();
    await expect(heading).toHaveCSS("opacity", "1");
  });

  /**
   * O hero de /coverage ainda não passou por esta correção: `CoverageHero.tsx`
   * está sob a #199 (constantes de acervo e cobertura) e não se toca em dois
   * cards ao mesmo tempo na mesma working tree. A dispensa é nominal e tem
   * dono; este teste existe para que ela não sobreviva ao conserto — quando a
   * #199 tirar o `opacity: 0` do hero, ele fica vermelho e a dispensa sai
   * junto, aqui e em KNOWN_GAPS abaixo.
   */
  test("dispensa viva: o hero de /pt/coverage continua invisível sem JS (#199)", async ({
    page,
  }) => {
    await page.goto(url("pt", ROUTES.coverage));
    const offenders = await invisibleContent(page);

    expect(offenders.length, describe(offenders)).toBeGreaterThan(0);
    expect(
      offenders.every((o) => o.section === 0),
      `fora do hero (section 0), o que só pode ser regressão desta correção:\n${describe(
        offenders.filter((o) => o.section !== 0)
      )}`
    ).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2 — Com JavaScript, mas sem rolagem: captura de página inteira e crawler
// ───────────────────────────────────────────────────────────────────────────

test("captura de página inteira não rola, e mesmo assim o fim da página aparece (#191)", async ({
  page,
}) => {
  await page.goto(url("pt", ROUTES.drive));
  await page.screenshot({ fullPage: true });

  // A prova de que o observer não teve chance: a captura não moveu o scroll.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // O comparativo é o sexto bloco da página, muito abaixo da primeira dobra.
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(6);
  for (const row of await rows.all()) await expect(row).toHaveCSS("opacity", "1");
});

// ───────────────────────────────────────────────────────────────────────────
// 3 — Fling no celular: salto instantâneo para o fim do documento
// ───────────────────────────────────────────────────────────────────────────

test.describe("fling em 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("salto instantâneo para o fim deixa as 6 linhas do comparativo visíveis (#191)", async ({
    page,
  }) => {
    await page.goto(url("pt", ROUTES.drive));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100); // a medição da #191: 100ms depois do gesto

    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(6);
    for (const row of await rows.all()) await expect(row).toHaveCSS("opacity", "1");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 4 — A régua estática: o próximo componente não nasce invisível
// ───────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "../..");
const COMPONENTS = path.join(REPO_ROOT, "src/components");

/**
 * Componentes cujo `opacity: 0` é legítimo, com o motivo. Todos têm a mesma
 * forma: o elemento **não existe** no HTML servido, então não há nada que um
 * leitor sem JavaScript deixe de ver.
 */
const JS_ONLY: Record<string, string> = {
  // `blocks/CoverageMap.tsx` estava aqui pelo tooltip dentro de AnimatePresence.
  // O #193 o substituiu por CoverageDensityMap/CoverageDensityCanvas, que não
  // usam framer-motion: não há `opacity: 0` nenhum, e por isso não há dispensa.
  // `blocks/HomeHero.tsx` saiu pelo mesmo caminho no #194: a pílula "tocando
  // agora" repetia, sobre a captura da ficha, o nome do lugar já impresso nela,
  // e foi removida com o `useState` e o `setTimeout` que a montavam.
  "blocks/CityOSHeroAnimator.tsx": "demonstração animada, montada em etapas por estado de React",
  "blocks/DriveHeroAnimator.tsx": "demonstração animada, montada em etapas por estado de React",
  "global/CookieBanner.tsx": "só existe quando não há consentimento gravado, decidido no cliente",
};

/**
 * Dívida conhecida, com dono. Não é dispensa permanente: o teste abaixo exige
 * que cada entrada ainda seja verdade, então consertar o arquivo obriga a
 * apagar a linha.
 */
const KNOWN_GAPS: Record<string, string> = {
  "blocks/CoverageHero.tsx": "#199 está no arquivo; o hero de /coverage sai com aquele card",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Comentário fora antes de qualquer casamento. Esta régua procura a string
 * `opacity: 0`, e explicar o defeito num comentário — que é exatamente o que
 * este arquivo e os componentes corrigidos fazem — deixaria o teste vermelho
 * por escrever prosa.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function filesWithOpacityZero(): string[] {
  return walk(COMPONENTS)
    .filter((file) => /opacity:\s*0\s*[,}]/.test(stripComments(fs.readFileSync(file, "utf8"))))
    .map((file) => path.relative(COMPONENTS, file))
    .sort();
}

test("nenhum bloco novo nasce invisível: opacity 0 só onde há motivo escrito (#191)", () => {
  const documented = new Set([...Object.keys(JS_ONLY), ...Object.keys(KNOWN_GAPS)]);
  const found = filesWithOpacityZero();
  const undocumented = found.filter((file) => !documented.has(file));

  expect(
    undocumented,
    "Componente com `opacity: 0` e sem motivo. Ou a animação passa a mover em vez de " +
      "revelar (o conteúdo nasce visível, que é a correção da #191), ou o arquivo entra em " +
      "JS_ONLY / KNOWN_GAPS com a razão escrita ao lado."
  ).toEqual([]);
});

test("a dispensa morre com o conserto: todo motivo escrito ainda descreve o arquivo (#191)", () => {
  const found = new Set(filesWithOpacityZero());

  for (const [file, reason] of Object.entries({ ...JS_ONLY, ...KNOWN_GAPS })) {
    expect(fs.existsSync(path.join(COMPONENTS, file)), `${file} não existe mais`).toBe(true);
    expect(found.has(file), `${file} não tem mais opacity 0 — apague a dispensa "${reason}"`).toBe(
      true
    );
    expect(reason.length, `${file} precisa de um motivo escrito`).toBeGreaterThan(20);
  }
});
