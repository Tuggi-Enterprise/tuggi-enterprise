import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { getCoverageData } from "../../src/lib/coverage";
import { getCountryDisplayName } from "../../src/lib/countryNames";
import { activeCountries } from "../../src/lib/coverage-density";

/**
 * A home na ordem nova — card #194, §6 de
 * `docs/design/spec-repaginacao-site-2026-08.md`.
 *
 * O que este arquivo mede é a lista "pronto quando" da §6.6, e o que ele
 * **não** mede é o que já tem dono: as três amostras e a etiqueta do clipe
 * estão em `audio-sample.spec.ts`, as frases do bloco de prova em
 * `proof-block.spec.ts` e `product-facts.spec.ts`, e a alternativa textual de
 * `/coverage` em `coverage-density.spec.ts`. Aqui fica o que só existe quando
 * os dez blocos são montados na mesma página, nesta ordem.
 *
 * A âncora de cada bloco é **o texto que o visitante lê**, tirado do arquivo de
 * mensagens — não um `data-*` que eu escreveria dos dois lados. Trocar dois
 * blocos de lugar acende o teste; renomear uma classe, não.
 *
 * Uma armadilha do next-intl mora aqui: o payload RSC carrega o arquivo de
 * mensagens **inteiro**, então `page.content()` contém a copy de todas as
 * páginas do site. A leitura é sempre de texto visível.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const LOCALES = ["pt", "en", "es", "it"] as const;

type Messages = { [key: string]: string | Messages };

function messagesFor(locale: string): Messages {
  return JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "src/messages", `${locale}.json`), "utf8"),
  ) as Messages;
}

function messageAt(messages: Messages, dotted: string): string {
  const value = dotted
    .split(".")
    .reduce<string | Messages | undefined>(
      (node, part) => (typeof node === "object" && node ? node[part] : undefined),
      messages,
    );
  expect(typeof value, `${dotted} existe e é string`).toBe("string");
  return value as string;
}

/**
 * O maior pedaço literal de uma mensagem ICU: sem tag rica, sem placeholder e
 * sem quebra de linha.
 *
 * `Proof.points` é *"<strong>Mais de {mappedPointMillions} milhões</strong> de
 * pontos mapeados, em {coverageCountries} países."* — procurar a string inteira
 * no texto renderizado nunca casaria, e resolver o ICU aqui seria reimplementar
 * o formatador. O maior trecho literal é único na página e sobrevive à tradução.
 */
function literalChunk(message: string): string {
  return message
    .split(/<[^>]*>|\{[^}]*\}|\n/)
    .map((part) => part.trim())
    .sort((a, b) => b.length - a.length)[0];
}

/** O texto que um leitor vê: sem script, sem template, sem `<head>`. */
const visibleText = (page: Page) =>
  page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelectorAll("script, template, noscript, style").forEach((node) => node.remove());
    return (body.innerText ?? "").replace(/\s+/g, " ");
  });

/** Os dez blocos da §6.1, na ordem, cada um pela frase que só ele publica. */
const ORDER = [
  { block: "1 hero", key: "Home.Hero.title" },
  { block: "2 como funciona", key: "Home.HowItWorks.title" },
  { block: "3 cena", key: "Home.Scene.lead" },
  { block: "4 amostras", key: "Home.AudioSample.title" },
  { block: "5 blocos de produto", key: "Home.Showcase.feat2Title" },
  { block: "6 prova", key: "Proof.points" },
  { block: "7 cobertura", key: "Coverage.Density.sectionTitle" },
  { block: "8 negócio", key: "Home.Business.title" },
  { block: "9 o que é o TUGGI", key: "Home.Context.title" },
  { block: "10 perguntas frequentes", key: "Home.FAQ.title" },
] as const;

test.describe("spec §6.1 — a ordem da home é a da tabela, nos quatro idiomas", () => {
  for (const locale of LOCALES) {
    test(`spec §6.6 item 1: /${locale} publica os dez blocos na ordem ditada`, async ({ page }) => {
      const messages = messagesFor(locale);
      await page.goto(`/${locale}`);
      const text = await visibleText(page);

      const positions = ORDER.map(({ block, key }) => {
        const anchor = literalChunk(messageAt(messages, key)).replace(/\s+/g, " ");
        const at = text.indexOf(anchor);
        expect(at, `${locale}: "${anchor}" (${block}) não está na página`).toBeGreaterThan(-1);
        return { block, at };
      });

      expect(
        positions.map((p) => p.block),
        `ordem lida em /${locale}`,
      ).toEqual([...positions].sort((a, b) => a.at - b.at).map((p) => p.block));
    });
  }
});

test.describe("spec §6.3 — cinco blocos de produto, e dois deles num par", () => {
  test("spec §6.6 item 2: a home mostra cinco blocos e feat1 não existe mais", async ({ page }) => {
    for (const locale of LOCALES) {
      const messages = messagesFor(locale) as unknown as {
        Home: { Showcase: Record<string, string> };
      };
      const showcase = messages.Home.Showcase;

      // A chave órfã é o defeito, não o bloco ausente: um `feat1Title` que
      // ninguém renderiza volta para a página no primeiro `feat${n}` que
      // alguém escrever num laço (CLAUDE.md §6).
      for (const dead of ["feat1Title", "feat1Body", "feat1Alt"]) {
        expect(showcase[dead], `${locale}: Home.Showcase.${dead}`).toBeUndefined();
      }

      // O sujeito é o HTML servido, e esperar o evento `load` de uma página com
      // três clipes e cinco capturas é esperar o que este teste não mede.
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
      const text = await visibleText(page);
      const shown = ["feat2Title", "feat3Title", "feat4Title", "feat5Title", "feat6Title"].filter(
        (key) => text.includes(showcase[key].replace(/\s+/g, " ")),
      );
      expect(shown, `${locale}: títulos de bloco de produto na página`).toHaveLength(5);
    }
  });

  test("spec §6.3: feat3 e feat4 dividem uma linha em md, e o passaporte fecha", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/pt");
    const showcase = (messagesFor("pt") as unknown as { Home: { Showcase: Record<string, string> } })
      .Home.Showcase;

    const topOf = async (title: string) =>
      (await page.getByRole("heading", { name: title, exact: true }).boundingBox())!.y;

    const [feat3, feat4] = await Promise.all([
      topOf(showcase.feat3Title),
      topOf(showcase.feat4Title),
    ]);
    // Lado a lado: os dois títulos começam na mesma altura. Empilhados, a
    // diferença é a altura de um card inteiro.
    expect(Math.abs(feat3 - feat4), "feat3 e feat4 não estão na mesma linha").toBeLessThan(8);

    const tops = await Promise.all(
      ["feat2Title", "feat3Title", "feat6Title", "feat5Title"].map((key) => topOf(showcase[key])),
    );
    expect(tops, "a ordem vertical dos blocos restantes").toEqual([...tops].sort((a, b) => a - b));
  });

  test("spec §6.3: nenhuma linha telefone-e-texto repete o lado da anterior", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pt");
    const showcase = (messagesFor("pt") as unknown as { Home: { Showcase: Record<string, string> } })
      .Home.Showcase;

    const sides: ("left" | "right")[] = [];
    for (const key of ["feat2Title", "feat6Title", "feat5Title"]) {
      const heading = page.getByRole("heading", { name: showcase[key], exact: true });
      const copy = (await heading.boundingBox())!;
      const row = (await heading.locator("xpath=ancestor::div[contains(@class,'grid')][1]").boundingBox())!;
      sides.push(copy.x - row.x < row.width / 2 ? "right" : "left");
    }

    expect(sides[0], "feat2: telefone à direita").toBe("right");
    for (let i = 1; i < sides.length; i += 1) {
      expect(sides[i], `linha ${i + 1} repete o lado da anterior`).not.toBe(sides[i - 1]);
    }
  });
});

test.describe("spec §6.2 — o bloco de cena não pede nada", () => {
  test("sem imagem, sem link, sem botão", async ({ page }) => {
    await page.goto("/pt");
    const scene = page.locator('[data-block="scene"]');

    await expect(scene).toHaveCount(1);
    await expect(scene.locator("img, svg, a, button")).toHaveCount(0);
  });

  test("DS-COR-004 / SC 1.4.3: texto branco sobre o fundo escuro, nunca o slate", async ({
    page,
  }) => {
    await page.goto("/pt");
    const measured = await page.locator('[data-block="scene"]').evaluate((section) => {
      const background = getComputedStyle(section).backgroundColor;
      return [...section.querySelectorAll("p")].map((p) => ({
        color: getComputedStyle(p).color,
        background,
      }));
    });

    // Medido no navegador, não deduzido do token: `--color-tuggi-slate` sobre
    // `--color-tuggi-dark` dá 3,13:1 e reprova, e é o erro que a §6.2 nomeia.
    const luminance = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
      const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };

    expect(measured.length, "o bloco de cena tem duas partes").toBe(2);
    for (const { color, background } of measured) {
      const [a, b] = [luminance(color), luminance(background)].sort((x, y) => y - x);
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("spec §6.2: o golpe fica na própria linha", async ({ page }) => {
    await page.goto("/pt");
    // A quebra vive na mensagem, e é `whitespace-pre-line` que a preserva:
    // "Ouviu nenhuma." não pode chegar no meio de uma linha.
    const lead = page.locator('[data-block="scene"] p').first();
    await expect(lead).toHaveCSS("white-space", "pre-line");
    expect(messageAt(messagesFor("pt"), "Home.Scene.lead")).toContain("\n");
  });
});

test.describe("spec §6.4 — o hero mostra a ficha, não o mapa", () => {
  test("a captura é poi-story.jpg e a pílula não existe mais", async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      const hero = page.locator("section").first();

      const src = await hero.locator("img").last().getAttribute("src");
      expect(src, `${locale}: captura do hero`).toContain("poi-story");

      // A pílula repetia, a 200 px de distância, o nome do lugar impresso na
      // própria captura. A chave saiu com ela.
      expect(
        (messagesFor(locale) as unknown as { Home: { Hero: Record<string, string> } }).Home.Hero
          .nowPlaying,
        `${locale}: Home.Hero.nowPlaying`,
      ).toBeUndefined();
    }
  });

  test("SC 1.1.1: o alt descreve a ficha, não o mapa", async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      const alt = await page.locator("section").first().locator("img").last().getAttribute("alt");
      const expected = messageAt(messagesFor(locale), "Home.Hero.phoneAlt");
      expect(alt, `${locale}: alt do hero`).toBe(expected);
      // O alt antigo descrevia "mapa mostrando histórias, eventos e trilhas".
      // O critério é o que a ficha acrescenta: o lugar e as duas ações.
      expect(expected.length, `${locale}: alt curto demais para descrever a ficha`).toBeGreaterThan(
        60,
      );
    }
  });
});

test.describe("spec §6.1 item 7 — a cobertura da home responde sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("DS-COMPONENTE-006: os países cobertos estão no HTML servido, com a saída para a lista inteira", async ({
    page,
  }) => {
    await page.goto("/pt", { waitUntil: "domcontentloaded" });
    const text = await visibleText(page);
    const { states } = await getCoverageData();
    const countries = activeCountries(states);

    expect(countries.length).toBeGreaterThan(30);
    const missing = countries
      .map((country) => getCountryDisplayName(country))
      .filter((name) => !text.includes(name));
    expect(missing, "países ausentes do texto servido da home").toEqual([]);

    // A lista curta só é honesta enquanto aponta para a completa.
    await expect(page.locator('[data-block="coverage-list"] a[href$="/coverage"]')).toHaveCount(1);
  });

  test("BR-COMUNICACAO-002 item 5: a home não publica número nenhum do snapshot", async ({
    page,
  }) => {
    await page.goto("/pt", { waitUntil: "domcontentloaded" });
    const list = await page.locator('[data-block="coverage-list"]').innerText();
    const { states } = await getCoverageData();

    // O snapshot está congelado desde 2026-07-13 (#207): ele diz *quais*
    // lugares existem, e nenhum número dele chega ao ar.
    expect(list).not.toMatch(/\d/);
    const total = states.reduce((sum, state) => sum + state.activeCount, 0);
    expect(list).not.toContain(String(total));
  });
});

test.describe("spec §6.1 item 8 — a única porta B2B da página de maior tráfego", () => {
  test("os dois destinos são cards, e cada um mantém o seu evento", async ({ page }) => {
    await page.goto("/pt");
    const section = page.locator('[data-block="business"]');
    const cards = section.locator("a");

    await expect(cards).toHaveCount(2);
    const hrefs = await cards.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href")),
    );
    expect(hrefs.some((href) => href?.endsWith("/enterprise/fleets"))).toBe(true);
    expect(hrefs.some((href) => href?.endsWith("/destinos"))).toBe(true);

    // DS-A11Y-002: o alvo é o card inteiro, não a última palavra dele.
    for (const box of await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height),
    )) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("spec §6.6 itens 6 e 7 — a página cabe em 360 px e ninguém inventa trilho", () => {
  test("em italiano, a 360 px, nenhum dos dez blocos rola na horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/it");
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("DS-LAYOUT-002: os blocos novos sentam no trilho do cabeçalho", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pt");
    const rail = (await page.locator("header nav").first().boundingBox())!;

    for (const block of ["scene", "business"]) {
      const shell = (await page
        .locator(`[data-block="${block}"] > div`)
        .first()
        .boundingBox())!;
      expect(Math.abs(shell.x - rail.x), `${block}: borda esquerda`).toBeLessThan(2);
      expect(Math.abs(shell.width - rail.width), `${block}: largura`).toBeLessThan(2);
    }
  });
});
