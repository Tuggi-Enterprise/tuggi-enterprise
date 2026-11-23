# tuggi-enterprise: site institucional (Next.js na Cloudflare, via OpenNext)

Vale junto com o `CLAUDE.md` do workspace. Aqui fica só o que é deste repo.

## Teste do card

- Não há suíte de unidade. A prova é `npm run lint` e o e2e do que o card toca: `npx playwright test <arquivo>`.
- Superfície visível fecha com captura em 390 e 1440 px da página publicada.
- Teste e commit/push vão em chamadas separadas. O hook `block-teste-e-push-juntos.sh` barra os dois juntos.

## Publicar

- O site publica pelo Workers Builds da Cloudflare a cada push na main. Não rode nem peça `npm run deploy`.
- Prova: `gh api repos/Tuggi-Enterprise/tuggi-enterprise/commits/<sha>/check-runs` (check "Workers Builds") e depois
  o `curl` da página. O primeiro `curl` logo após o push pode pegar a versão antiga porque o build ainda corre.

## Armadilhas

- Texto do site mora em `src/messages/<idioma>.json`. O dono é o `copy`.
- Os `claude-code-prompt-*.md` da raiz são histórico, não instrução vigente.
