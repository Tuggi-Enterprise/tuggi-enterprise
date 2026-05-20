# Prompt para Claude Code — Correções de SEO técnico no site tuggi-enterprise

Cole o conteúdo abaixo (a partir de "---") no Claude Code, dentro do repositório `tuggi-enterprise`.

---

## Contexto

Este é o site institucional do TUGGI (Next.js App Router + next-intl, server-side). Acabamos de otimizar o ASO nas lojas e validamos, com dados reais de busca, os termos de alta intenção da nossa categoria: **"self-guided tour", "audio tour", "audio travel guide", "sightseeing"**. O site hoje NÃO usa esses termos e tem alguns defeitos técnicos de SEO. Sua tarefa é corrigir isso. Foque só nos itens listados.

## Antes de começar

1. Leia os arquivos reais antes de editar — as descrições abaixo vêm de um snapshot e podem estar levemente desatualizadas. Confirme o estado atual de cada arquivo.
2. Identifique o gerenciador de pacotes do projeto (npm/pnpm/yarn) e use o comando de build correto na verificação.
3. Confirme em `src/i18n/routing.ts` quais são os locales suportados e a configuração de `localePrefix` (provavelmente "as-needed", com `en` sem prefixo na raiz). Isso é necessário para a Tarefa 4.

## Escopo — FAÇA apenas isto

### Tarefa 1 — Reposicionar a home para os termos de busca validados (4 idiomas)

Os locales atuais do site são `en`, `es`, `pt-br`, `pt-pt`. Atualize os textos da home nos 4 arquivos de mensagem (`src/messages/en.json`, `es.json`, `pt-br.json`, `pt-pt.json`).

Hoje a home lidera com "The Cultural Copilot for Drivers" — termo de marca sem volume de busca. Substitua o **title tag** e a **meta description** (namespace `Metadata`) e o **H1/subtítulo** do hero (namespace `Home.Hero`) pelos textos abaixo. O "cultural copilot" continua vivo, mas no subtítulo, não como âncora de busca.

**en.json**
- `Metadata.homeTitle`: `TUGGI | Self-Guided Audio Travel Guide`
- `Metadata.homeDescription`: `Self-guided audio tours that play automatically as you travel. Hands-free stories about the places around you — by car, on foot, or by bike. Offline, in 8 languages.`
- `Home.Hero.title`: `Your self-guided audio travel guide`
- `Home.Hero.subtitle`: `The cultural copilot for the road. Audio stories trigger automatically as you travel — zero screens, eyes on the scenery.`

**es.json**
- `Metadata.homeTitle`: `TUGGI | Audioguía de Viaje Autoguiada`
- `Metadata.homeDescription`: `Audioguías de viaje que se reproducen solas mientras viajas. Historias manos libres sobre los lugares a tu alrededor — en coche, a pie o en bici. Sin conexión, en 8 idiomas.`
- `Home.Hero.title`: `Tu audioguía de viaje autoguiada`
- `Home.Hero.subtitle`: `El copiloto cultural para la carretera. Las historias en audio se activan solas mientras viajas — sin pantallas, la vista en el paisaje.`

**pt-br.json**
- `Metadata.homeTitle`: `TUGGI | Guia de Viagem em Áudio Autoguiado`
- `Metadata.homeDescription`: `Guias de viagem em áudio que tocam sozinhos enquanto você viaja. Histórias mãos-livres sobre os lugares ao seu redor — de carro, a pé ou de bike. Offline, em 8 idiomas.`
- `Home.Hero.title`: `Seu guia de viagem em áudio autoguiado`
- `Home.Hero.subtitle`: `O copiloto cultural da estrada. As histórias em áudio tocam sozinhas enquanto você viaja — zero telas, olhos na paisagem.`

**pt-pt.json**
- `Metadata.homeTitle`: `TUGGI | Guia de Viagem em Áudio Autoguiado`
- `Metadata.homeDescription`: `Guias de viagem em áudio que tocam sozinhos enquanto conduz. Histórias mãos-livres sobre os lugares à sua volta — de carro, a pé ou de bicicleta. Offline, em 8 idiomas.`
- `Home.Hero.title`: `O seu guia de viagem em áudio autoguiado`
- `Home.Hero.subtitle`: `O copiloto cultural da estrada. As histórias em áudio tocam sozinhas enquanto conduz — zero ecrãs, olhos na paisagem.`

Não altere nenhuma outra chave dos arquivos de mensagem. Verifique se o H1 visível do hero realmente lê de `Home.Hero.title` em `src/components/blocks/HeroSection.tsx`; se ele estiver hardcoded, ajuste para usar a tradução.

### Tarefa 2 — Remover structured data falso

Em `src/components/global/JsonLd.tsx`, o schema `SoftwareApplication` tem `aggregateRating` com `ratingValue: "4.8"` e `ratingCount: "500"` hardcoded. Esses números não são reais (estamos pre-revenue). Isso é review markup fabricado e pode gerar ação manual do Google.

- Remova completamente o objeto `aggregateRating`.
- Mantenha os demais campos do `SoftwareApplication`, `Organization` e `WebSite`.
- O bloco `offers` com `price: "0.00"` pode ficar (existe tier gratuito real), mas não adicione preço de assinatura inventado.

### Tarefa 3 — Padronizar hreflang / canonical / robots / OG em todas as páginas

Hoje as páginas estão inconsistentes: `page.tsx` da home e de `/drive` usam locale minúsculo + `x-default`; `enterprise/fleets`, `enterprise/city-os` e `purpose` usam `pt-BR`/`pt-PT` (caixa mista) e SEM `x-default`; e `technology`, `contact` e as páginas de `trust-center/*` só definem `title` e `description` (sem canonical, sem alternates, sem robots, sem OG).

1. Crie um helper único em `src/lib/seo.ts` (ex.: `buildAlternates(path: string)`) que gere o objeto `alternates` (canonical + `languages` com TODOS os locales de `routing.ts` em minúsculo + `x-default`) a partir de uma única fonte de verdade. Use a mesma forma de URL em todas as páginas (relativa, apoiada no `metadataBase`).
2. Garanta que `metadataBase` esteja definido uma vez (idealmente no `layout.tsx` raiz) para não repetir em cada página.
3. Refatore TODAS as `generateMetadata` das páginas para usar esse helper, garantindo em cada uma: `canonical`, `alternates.languages` (minúsculo + `x-default`), `robots: { index: true, follow: true }`, e `openGraph`/`twitter` consistentes.
4. Adicione canonical + alternates + robots às páginas que hoje não têm: `technology`, `contact`, `trust-center/*` (security-sla, terms-of-use, privacy, data-deletion, accessibility, e o que mais existir).

### Tarefa 4 — Corrigir o canonical da home (risco de duplicação `/` vs `/en`)

A home em `en` é servida na raiz (`https://tuggi.app/`), mas o canonical é setado como `/en`. Se `/` e `/en` servem o mesmo conteúdo, é conteúdo duplicado.

- Com base na config de `localePrefix` que você confirmou em `routing.ts`, faça o canonical de cada locale apontar para a URL realmente servida: `en` → `/` (raiz), demais → `/{locale}`.
- Confira o `middleware.ts`: se `/` não redireciona nem reescreve para `/en`, defina canonicais consistentes; se redireciona, garanta coerência. O objetivo é: uma única URL canônica por locale, sem duplicação.

## Escopo — NÃO faça

- NÃO adicione novos idiomas (it, de, fr) nem traduza páginas. Isso é uma tarefa separada e exige conteúdo que ainda não temos.
- NÃO crie páginas programáticas de cidade/POI nem blog. Decisão estratégica separada.
- NÃO redesenhe componentes, NÃO mude estilos, NÃO mexa em conteúdo fora das chaves listadas na Tarefa 1.
- NÃO toque em código de backend, migrations, scripts de OSM ou qualquer coisa fora de SEO/metadata.

## Verificação antes de finalizar

1. Rode o build do projeto e o typecheck — não pode haver erro.
2. Confirme que o `<head>` gerado de pelo menos uma página de cada tipo (home, drive, enterprise, trust-center) tem: `<link rel="canonical">` correto, tags `hreflang` para todos os locales + `x-default`, e `robots`.
3. Confirme que o JSON-LD ainda é válido e que `aggregateRating` sumiu.
4. Confirme que a home renderiza o novo H1 e a nova title nos 4 idiomas.

## Entrega

Faça commits pequenos e separados por tarefa (ex.: `seo: reposition home metadata`, `seo: remove fake rating schema`, `seo: standardize hreflang/canonical`, `seo: fix home canonical`). Ao final, liste em resumo o que mudou em cada arquivo.
