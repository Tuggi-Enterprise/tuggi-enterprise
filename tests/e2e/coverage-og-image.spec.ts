import { test, expect } from "@playwright/test";

/**
 * #221 — `BR-COMUNICACAO-002` item 5 e o caso de borda "a linha entre afirmação
 * e listagem é esta, e ela é testável".
 *
 * O painel de ranking do share card de `/coverage` imprimia `activeCount` por
 * país, somado de `coverage-snapshot.json` — congelado em 2026-07-13, contado
 * por um limiar de renderização e superdeclarando o acervo em 244.120 pontos.
 * Imagem de OG é a superfície que a regra nomeia por escrito; o painel passou a
 * listar nomes de país sem contagem ao lado, que é o que o item 5 permite.
 *
 * **O guarda de código-fonte é do `qa`** e mora em
 * `tests/e2e/snapshot-affirmation-boundary.spec.ts`: ele varre o arquivo com o
 * compilador do TypeScript e reprova qualquer acesso a campo numérico do
 * snapshot. Duplicá-lo aqui não provaria nada de novo — a dispensa que ele
 * carregava para este card saiu junto com esta correção.
 *
 * O que este arquivo cobre é o que a varredura de fonte não vê: **o artefato**.
 * Tirar o número mudou a árvore que o Satori renderiza, e um filho de flex sem
 * `display` declarado vira 500 na geração da imagem — a página continua no ar,
 * o link compartilhado é que fica sem prévia, e nenhum teste de fonte acende.
 */

const LOCALES = ["pt", "en", "es", "it"] as const;

/** O PNG assinado: sem isto, um 200 de página de erro passaria como imagem. */
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test.describe("#221 — o share card de /coverage é gerado, e sem número do snapshot", () => {
  for (const locale of LOCALES) {
    test(`BR-COMUNICACAO-002 item 5: /${locale}/coverage publica o card que ela gera`, async ({
      page,
      request,
    }) => {
      await page.goto(`/${locale}/coverage`, { waitUntil: "domcontentloaded" });

      // A imagem que a página anuncia é a deste arquivo, e não a genérica da
      // marca: `buildOpenGraph` sempre define `images`, o que suprime a
      // convenção de arquivo do App Router, então a rota só é publicada porque
      // `page.tsx` a nomeia. Se esse fio se romper, o card sai errado sem erro.
      const announced = await page
        .locator('meta[property="og:image"]')
        .first()
        .getAttribute("content");
      expect(announced, `og:image de /${locale}/coverage`).toContain(
        `/${locale}/coverage/opengraph-image`,
      );

      const response = await request.get(`/${locale}/coverage/opengraph-image`);
      expect(response.status(), `geração do share card de /${locale}/coverage`).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");

      const body = await response.body();
      expect(body.subarray(0, 8), "o corpo devolvido não é um PNG").toEqual(PNG_MAGIC);
      // 1200×630 com logotipo e sete linhas de texto não cabe em 5 KB; um
      // fallback vazio caberia.
      expect(body.byteLength).toBeGreaterThan(5_000);
    });
  }
});
