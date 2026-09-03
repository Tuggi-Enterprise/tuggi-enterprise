import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { DIST_DIR, MOCK_SUPABASE_PORT } from "../../playwright.config";
// `LOCALES`, e não `routing.locales`: são a mesma lista (routing.ts é montado
// a partir dela), mas importar `routing` aqui arrasta `createNavigation` e com
// ele `next/navigation`, que não resolve fora do bundler do Next.
import { LOCALES } from "../../src/i18n/locales";
import { TUGGI_PARTNER_ID } from "../../src/lib/app-meta";

/**
 * #687 — as duas imagens de Open Graph que rasterizavam por requisição passam a
 * ser escritas no build.
 *
 * `next/og` responde `cache-control: public, max-age=0, must-revalidate`, então
 * cada prévia pedida por WhatsApp, Slack ou LinkedIn repetia Satori + resvg no
 * servidor. O que corta esse custo é a rota **existir como arquivo depois do
 * build** — e é exatamente isso que este arquivo afirma, lendo o
 * `prerender-manifest.json` que o `next build` do próprio `webServer` acabou de
 * escrever. Um 200 na URL não provaria nada: com `dynamicParams` no padrão, a
 * rota devolve 200 tanto pré-renderizada quanto gerada na hora.
 *
 * A distinção que o manifesto guarda é a que a tabela de rotas do build imprime
 * como `●` contra `ƒ`/`○`, e ela é frágil de um jeito silencioso: `/coverage`
 * declarava "Generated at build time (SSG)" no cabeçalho e era `ƒ` havia meses,
 * sem nada quebrar. **Rota de imagem de metadados não herda o
 * `generateStaticParams` do layout como uma página herda** — medido em
 * 2026-09-03: com `force-static` e sem parâmetros próprios ela vira `○`, e o
 * manifesto não guarda caminho nenhum.
 *
 * O fixture que faz as vezes da consulta ao banco é o dublê do Supabase
 * (`mock-supabase-server.mjs`), o mesmo que o build consultou — nenhum teste
 * toca o projeto de produção. Ele é interrogado aqui pela mesma query que
 * `listApprovedPartners()` monta, e não por uma lista de slugs copiada: o que
 * precisa ser provado é que **a resposta daquela função** entra nos parâmetros
 * gerados, e uma lista escrita à mão aqui provaria só a si mesma.
 */

type PrerenderManifest = { routes: Record<string, unknown> };

function prerenderedRoutes(): Set<string> {
  const file = path.join(process.cwd(), DIST_DIR, "prerender-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as PrerenderManifest;
  return new Set(Object.keys(manifest.routes));
}

/** A mesma pergunta que `listApprovedPartners()` faz, contra o mesmo dublê. */
async function approvedSlugs(baseURL: string): Promise<string[]> {
  const query = new URLSearchParams({
    select: "slug,updated_at",
    status: "eq.approved",
    slug: "not.is.null",
    id: `neq.${TUGGI_PARTNER_ID}`,
  });
  const res = await fetch(`${baseURL}/rest/v1/clients?${query}`);
  expect(res.ok, "o dublê do Supabase não respondeu à enumeração de parceiros").toBe(true);
  const rows = (await res.json()) as Array<{ slug: string }>;
  return rows.map((row) => row.slug);
}

const MOCK_BASE = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

test.describe("#687 — os share cards são escritos no build, não por requisição", () => {
  test("/d/[slug]/opengraph-image pré-renderiza cada parceiro aprovado × cada locale", async () => {
    const slugs = await approvedSlugs(MOCK_BASE);
    // Sem isto o teste passaria vazio no dia em que a enumeração devolvesse [],
    // que é justamente o modo de falha silencioso que ela tem por desenho.
    expect(slugs.length, "o fixture precisa de pelo menos um parceiro aprovado").toBeGreaterThan(0);

    const routes = prerenderedRoutes();
    const missing = LOCALES.flatMap((locale) =>
      slugs
        .map((slug) => `/${locale}/d/${slug}/opengraph-image`)
        .filter((route) => !routes.has(route)),
    );
    expect(missing, "parceiro aprovado sem card escrito no build").toEqual([]);
  });

  test("parceiro que não está aprovado não entra nos parâmetros gerados", async () => {
    // O dublê tem uma linha `pending` de propósito. `/d/<slug>` dela até resolve
    // (a busca por slug ignora o status), então o que separa as duas é só o
    // filtro da enumeração — e um filtro que parou de filtrar não quebra nada
    // sozinho: apenas publica no build a página de quem ainda está em análise.
    const approved = new Set(await approvedSlugs(MOCK_BASE));
    expect(approved.has("e2e-nao-aprovado")).toBe(false);

    const routes = prerenderedRoutes();
    for (const locale of LOCALES) {
      expect(routes.has(`/${locale}/d/e2e-nao-aprovado/opengraph-image`)).toBe(false);
    }
  });

  test("/coverage/opengraph-image pré-renderiza os quatro locales", async () => {
    const routes = prerenderedRoutes();
    const missing = LOCALES
      .map((locale) => `/${locale}/coverage/opengraph-image`)
      .filter((route) => !routes.has(route));
    expect(missing, "locale de /coverage sem card escrito no build").toEqual([]);
  });
});
