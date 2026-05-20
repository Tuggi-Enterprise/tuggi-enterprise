# Prompt para Claude Code — Reestruturar preço da /drive (B2C)

Cole a partir de "---" no Claude Code, dentro do repo `tuggi-enterprise`.

---

## Contexto

Os preços no bloco `DrivePricing` da página `/drive` estão hardcoded por idioma nos arquivos de mensagem e estão errados/desatualizados. O problema é estrutural: preço de app é por território (a loja mostra o valor local correto automaticamente), e cravar um valor por idioma não representa isso e desincroniza toda vez que mudamos preço na loja.

A correção NÃO é trocar os números — é reestruturar a seção para o playbook de app freemium: liderar com o grátis, comunicar o modelo (passes + anual) e o diferencial (passe sem renovação automática), e deixar a loja ser a fonte de verdade do preço exato. Isso bate com o comportamento real do usuário (baixa primeiro, decide preço no paywall) e nunca mais fica desatualizado.

Sobre o free tier, ao contrário do preço, **seja específico**: o modelo real é um trial de 24h ilimitado ativado no download (sem cartão) e, depois disso, até 5 histórias grátis por dia, sempre. Isso é uma regra global única — não muda por território nem com frequência — e é o gancho de conversão mais forte do produto. Então aparece explícito, não vago.

## Antes de começar

Leia o componente `DrivePricing` e as chaves `Drive.Pricing` (ou equivalente) nos 4 arquivos de mensagem (`en.json`, `es.json`, `pt-br.json`, `pt-pt.json`). Confirme os nomes reais das chaves antes de editar.

## Escopo — FAÇA (apenas na /drive / DrivePricing, B2C)

1. **Remova os valores monetários cravados.** Apague (ou esvazie) as chaves de preço numérico por tier — `pass1Price`, `pass1PerDay`, `pass2Price`, `pass2PerDay`, `pass3Price`, `pass3PerDay` (ou como estiverem nomeadas) — nos 4 idiomas. O componente não deve mais renderizar valor em moeda fixa.

2. **Mantenha a estrutura de 3 cards** (7 dias / 30 dias / anual) e os textos que comunicam o modelo e o diferencial — `passXTitle`, `passXDesc` e principalmente `passXRenewal` (que já diz "Pagamento único. Sem renovação automática" nos passes e "Assinatura anual. Cancele quando quiser" no anual). Esse diferencial anti-assinatura é ponto de conversão; mantenha visível.

3. **Adicione um destaque de grátis** liderando a seção, comunicando o modelo de gratuidade real (24h ilimitado ao baixar, sem cartão + até 5 histórias grátis por dia depois), e substitua o preço por enquadramento qualitativo + nota de loja. Use estes textos (localizados, não traduzidos literalmente):

**en.json**
- Free lead (destaque, topo da seção): `24h of unlimited audio free on download — no card. Then up to 5 free stories every day.`
- Best-value/annual price line: `From a few cents a day`
- Store note (uma vez, abaixo dos cards): `You'll see your exact local price in the App Store or Google Play.`

**es.json**
- Free lead: `24 h de audio ilimitado gratis al descargar — sin tarjeta. Después, hasta 5 historias gratis al día.`
- Price line: `Desde unos céntimos al día`
- Store note: `Verás tu precio local exacto en la App Store o Google Play.`

**pt-br.json**
- Free lead: `24h de áudio ilimitado grátis ao baixar — sem cartão. Depois, até 5 histórias grátis por dia.`
- Price line: `A partir de alguns centavos por dia`
- Store note: `Você verá seu preço local exato na App Store ou Google Play.`

**pt-pt.json**
- Free lead: `24h de áudio ilimitado grátis ao descarregar — sem cartão. Depois, até 5 histórias grátis por dia.`
- Price line: `A partir de cêntimos por dia`
- Store note: `Verá o seu preço local exato na App Store ou Google Play.`

4. **Ajuste o componente `DrivePricing`** para renderizar: o destaque do grátis no topo, bem visível — o trial de 24h ilimitado sem cartão + as 5 histórias/dia depois é o maior gancho de conversão da seção, então merece peso visual; os 3 cards com título/descrição/renovação; "a partir de alguns centavos por dia" no card de melhor valor (anual); e a nota de loja única abaixo. CTA dos cards aponta para a loja (App Store / Google Play), não para uma compra no site.

## Escopo — NÃO faça

- NÃO toque no pricing das páginas B2B (`enterprise/fleets`, `enterprise/city-os`). Comprador B2B avalia preço; lá o preço exato e detalhado fica como está.
- NÃO adicione nova lógica de preço por território/moeda no site. A loja é a fonte de verdade.
- NÃO mexa em nada fora do bloco de preço B2C da /drive.

## Verificação

1. Build + typecheck limpos.
2. A /drive nos 4 idiomas mostra: o destaque do grátis no topo (trial de 24h ilimitado sem cartão + 5 histórias/dia depois), 3 cards com o diferencial de "sem renovação automática" nos passes, "a partir de alguns centavos por dia" no anual, e a nota de preço local na loja — sem nenhum valor em moeda cravado.
3. Confirme no resumo que nenhuma chave de preço numérico sobrou nos 4 message files do bloco B2C.

## Entrega

Commit único: `pricing: restructure B2C drive pricing to free-led + store source of truth`. Resumo das chaves removidas e adicionadas por arquivo.
