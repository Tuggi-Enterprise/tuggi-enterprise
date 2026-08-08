import { test, expect, type Page } from "@playwright/test";

import { getCoverageData, type StateCoverage } from "../../src/lib/coverage";
import { getCountryDisplayName, localizedCountryLabel } from "../../src/lib/countryNames";
import {
  MAP_FRAME,
  activeCountries,
  densityCuts,
  densityStep,
} from "../../src/lib/coverage-density";

/**
 * `CoverageDensityMap` — o componente 4.3 da repaginação (#193).
 *
 * Duas regras mandam neste arquivo, e elas puxam para lados diferentes:
 *
 *  - **DS-COMPONENTE-006** exige que a informação do mapa exista como texto no
 *    HTML servido, legível sem JavaScript. O desenho é `aria-hidden` e vive de
 *    um `fetch`; a lista abaixo dele é o conteúdo.
 *  - **BR-COMUNICACAO-002** proíbe que qualquer número saia de
 *    `coverage-snapshot.json` — congelado em 2026-07-13, contado por um limiar
 *    de renderização (`STATE_MIN_COUNT = 50`), e superdeclarando o acervo em
 *    244.120 pontos. O snapshot pode dizer **quais** países e regiões existem
 *    (item "a linha entre afirmação e listagem"); o item 5 mantém preso até
 *    número dentro de listagem, porque o snapshot não foi regerado nesta
 *    entrega (#207). Por isso a lista tem nomes e nenhuma contagem.
 *
 * A âncora dos testes de alternativa textual é a **região dentro do país**, e
 * não o nome do país: as pílulas de filtro acima do mapa já imprimem os nomes
 * de país, então um teste ancorado neles passa contra a coisa errada — é o que
 * o critério verificável da própria DS-COMPONENTE-006 manda fazer.
 */

const COVERAGE = "/pt/coverage";

const readableText = (page: Page) =>
  page.evaluate(() => {
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

const activeRegions = (states: StateCoverage[]) => states.filter((s) => s.activeCount > 0);

// ───────────────────────────────────────────────────────────────────────────
// 1 — A alternativa textual, sem JavaScript nenhum
// ───────────────────────────────────────────────────────────────────────────

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("DS-COMPONENTE-006 — cada região que o mapa desenha está legível no HTML servido", async ({
    page,
  }) => {
    await page.goto(COVERAGE);
    const text = await readableText(page);
    const { states } = await getCoverageData();
    const regions = activeRegions(states);

    expect(regions.length).toBeGreaterThan(500);

    const missing = regions
      .filter((s) => !text.includes(s.state))
      .map((s) => `${getCountryDisplayName(s.country)} / ${s.state}`);

    expect(
      missing.slice(0, 20),
      `${missing.length} regiões ausentes do texto legível de ${COVERAGE} sem JS — a alternativa ` +
        "é do mapa inteiro, não das quatro maiores de cada país"
    ).toEqual([]);
  });

  test("DS-COMPONENTE-006 — a seção tem título próprio e ele não nasce invisível", async ({
    page,
  }) => {
    await page.goto(COVERAGE);
    const heading = page.locator('[data-block="coverage-list"] h3').first();
    await expect(heading).toHaveCSS("opacity", "1");
    await expect(heading).not.toHaveText("");
  });

  test("§3.2 — as regiões fora do enquadramento fixo estão nomeadas no texto", async ({ page }) => {
    await page.goto(COVERAGE);
    const text = await readableText(page);

    // Alaska e Havaí têm cobertura ativa e caem fora da caixa fixa. Sem inset,
    // a única forma de elas não sumirem é esta linha.
    for (const region of ["Alaska", "Hawaii"]) {
      expect(text, `${region} não aparece na alternativa textual`).toContain(region);
    }
    expect(text).toMatch(/Fora do enquadramento do mapa: Alaska, Hawaii/);
  });

  test("BR-COMUNICACAO-002 — nenhum número do snapshot é publicado no bloco de cobertura", async ({
    page,
  }) => {
    await page.goto(COVERAGE);
    const { states, totalActive, totalActiveRaw, totalActiveRegions, totalActiveCountries } =
      await getCoverageData();

    const blocks = page.locator('[data-block="coverage-density"], [data-block="coverage-list"]');
    await expect(blocks).toHaveCount(2);
    const text = (await blocks.allInnerTexts()).join(" ");

    // Controle positivo: sem isto o teste passa contra um locator vazio. Os
    // nomes vêm do rótulo localizado, não escritos à mão em inglês — `COVERAGE`
    // é `/pt`, e desde o #215 o que está na tela é "Brasil".
    expect(text).toContain(localizedCountryLabel("Brazil", "pt"));
    expect(text).toContain(localizedCountryLabel("Argentina", "pt"));

    const perCountryTotal = new Map<string, number>();
    const perCountryRegions = new Map<string, number>();
    for (const s of activeRegions(states)) {
      perCountryTotal.set(s.country, (perCountryTotal.get(s.country) ?? 0) + s.activeCount);
      perCountryRegions.set(s.country, (perCountryRegions.get(s.country) ?? 0) + 1);
    }

    const figures = new Set<number>([
      totalActive,
      totalActiveRaw,
      totalActiveRegions,
      totalActiveCountries,
      ...activeRegions(states).map((s) => s.activeCount),
      ...perCountryTotal.values(),
      ...perCountryRegions.values(),
    ]);

    // Cada figura nas formas em que ela chegaria à tela: crua, e com os dois
    // separadores de milhar que `toLocaleString` produz nos idiomas do site.
    // Sem piso: nome de país e de região não tem dígito nenhum (conferido no
    // snapshot), então "4 regiões" precisa acender do mesmo jeito que 57.746.
    const written = [...figures].flatMap((n) => [
      String(n),
      n.toLocaleString("pt-BR"),
      n.toLocaleString("en-US"),
    ]);

    const appears = (form: string) =>
      new RegExp(`(?<!\\d)${form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\d)`).test(text);
    const published = [...new Set(written)].filter(appears);

    expect(
      published.slice(0, 10),
      "número derivado de coverage-snapshot.json no bloco de cobertura. O snapshot está congelado " +
        "em 2026-07-13 e não foi regerado nesta entrega (#207): BR-COMUNICACAO-002 itens 5, 9 e 10"
    ).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2 — O desenho, com JavaScript
// ───────────────────────────────────────────────────────────────────────────

test.describe("o desenho", () => {
  test("§3.2 — o quadro desenha os países cobertos, e nenhum outro", async ({ page }) => {
    await page.goto(COVERAGE);
    const shapes = page.locator("[data-country]");
    await expect(shapes.first()).toBeVisible({ timeout: 15_000 });

    const drawn = new Set(
      await shapes.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-country") ?? ""))
    );
    const { states } = await getCoverageData();
    const covered = new Set(activeCountries(states));

    // Nenhuma Ásia, nenhuma África subsaariana, nenhuma Oceania: a caixa fixa
    // vai de −125° a +18°, o que põe a África Ocidental entre a América do Sul
    // e a Europa. Só se desenha onde o TUGGI está (§3.8, §3.9 item 3).
    const foreign = [...drawn].filter((name) => !covered.has(name));
    expect(foreign, "país sem cobertura desenhado no quadro").toEqual([]);

    // E o inverso, que é o modo de falha silencioso: nome que deixou de casar
    // com o TopoJSON some do mapa sem erro nenhum.
    const lost = [...covered].filter((name) => !drawn.has(name));
    expect(lost, "país com cobertura que o TopoJSON não desenhou").toEqual([]);
  });

  test("§3.2 — a caixa fixa preenche o quadro, e o quadro reserva a própria altura", async ({
    page,
  }) => {
    await page.goto(COVERAGE);
    const frame = page.locator('[data-part="map-frame"]');
    await expect(frame).toBeVisible();

    // Antes do TopoJSON chegar: a altura já está reservada (CLS do bloco = 0) e
    // a proporção é a da caixa projetada, senão o mapa entra com tarja nos dois
    // lados e "a caixa preenche o viewBox" vira letra morta.
    const box = (await frame.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(MAP_FRAME.width / MAP_FRAME.height, 2);

    await expect(frame.locator("[data-country]").first()).toBeVisible({ timeout: 15_000 });
    const after = (await frame.boundingBox())!;
    expect(after.height, "o quadro mudou de altura quando o mapa chegou").toBeCloseTo(
      box.height,
      0
    );
  });

  test("o mapa continua fora da ordem de tabulação (SC 2.4.3, 4.1.2)", async ({ page }) => {
    await page.goto(COVERAGE);
    const frame = page.locator('[data-part="map-frame"]');
    await expect(frame.locator("[data-country]").first()).toBeVisible({ timeout: 15_000 });

    // Sem esta contagem o teste abaixo passaria contra um mapa vazio: o
    // `tabIndex="0"` nasce dentro do react-simple-maps, um por `<path>`.
    expect(await frame.locator("path").count()).toBeGreaterThan(100);
    expect(await frame.locator('[tabindex="0"]').count()).toBe(0);
    await expect(frame.locator("svg")).toHaveAttribute("aria-hidden", "true");
  });

  test("SC 1.4.11 — cada degrau de densidade se distingue da terra não preenchida", async ({
    page,
  }) => {
    await page.goto(COVERAGE);
    await expect(page.locator("[data-country]").first()).toBeVisible({ timeout: 15_000 });

    const measured = await page.evaluate(() => {
      // A cor se resolve no canvas do próprio navegador, não por parse de
      // `getComputedStyle`: `color-mix()` volta em `color(srgb …)` ou `lab()`,
      // e um parse ingênuo devolve um contraste que não existe.
      const srgb = (color: string, background: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };

      const section = document.querySelector('[data-block="coverage-density"]')!;
      const background = getComputedStyle(section).backgroundColor;
      const swatches = [...document.querySelectorAll("[data-density-swatch]")];
      const land = document.querySelector("[data-country]")!;

      return {
        steps: swatches.map((el) => srgb(getComputedStyle(el).backgroundColor, background)),
        stroke: srgb(getComputedStyle(swatches[0]).outlineColor, background),
        land: srgb(getComputedStyle(land).fill, background),
        painted: [...document.querySelectorAll("[data-step]")].map((el) => ({
          step: Number(el.getAttribute("data-step")),
          fill: srgb(getComputedStyle(el).fill, background),
        })),
      };
    });

    const luminance = ([r, g, b]: number[]) => {
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const ratio = (a: number[], b: number[]) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    expect(measured.steps).toHaveLength(4);

    // Objeto gráfico é 3:1 (SC 1.4.11), não 4,5:1 — 4,5:1 é texto.
    const strokeVsLand = ratio(measured.stroke, measured.land);
    for (const [index, fill] of measured.steps.entries()) {
      const fillVsLand = ratio(fill, measured.land);
      const strokeVsFill = ratio(measured.stroke, fill);
      const distinguishable = fillVsLand >= 3 || (strokeVsFill >= 3 && strokeVsLand >= 3);
      expect(
        distinguishable,
        `degrau ${index}: preenchimento ${fillVsLand.toFixed(2)}:1 contra a terra, e a fronteira ` +
          `${strokeVsFill.toFixed(2)}:1 contra ele (${strokeVsLand.toFixed(2)}:1 contra a terra). ` +
          "Nenhum dos dois chega a 3:1, então esse degrau some no fundo."
      ).toBe(true);
    }

    // A legenda é a chave do desenho; se ela mostrar outra cor, ela mente.
    expect(measured.painted.length).toBeGreaterThan(50);
    for (const { step, fill } of measured.painted) {
      expect(fill, `região pintada no degrau ${step} não usa a cor da legenda`).toEqual(
        measured.steps[step]
      );
    }
  });

  test("§3.3 — a densidade é ordinal: os quatro degraus saem dos quartis do snapshot", async () => {
    const { states } = await getCoverageData();
    const cuts = densityCuts(states);
    const regions = activeRegions(states);

    expect(cuts[0]).toBeLessThan(cuts[1]);
    expect(cuts[1]).toBeLessThan(cuts[2]);

    const used = new Set(regions.map((s) => densityStep(s.activeCount, cuts)));
    expect([...used].sort(), "quartil que não pinta região nenhuma").toEqual([0, 1, 2, 3]);

    // Monotônica: região mais densa nunca cai num degrau mais baixo.
    const ordered = [...regions].sort((a, b) => a.activeCount - b.activeCount);
    const steps = ordered.map((s) => densityStep(s.activeCount, cuts));
    expect(steps.every((step, i) => i === 0 || step >= steps[i - 1])).toBe(true);
  });
});

test.describe("360 px", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("§3.9 — a faixa de países rola sozinha, e a página não (SC 1.4.10)", async ({ page }) => {
    await page.goto(COVERAGE);
    await expect(page.locator('[data-part="map-frame"]')).toBeVisible();

    // A faixa de filtros é um rolador horizontal deliberado em 360 px — 39
    // pílulas empilhadas empurravam o mapa 15 linhas abaixo da dobra. O que não
    // pode acontecer é ela vazar para o documento.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, "a página inteira rola na horizontal em 360 px").toBeLessThanOrEqual(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3 — A legenda, nos quatro idiomas
// ───────────────────────────────────────────────────────────────────────────

for (const locale of ["pt", "en", "es", "it"]) {
  test(`§3.3 — a legenda tem quatro degraus rotulados em texto em /${locale} (SC 1.4.1)`, async ({
    page,
  }) => {
    // `/coverage` tem o mesmo slug nos quatro idiomas (src/i18n/pathnames.ts).
    await page.goto(`/${locale}/coverage`);
    const labels = page.locator('[data-block="coverage-density"] [data-density-swatch]');
    await expect(labels).toHaveCount(4);

    const texts = await page
      .locator('[data-block="coverage-density"] [data-density-swatch] + span')
      .allInnerTexts();
    expect(texts).toHaveLength(4);
    expect(texts.every((t) => t.trim().length > 2)).toBe(true);
    expect(new Set(texts).size, "dois degraus com o mesmo rótulo").toBe(4);
  });
}
