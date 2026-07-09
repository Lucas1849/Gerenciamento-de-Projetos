# Plano de ação — Fase 15 (refinos de design pós-Fase 14: ícones de prazo/data, cronograma com bloco em barras individuais, correção de estrutura do card de projeto)

Registro do planejamento dos refinos visuais pedidos após a entrega da Fase 14 ([plano-fase-14.md](plano-fase-14.md)). Origem: sessão de design em que o responsável avaliou mockups ("Claude Design") de três ajustes e aprovou a direção de cada um em **09/07/2026**.

> **Fase executada em 09/07/2026 sob comando direto do responsável**, na ordem sugerida 15a → 15c → 15b. O ADR-017 em [../arquitetura/decisoes.md](../arquitetura/decisoes.md) está "implementado". Notas: ícones em `Icones.jsx` (prazo/data + hexágono/cadeado do indicador); no cronograma cada membro do bloco vira item próprio (`grupoBloco`) e a linha `.crono-grupo` ("Bloco N · entrega conjunta") entra após o último membro; verificado no browser que arrastar **um** membro move as barras-irmãs e o indicador (propagação ADR-009/Fase 12) e que setas internas ao bloco seguem suprimidas; `lint`/`build` limpos.

| Sub-fase | Entrega | Status |
|---|---|---|
| 15a | Ícones SVG de prazo (cronômetro) e data (calendário-período) no lugar dos emoji `⏳`/`📅` | ✅ Entregue (09/07/2026) |
| 15b | Cronograma: bloco em **barras individuais** + indicador de "entrega conjunta" embaixo | ✅ Entregue (09/07/2026) |
| 15c | Correção de **estrutura/espaçamento** do card de projeto (mantendo o card de hoje, sem redesign) | ✅ Entregue (09/07/2026) |

**Sem dependência rígida entre as três.** Ordem sugerida (risco crescente): **15a → 15c → 15b**. A 15b é a de maior peso (mexe na montagem das barras e no mapa de setas do cronograma).

## Natureza da fase (o que ela NÃO é)

- **Refino visual/CSS + renderização no frontend.** Não toca backend, schema, modelo de dados nem comportamento persistido. O bloco de entrega continua sendo a **chave compartilhada** com prazo/data redundantes (ADR-009); a propagação de datas do `PATCH` (Fase 12) fica intacta. ⇒ o fluxo destrutivo do `.db` (ADR-001) **não é acionado**.
- **O card de projeto NÃO é redesenhado.** Decisão explícita do responsável: manter exatamente os elementos de hoje (faixa da fase, título, chip de serviço, bloco do gerente, consultores, TAP, Excluir, setas ← →) e apenas **consertar a estrutura de espaçamento** — hoje as informações ficam espremidas umas sobre as outras.
- **Sem dependências novas.** Ícones são SVG inline no traço da marca; nenhum pacote novo.

## Diagnóstico verificado no código (09/07/2026)

- **Ícones de prazo/data são emoji literais**, não SVG nem lucide:
  - `⏳` (prazo): [`KanbanEtapas.jsx:153`](../../frontend/src/components/KanbanEtapas.jsx) (card de etapa), `:203` (card de bloco), e [`ModalBloco.jsx:51`](../../frontend/src/components/ModalBloco.jsx).
  - `📅` (data): `KanbanEtapas.jsx:159`, `:208`, e `ModalBloco.jsx:52`.
  - (Fora do pedido, mas registrado: `📦` de bloco em `KanbanEtapas.jsx:189`, `etapasUtils.js:77`, `TabelaEtapas.jsx:124`; `⬡`/`🔒` no cronograma — os dois últimos são absorvidos pela 15b. Não trocar `📦` nesta fase salvo pedido.)
- **Cronograma colapsa o bloco numa barra única.** [`CronogramaEtapas.jsx:46-59`](../../frontend/src/components/CronogramaEtapas.jsx): `agruparCards()` devolve o bloco como **1 card**, virando **1 item/1 barra** (`⬡ Bloco N (X etapas)` + faixa listrada "ENTREGA"). O mapa `idParaBarra` associa **todos** os ids de membros à **mesma** barra, e as setas de dependência ignoram vínculos internos ao bloco (`deKey === paraKey`). **Ponto-chave:** membros de um bloco **compartilham `data_inicio` e `dias_uteis_esperados`** (ADR-009) — logo suas barras individuais ocupam o **mesmo intervalo**; a distinção vem do rótulo + do indicador de grupo.
- **Card de projeto espremido por espaçamento ad-hoc.** [`KanbanFases.jsx:52-130`](../../frontend/src/components/KanbanFases.jsx): cada seção recebe `marginBottom: var(--sp-12)` inline (sem ritmo vertical consistente); o footer TAP + Excluir usa `justify-content: space-between`. `.chip` ([`App.css:469`](../../frontend/src/App.css)) **não tem `white-space: nowrap`** → em coluna estreita o serviço ("Pesquisa de Mercado") e o TAP ("TAP: Assinado") **quebram em 2 linhas**, e o par TAP+Excluir se espreme. O `.kanban-card` tem `padding: 18px` e a faixa de 3px encosta no topo do título.

---

## Fase 15a — Ícones SVG de prazo e data

Substituir os emoji pelos dois ícones aprovados (opção **A + A** do mockup), desenhados no traço da marca (viewBox 24, `stroke-width 2`, `stroke-linecap/linejoin: round`, ~16–17px), usando **`stroke="currentColor"`** para herdar a cor da linha (prazo = `--color-brand-glow`; data = `--color-text-secondary`).

- **Ícone Prazo (cronômetro):** paths do mockup — círculo do relógio (`cx12 cy14 r7.5`), ponteiro (`M12 10.5V14l2.2 1.5`), botão superior (`M9 2.5h6` + `M12 2.5v3.2`). Comunica "duração/prazo" melhor que a ampulheta.
- **Ícone Data (calendário-período):** retângulo do calendário + linha do cabeçalho + duas hastes + uma **barrinha de intervalo** (`M7 14.5h4` + ponto em `15.5,14.5`) sugerindo o período `→`.
- **Como entregar:** criar dois componentes pequenos (ex.: `IconePrazo`/`IconeData`) ou um módulo de ícones compartilhado, alinhados verticalmente ao texto (`vertical-align: -3px` ou flex com `align-items:center`). Preferir componentizar para reuso.
- **Onde substituir:** `KanbanEtapas.jsx` (linhas do card de etapa **e** do card de bloco) e `ModalBloco.jsx`. Manter o texto ("Prazo: N dia(s) útil(eis)" / a data) inalterado.
- **Arquivos:** novos componentes de ícone; `KanbanEtapas.jsx`, `ModalBloco.jsx`. CSS mínimo (só alinhamento).

## Fase 15b — Cronograma: bloco em barras individuais + indicador de entrega conjunta

Trocar o bloco colapsado por **uma barra por etapa-membro** + um **indicador de grupo** logo abaixo, cobrindo o intervalo compartilhado. **Puramente de renderização** — o bloco no backend continua igual (chave + datas redundantes, ADR-009).

- **Montagem dos itens** (`CronogramaEtapas.jsx`, montagem de `items`): para um card de bloco, emitir **N itens** (um por membro), cada um com seu `nome` ("N. nome"), seu `etapaId` (o próprio id do membro) e o `inicio`/`fim`/`dias` **compartilhados** do bloco. Marcar cada item com o `grupoBloco = bloco_entrega` (para desenhar o indicador e agrupar visualmente). Remover o item colapsado `⬡ Bloco N` e a faixa "ENTREGA".
- **Arrastar/redimensionar continua consistente:** arrastar/redimensionar **qualquer** barra-membro chama `atualizarEtapa(id, …)`; o `PATCH` da Fase 12 **propaga** dias/data a todos os membros do bloco (ADR-009), então as barras-irmãs se movem juntas e o indicador reacompanha o intervalo. (Comportamento a confirmar no teste manual — é o mesmo mecanismo de propagação de hoje, só que disparado por qualquer membro.)
- **Indicador de "entrega em bloco"** (novo elemento): abaixo das barras-membro do grupo, um **colchete tracejado roxo** (`rgba(167,139,250,.45)`, cantos inferiores arredondados) posicionado pelas **mesmas colunas de grade** (colIni..colFim do intervalo compartilhado), com um **chip** "Bloco N · entrega conjunta" (ícone **hexágono** SVG `#A78BFA` + **cadeado** SVG `#8B7CF7`, substituindo o `🔒`). Fundo `#1B1B27`, borda `rgba(167,139,250,.4)`.
- **Mapa de setas (`idParaBarra`/`arestas`):** agora cada membro mapeia para a **própria** barra (keys distintas). **Manter a regra de não desenhar seta entre membros do mesmo bloco** (eles são uma entrega só) — verificar pela igualdade de `grupoBloco` em vez de `deKey === paraKey`. Dependências de/para etapas **fora** do bloco seguem desenhando normalmente.
- **CSS** (`App.css`): novas classes para o colchete e o chip do indicador; aposentar/repurposar `.crono-barra--bloco` (faixa listrada). Só tokens existentes.
- **Sem backend.**

## Fase 15c — Correção de estrutura/espaçamento do card de projeto (sem redesign)

Manter **todos** os elementos atuais; corrigir **como estão estruturados** para o card respirar (o problema do print: informação espremida, chips quebrando em 2 linhas).

- **Ritmo vertical consistente:** trocar os `marginBottom` inline seção-a-seção por um **espaçamento uniforme** — ex.: o corpo do card como `display:flex; flex-direction:column; gap: var(--sp-16)` (ou padronizar todas as seções em `--sp-16`), removendo as margens ad-hoc. Dar respiro entre título → serviço → gerente → consultores → footer.
- **Chips não quebram:** adicionar `white-space: nowrap` (escopo no card de projeto — ver risco 4) para "Pesquisa de Mercado" e "TAP: Assinado" ficarem numa linha só.
- **Footer TAP + Excluir:** garantir que os dois caibam sem se espremer — permitir `flex-wrap` (quebra para linha de baixo quando estreito) em vez de comprimir, mantendo o `space-between` quando há espaço.
- **Chip de serviço na própria linha** logo abaixo do título, com gap claro (hoje divide a linha do título com `flex-wrap` e fica colado).
- **Respiro no topo:** um pouco mais de espaço entre a faixa de 3px e o título.
- **Arquivos:** `KanbanFases.jsx` (estrutura do corpo do card / remoção das margens inline), `App.css` (regra de `white-space` escopada + eventual classe de ritmo vertical do card de projeto). Nenhum elemento novo, nenhuma remoção de conteúdo.

---

## Fora de escopo (registrado)

- **Redesenhar o card de projeto** — vetado pelo responsável nesta fase (manter o de hoje, só corrigir estrutura). A proposta "card mais limpo" do mockup fica arquivada.
- **Qualquer mudança de backend, schema, modelo ou comportamento persistido.** O bloco continua ADR-009; a propagação de datas continua a da Fase 12.
- **Trocar os emoji `📦` (bloco)** nos cards/tabela e demais emoji fora de `⏳`/`📅` — não pedido; `⬡`/`🔒` do cronograma são absorvidos pela 15b.
- **Variantes B dos ícones** (calendário-com-check / calendário simples) — descartadas; ficam como referência.

## Verificação por sub-fase (roda na execução)

- **Comum:** `npm run lint` e `npm run build` limpos; conferência visual contra o mockup aprovado; responsivo em 375 / 768 / 1024px. **Sem `pytest`** — nenhum backend é tocado.
- **15a:** os dois ícones aparecem no card de etapa, no card de bloco e no `ModalBloco`, herdando a cor da linha (prazo roxo, data cinza) e alinhados ao texto.
- **15b:** um bloco aparece como **N barras individuais** + o indicador "Bloco N · entrega conjunta" abaixo; arrastar/redimensionar **um** membro move o bloco todo (propagação ADR-009) e o indicador acompanha; **não** há seta de dependência entre membros do mesmo bloco; dependências de/para fora do bloco continuam desenhando.
- **15c:** em coluna estreita, serviço e TAP **não quebram** em 2 linhas; TAP + Excluir não se espremem; há respiro visível entre as seções; nenhum elemento sumiu.

## Riscos registrados

1. **Barras de bloco no mesmo intervalo (15b):** membros compartilham data (ADR-009) ⇒ as barras individuais ficam no **mesmo span** e podem parecer redundantes. Mitigação: rótulo por etapa + indicador de grupo claro (é justamente a leitura pedida pelo responsável).
2. **Mapa de setas com keys distintas (15b):** ao dar barra própria a cada membro, dependências **internas** ao bloco passariam a desenhar setas. Trocar o guard `deKey === paraKey` por "mesmo `grupoBloco`" para continuar suprimindo-as.
3. **Alinhamento dos ícones SVG (15a):** usar `currentColor` e alinhar verticalmente ao texto (o emoji hoje "senta" um pouco diferente); revisar em cada ponto de uso.
4. **`white-space: nowrap` global em `.chip` (15c):** afeta chips longos em outras telas. Preferir **escopar** no card de projeto (ex.: `.kanban-card .chip` ou classe própria) em vez de mudar `.chip` global.
5. **Regressão responsiva do card (15c):** o novo ritmo vertical precisa ser testado no drawer <768px e no icon-rail 768–1023px, além do desktop.
