# Prompt para Claude Code — Lote 2 de SEO/consistência no site tuggi-enterprise

Cole a partir de "---" no Claude Code, dentro do repo `tuggi-enterprise`.

---

## Contexto

Já fizemos o lote 1 (reposicionamento da home, remoção de schema falso, padronização de hreflang/canonical via `src/lib/seo.ts`, fix do canonical da home). Agora vamos alinhar a página de consumo (`/drive`) e a `/download` com o posicionamento que travamos nas lojas de app, adicionar FAQ, trazer a história de acessibilidade pro consumidor e corrigir o sitemap.

Posicionamento travado nas lojas (use estes termos, são validados por busca real): **self-guided audio tour, audio travel guide, sightseeing, hands-free, offline, closed captions, multilingual (8+ languages)**. Locales atuais do site: `en`, `es`, `pt-br`, `pt-pt`.

## Antes de começar

Leia os arquivos reais antes de editar (as descrições podem estar levemente desatualizadas). Reaproveite o helper `src/lib/seo.ts` onde fizer sentido. Identifique o gerenciador de pacotes e use o comando de build correto na verificação.

## Escopo — FAÇA

### Tarefa 1 — Alinhar metadata e copy da `/drive` ao posicionamento das lojas

Atualize as chaves de metadata da `/drive` (namespace `Metadata`) nos 4 arquivos de mensagem:

**en.json**
- `Metadata.driveTitle`: `TUGGI | Self-Guided Audio Tours, Offline`
- `Metadata.driveDescription`: `Download TUGGI: self-guided audio tours that play automatically as you travel — by car, on foot, or by bike. Hands-free, offline, closed captions, 8+ languages. Free to start.`

**es.json**
- `Metadata.driveTitle`: `TUGGI | Audioguías de Viaje Autoguiadas, Sin Conexión`
- `Metadata.driveDescription`: `Descarga TUGGI: audioguías de viaje que se reproducen solas mientras viajas — en coche, a pie o en bici. Manos libres, sin conexión, subtítulos, en más de 8 idiomas. Gratis para empezar.`

**pt-br.json**
- `Metadata.driveTitle`: `TUGGI | Guias de Viagem em Áudio Autoguiados, Offline`
- `Metadata.driveDescription`: `Baixe o TUGGI: guias de viagem em áudio que tocam sozinhos enquanto você viaja — de carro, a pé ou de bike. Mãos-livres, offline, legendas, em mais de 8 idiomas. Grátis para começar.`

**pt-pt.json**
- `Metadata.driveTitle`: `TUGGI | Guias de Viagem em Áudio Autoguiados, Offline`
- `Metadata.driveDescription`: `Descarregue o TUGGI: guias de viagem em áudio que tocam sozinhos enquanto viaja — de carro, a pé ou de bicicleta. Mãos-livres, offline, legendas, em mais de 8 idiomas. Grátis para começar.`

Depois, nos blocos da `/drive` (`DriveHero`, `DriveFeatures`, `DriveSamples` e suas chaves nos messages), substitua a linguagem de marca sem volume de busca ("navigate like a pro", "cultural copilot", "contextual discovery") por termos validados, mantendo o sentido: **self-guided audio tour, audio guide, sightseeing, hands-free, offline, closed captions, 8+ languages, road trip, walking tour**. Não invente features; só realinhe vocabulário ao que o app realmente faz e ao que as lojas dizem. Mantenha o tom, troque os termos.

### Tarefa 2 — Adicionar FAQ + FAQPage schema na `/drive`

Crie um bloco de FAQ na `/drive` (componente novo `DriveFAQ` se necessário) com as perguntas abaixo, e adicione o JSON-LD `FAQPage` correspondente (pode estender o padrão de `src/components/global/JsonLd.tsx`). Conteúdo em inglês abaixo; **localize (não traduza literalmente)** para es, pt-br e pt-pt usando os termos de busca de cada mercado, mesma lógica do resto do site.

Perguntas (en):
1. **Is TUGGI free?** Yes. Start free with daily stories. To listen without limits, unlock a Travel Pass (7-day or 30-day, one-time payment) or the annual plan.
2. **Does TUGGI work offline?** Yes. Download a route in advance and listen with no signal — no roaming charges.
3. **How is TUGGI different from Google Maps or a GPS?** TUGGI isn't a navigation app. It runs alongside your navigation and music and plays self-guided audio stories about the places you pass — hands-free, no screen.
4. **What languages does TUGGI support?** Audio in 8+ languages, with synchronized closed captions so deaf and hard-of-hearing travelers can follow every story.
5. **Can I use TUGGI walking or cycling?** Yes — road trips, walking tours, cycling, and family travel all work.
6. **Do I have to look at my phone?** No. The audio triggers automatically by location, hands-free and screen-off.

Nota honesta para você (não para o código): rich result de FAQPage no Google é hoje restrito a sites de governo/saúde, então não espere o dropdown no SERP. O valor é captura de long-tail e presença em motores de resposta de IA. Implemente o schema mesmo assim (custo zero, upside em IA).

### Tarefa 3 — Trazer a história de acessibilidade para o consumidor

A acessibilidade hoje só aparece no pitch B2G (City OS). Adicione um bloco curto na `/drive` (ou dentro de `DriveFeatures`) com a mesma mensagem das lojas, em linguagem de consumidor:

> en: "Built for everyone. Synchronized closed captions let deaf and hard-of-hearing travelers follow every story, and the audio-first experience supports travelers with low vision."

Localize para es, pt-br, pt-pt. Não use o jargão B2G ("DTI score", "WCAG") aqui — é página de consumidor.

### Tarefa 4 — Corrigir o sitemap

Em `src/app/sitemap.ts`:
1. **Inglês na raiz, não `/en`.** Hoje o sitemap gera `${baseUrl}/en${route}`, mas o canonical do inglês agora é a raiz (`/`). Corrija para que as URLs em inglês NÃO tenham prefixo `/en` (ex.: home en = `${baseUrl}/`, drive en = `${baseUrl}/drive`), batendo com o canonical. Mantenha prefixo nos demais (`/es`, `/pt-br`, `/pt-pt`).
2. **Adicione anotações de hreflang por URL.** Use o campo `alternates.languages` de `MetadataRoute.Sitemap` em cada entrada, listando os 4 locales (inglês na raiz/relativo + `x-default`, demais com prefixo). Reaproveite a lógica de `src/lib/seo.ts` como fonte única de verdade da estrutura de URL, para sitemap e metadata nunca divergirem.
3. Considere incluir a página `trust-center/accessibility` na lista de rotas (é conteúdo público útil). Deixe as demais legais de fora.

### Tarefa 5 — Alinhar metadata da `/download`

A `/download` ainda usa "Cultural Copilot" (`Download.metaTitle`/`metaDesc`). Realinhe ao posicionamento atual nos 4 idiomas (ex. en: title `Download TUGGI — Self-Guided Audio Travel Guide`, desc curta com self-guided/offline/8+ languages). Nota: a `/download` é página utilitária de redirect/conversão — se você quiser, marque-a como `robots: { index: false }` para ela não competir com a `/drive` no índice. Deixe essa decisão sinalizada no resumo final para o humano decidir; não force o noindex sem confirmar.

## Escopo — NÃO faça

- NÃO adicione novos idiomas (it, de, fr). Tarefa separada que mexe em routing e exige decisão de fallback das páginas B2G.
- NÃO crie páginas programáticas de cidade/POI nem blog.
- NÃO traduza as páginas enterprise (city-os, fleets, technology, purpose).
- NÃO mexa em backend, migrations ou qualquer coisa fora de SEO/conteúdo de marketing.

## Verificação antes de finalizar

1. Build + typecheck limpos.
2. Confirme que o sitemap gerado: (a) tem inglês na raiz sem `/en`; (b) tem `<xhtml:link rel="alternate" hreflang="...">` em cada URL, incluindo `x-default`.
3. Confirme que `/drive` renderiza o novo title, o bloco de FAQ com JSON-LD `FAQPage` válido, e o bloco de acessibilidade, nos 4 idiomas.
4. **Reporte no resumo final**, para o humano verificar fora do código:
   - Os preços atuais que estão nos messages (`DrivePricing`) nos 4 idiomas, para eu comparar com o que está configurado nas lojas.
   - Se as imagens OG referenciadas (`/images/og-image-*.jpg`) existem em `public/` e estão em 1200x630; e se algum `alt`/título ainda diz "Cultural Copilot".
   - Se há redirect www → não-www configurado (canonical domain = `tuggi.app`); se não houver no código nem no hosting, sinalize.

## Entrega

Commits pequenos por tarefa (`seo: align drive metadata`, `seo: add drive FAQ + schema`, `seo: consumer accessibility block`, `seo: fix sitemap hreflang + en root`, `seo: align download metadata`). Resumo final por arquivo + os três itens de verificação acima.
