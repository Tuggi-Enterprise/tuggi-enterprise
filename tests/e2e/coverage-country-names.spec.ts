import { test, expect } from "@playwright/test";

import { getCoverageData } from "../../src/lib/coverage";
import { activeCountries } from "../../src/lib/coverage-density";
import { getCountryDisplayName, localizedCountryLabel } from "../../src/lib/countryNames";
import { getStateHubPaths } from "../../src/lib/routes";

/**
 * #215 — o nome do país é escrito na língua da página, e a identidade do país
 * continua em inglês em todo lugar onde ela é **chave**.
 *
 * As duas metades são um teste só porque o defeito é a fronteira entre elas.
 * `groupCoverage()` usava `getCountryDisplayName()` para as duas coisas ao
 * mesmo tempo: o texto que o visitante lê e a chave `"<país>|<região>"` com que
 * `getStateHubPaths()` guarda o hub de roteiros. Traduzir só o texto teria
 * apagado **todos** os links da lista para as páginas de destino, sem erro
 * nenhum — nem no `tsc`, nem no build, nem no console. Por isso o bloco C não é
 * um extra: ele é o teste do card.
 *
 * A leitura é sempre de texto de bloco, nunca `page.content()`: o next-intl
 * embute o arquivo de mensagens inteiro no payload RSC, e uma busca crua acha a
 * copy de qualquer outra página do site.
 */

const LOCALES = ["pt", "en", "es", "it"] as const;
const TRANSLATED = ["pt", "es", "it"] as const;

/**
 * Quatro países cujo nome em inglês não é pedaço do nome traduzido em nenhum
 * dos três idiomas — "Panama" seria pedaço de "Panamá" e a asserção passaria
 * pelo motivo errado. É o que sobra do inglês se a correção não pegar.
 */
const UNMISTAKABLE_ENGLISH = ["United States", "United Kingdom", "Germany", "Switzerland"];

const listText = (locale: string) => `/${locale}`;

test.describe("#215 — o país é escrito na língua da página", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    test(`/${locale}/coverage: os 39 países saem em ${locale}, nas pílulas e na lista`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/coverage`, { waitUntil: "domcontentloaded" });
      const { states } = await getCoverageData();
      const countries = activeCountries(states);
      expect(countries.length, "controle: o snapshot precisa ter país ativo").toBeGreaterThan(30);

      const list = await page.locator('[data-block="coverage-list"]').innerText();
      const pills = await page.locator('[data-block="coverage-density"] button').allInnerTexts();
      const pillSet = new Set(pills.map((text) => text.trim()));

      const missingFromList = countries
        .map((country) => localizedCountryLabel(country, locale))
        .filter((label) => !list.includes(label));
      expect(missingFromList, `país ausente da lista de /${locale}/coverage`).toEqual([]);

      const missingFromPills = countries
        .map((country) => localizedCountryLabel(country, locale))
        .filter((label) => !pillSet.has(label));
      expect(missingFromPills, `país ausente das pílulas de /${locale}/coverage`).toEqual([]);
    });

    test(`/${locale}: a lista da home sai em ${locale}`, async ({ page }) => {
      await page.goto(listText(locale), { waitUntil: "domcontentloaded" });
      const { states } = await getCoverageData();
      const list = await page.locator('[data-block="coverage-list"]').innerText();

      const missing = activeCountries(states)
        .map((country) => localizedCountryLabel(country, locale))
        .filter((label) => !list.includes(label));
      expect(missing, `país ausente da lista da home em /${locale}`).toEqual([]);
    });
  }

  for (const locale of TRANSLATED) {
    test(`/${locale}/coverage não escreve o nome em inglês`, async ({ page }) => {
      await page.goto(`/${locale}/coverage`, { waitUntil: "domcontentloaded" });
      const text = (
        await page
          .locator('[data-block="coverage-density"], [data-block="coverage-list"]')
          .allInnerTexts()
      ).join(" ");

      // Controle positivo: sem ele a asserção de ausência fica verde contra um
      // locator vazio, que é o modo de falha desta forma de teste.
      expect(text).toContain(localizedCountryLabel("Germany", locale));

      const leftover = UNMISTAKABLE_ENGLISH.filter((name) => text.includes(name));
      expect(leftover, `nome de país em inglês em /${locale}/coverage`).toEqual([]);
    });
  }
});

test.describe("#215 — a chave não é o rótulo: os links do hub de roteiros continuam de pé", () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    test(`/${locale}/coverage: cada região com roteiro continua linkada`, async ({ page }) => {
      const { states } = await getCoverageData();
      const hubs = getStateHubPaths(locale);

      // O esperado sai da mesma chave que o servidor usa — o rótulo **em
      // inglês** do país mais o nome da região. Se a chave passar a ser o
      // rótulo traduzido, este conjunto continua igual e o da página esvazia.
      const expected = [
        ...new Set(
          states
            .filter((s) => s.activeCount > 0)
            .map((s) => hubs[`${getCountryDisplayName(s.country)}|${s.state}`])
            .filter((href): href is string => Boolean(href))
        ),
      ].sort();

      expect(
        expected.length,
        "controle: o snapshot de rotas precisa ter hub de estado para este idioma"
      ).toBeGreaterThan(0);

      await page.goto(`/${locale}/coverage`, { waitUntil: "domcontentloaded" });
      const rendered = [
        ...new Set(
          await page
            .locator('[data-block="coverage-list"] a[href*="/tours/"]')
            .evaluateAll((nodes) =>
              nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href") ?? "")
            )
        ),
      ].sort();

      expect(rendered, `links do hub de roteiros em /${locale}/coverage`).toEqual(expected);

      // E a outra metade da mesma frase: o país acima desses links está escrito
      // na língua da página enquanto a chave deles segue em inglês.
      const list = await page.locator('[data-block="coverage-list"]').innerText();
      expect(list).toContain(localizedCountryLabel("Brazil", locale));
    });
  }
});
