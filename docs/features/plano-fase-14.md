# Plano de ação — Fase 14 (redesign de identidade visual da área de Projetos)

Registro do planejamento do redesign visual aprovado pelo cliente, na sequência das Fases 12–13 ([plano-fases-12-13.md](plano-fases-12-13.md)). Origem: pacote de handoff de design **"Redesign de identidade visual do projeto"** (protótipo `Redesign Apoio Hub.dc.html` + `README.md` de especificação + screenshots), que substitui elementos hoje com cara de "padrão do HTML" por controles coesos com a identidade da marca, mantendo o roxo do design system e trazendo o monograma da Apoio como detalhe sutil.

> **Fase executada em 08/07/2026 sob comando direto do responsável.** O ADR-016 em [../arquitetura/decisoes.md](../arquitetura/decisoes.md) está com status "implementado". Notas de execução: `mono-light.png` em `frontend/public/`; marcas d'água por `background-position` com offset negativo (sem `overflow:hidden` — preservaria o corte do 🔗 arrastável); linha "HOJE" como borda-gradiente na célula do dia; checkbox como componente `Checkbox.jsx` (`.chk` em `App.css`), aplicado ao `tap_assinado` do formulário, ao toggle do TAP e ao "Gestão ativa"; verificação visual e dos gestos do Gantt (drag persistindo `data_inicio` nos dois sentidos) feita no browser, `lint`/`build` limpos.

| Sub-fase | Entrega | Status |
|---|---|---|
| 14a | Fundações: asset do monograma + utilitário de marca d'água + botão primário `1c` | ✅ Entregue (08/07/2026) |
| 14b | Controles atômicos: checkbox `4a` + lixeira `3c` + chip de remover membro `2b` | ✅ Entregue (08/07/2026) |
| 14c | Cards do Kanban `6a`/`6b` (átomos aplicados em contexto) | ✅ Entregue (08/07/2026) |
| 14d | Refino visual do cronograma `5d` sobre a engine interativa da Fase 13 | ✅ Entregue (08/07/2026) |

**Ordem obrigatória: 14a → 14b → 14c → 14d** (fundações → átomos → composições → cronograma). Cada composição (14c/14d) consome os átomos entregues antes; começar pelas fundações evita retrabalho.

## Natureza da fase (o que ela NÃO é)

- **Redesign puramente visual/CSS.** Não toca backend, schema, modelo de dados nem lógica de comportamento. O toggle do TAP, o drag/resize/dependência do cronograma, a remoção de membro etc. **mantêm a lógica atual** — só a aparência muda.
- **Sem mudança de schema ⇒ o fluxo destrutivo do `.db` (ADR-001) não é acionado.** Igual à camada visual da Fase 13: basta rodar o frontend.
- **Sem dependências novas.** Único asset adicionado: o monograma (decisão do responsável: usar o `mono-light.png` do pacote de handoff, não um SVG oficial). Fontes (Inter + Plus Jakarta Sans) já estão carregadas via Google Fonts no `frontend/index.html`.

## Diagnóstico verificado no código (08/07/2026)

- **Design tokens já batem quase 1:1 com a proposta.** `frontend/src/App.css` já define as mesmas cores de marca (`#6C5CE7`/`#5B5BD6`/`#8B7CF7`), superfícies, texto, `--fase-*`, raios, sombras (incluindo glow roxo) e easings (`--ease-out`, `--ease-spring`). **Não há troca de design system** — o redesign é refinamento de 7 componentes específicos + o monograma.
- **Fontes já carregadas.** `index.html` importa Inter (400–800) e Plus Jakarta Sans (500–800) via Google Fonts, e `App.css` já mapeia `--font-sans`/`--font-display`. Nenhum gap de tipografia.
- **Combinação aprovada pelo cliente** (as demais variações do `.dc.html` são histórico): botão `1c`, chip de remover `2b`, lixeira `3c`, checkbox `4a`, cronograma `5d`, cards `6a`/`6b`.

### Mapeamento componente aprovado → código existente

| Componente aprovado | Onde vive hoje |
|---|---|
| `1c` Botão primário (gradiente roxo + monograma embutido) | classe global `.btn-primary`; "Novo projeto" (`KanbanFases.jsx`), "Nova etapa"/"Iniciar →" (`CronogramaEtapas.jsx`, `KanbanEtapas.jsx`) |
| `2b` Chip de remover membro | equipe da etapa em `KanbanEtapas.jsx`, `EtapasProjeto.jsx`, `ModalEditarEtapa.jsx` (avatar via `AvatarIniciais.jsx`) |
| `3c` Lixeira "Excluir" | `Trash2` / `.btn-ghost-danger` em `App.jsx`, `KanbanFases.jsx`, `PaginaProjeto.jsx` |
| `4a` Checkbox desenhado | `tap_assinado` em `FormularioProjetos.jsx`; toggle TAP em `PaginaProjeto.jsx` |
| `5d` Cronograma Gantt | `CronogramaEtapas.jsx` (já interativo desde a Fase 13, ADR-015) |
| `6a`/`6b` Cards do Kanban | `KanbanEtapas.jsx` |

---

## Fase 14a — Fundações visuais e botão primário

- **Asset do monograma:** ingerir `mono-light.png` do pacote de handoff (decisão do responsável — não usar SVG oficial nesta fase) em `frontend/src/assets/` (ou `public/`). Marca d'água é **puramente decorativa** (`pointer-events:none`).
- **Utilitário `.marca-dagua`** em `App.css`: `<img>` decorativo posicionado `absolute`, `pointer-events:none`, com `opacity`/`width` variáveis — reusado dentro do botão `1c`, nos cards e no cronograma. O container recebe `overflow:hidden`.
- **Botão primário `1c`** (aplicado na classe global `.btn-primary`, propagando a todos os CTAs):
  - Fundo `linear-gradient(135deg,#5B5BD6,#6C5CE7 55%,#8B7CF7)`, texto Plus Jakarta 14/700 branco, ícone à esquerda (stroke 2.6).
  - `padding 13px 26px`, `border-radius 12px`, sem borda.
  - Sombra `0 6px 22px rgba(108,92,231,.45), inset 0 1px 0 rgba(255,255,255,.28)`.
  - Monograma embutido (`mono-light.png`, `right:-14px; bottom:-20px; width:78px; opacity:.16`).
  - **Hover:** `translateY(-2px) scale(1.02)`.
  - **Variante compacta "Nova etapa"** (no cronograma): `padding 9px 18px`, `radius 11px`, monograma menor (`60px, opacity .16`).
- **Arquivos:** `App.css` (classe `.marca-dagua` + refino de `.btn-primary` e variante), asset novo, e conferência dos pontos de uso (`KanbanFases.jsx`, `KanbanEtapas.jsx`, `CronogramaEtapas.jsx`).

## Fase 14b — Controles atômicos

- **Checkbox `4a`** (substitui o `type="checkbox"` nativo, **mantendo `input` real + label para acessibilidade e o `onChange` existente**):
  - Caixa 22×22, `radius 7px`, borda 1.5px. Off: borda `#3A3A4A`, fundo transparente. On: borda `#6C5CE7`, fundo `linear-gradient(135deg,#6C5CE7,#5B5BD6)`, halo `0 0 0 4px rgba(108,92,231,.15)`.
  - Check SVG `M5 13l4 4L19 7`, stroke branco 3.4, animação "desenhar" via `stroke-dasharray:24` → `stroke-dashoffset` 24→0 em `.3s ease`; caixa em `.2s var(--ease-out)`.
  - Pontos de uso: `FormularioProjetos.jsx` (`tap_assinado`) e o bloco de TAP em `PaginaProjeto.jsx`.
- **Lixeira `3c`** (substitui `.btn-ghost-danger`):
  - Normal: tonal vermelho (`bg rgba(239,68,68,.1)`, borda `rgba(239,68,68,.25)`, cor `#EF4444`, `radius 10px`, height 36px) com ícone + "Excluir".
  - Hover: preenchido `#EF4444`, texto branco, `box-shadow 0 4px 14px rgba(239,68,68,.4)`.
  - Onde o espaço for apertado, manter só o ícone (36×36) e revelar "Excluir" no hover (alvo mínimo 36px).
- **Chip de remover membro `2b`** (encapsulado no avatar/classe de chip; reusa `AvatarIniciais.jsx`):
  - Chip `bg #1B1B27`, borda `#2A2A3A`, `radius full`, com espaço à direita para o botão. Avatar 22–24px com gradiente por pessoa.
  - Botão `×` `absolute right:5px`, círculo ~19px, tonal vermelho, `opacity .55` — **discreto até o hover** (vira `#EF4444` sólido/branco; a borda do chip fica vermelha tonal). Clique remove o membro (handler atual inalterado).

## Fase 14c — Cards do Kanban (`6a`/`6b`)

Compõe os átomos de 14a/14b em contexto, em `KanbanEtapas.jsx` + `App.css`:
- Card interno `linear-gradient(180deg,#16161F,#13131C)`, borda `#2A2A3A`, `radius 14`, `padding 18`, `overflow:hidden`, marca d'água sutil (`opacity ~.035`).
- Cabeçalho de coluna: bolinha de status + rótulo da fase (Plus Jakarta 12/800, `letter-spacing .1em`) + contador em pill.
- `6a` (Não iniciada): título Plus Jakarta 17/700, ícones ghost editar/link (hover roxo tonal), linha de prazo (`#A78BFA` + ampulheta), datas (`#9B9AA8` + calendário), seção "EQUIPE DA ETAPA" com chips `2b`, seletor "Adicionar consultor…" + botão "+" tonal, e botão `1c` "Iniciar →" (largura total).
- `6b` (Kick-off): faixa superior de 3px na cor da fase; tag do serviço; card de Gerente destacado (avatar 38px + rótulo "GERENTE" roxo); linha de Consultores; badge "TAP: PENDENTE" (âmbar tonal) ao lado da lixeira `3c`; e o checkbox `4a` "TAP assinado pelo cliente" em bloco tonal.

## Fase 14d — Refino visual do cronograma (`5d`)

**Só camada visual** sobre a engine interativa entregue na Fase 13 (ADR-015) — drag/resize/conector de dependência **permanecem idênticos**. Em `CronogramaEtapas.jsx` + `App.css`:
- Container `linear-gradient(160deg,#0F0F1A,#0B0B12)`, borda `#2A2A3A`, `radius 18`, `padding 22`, marca d'água de fundo (`width:280px; opacity:.05`).
- Header: mês (Plus Jakarta 17/800) + ano (17/600 tonal), navegação `‹ ›` segmentada, botão "Hoje" roxo tonal, legenda de fases (quadradinhos 10px + rótulo) e botão `1c` "Nova etapa".
- Área do gráfico: fundo `rgba(16,16,25,.6)`, borda `#22222E`, `radius 14`; **altura de linha 64px**; grid `160px 1fr`.
- Barras 46px, `radius 12`, com nome (Inter 12/700) + período ("07 → 10 Jul · 3 dias", Inter 10.5/500) + avatar 26px + barra de progresso fina (3px) no rodapé. Gradientes por fase (kick-off azul, andamento amarelo com texto escuro, etc.).
- Linha "HOJE" vertical (2px, `linear-gradient(#8B7CF7,transparent)` + rótulo). Seta de dependência curva (Bézier SVG, stroke `#8B7CF7` 2.5px + glow). Bloco = faixa agrupadora com ícone hexágono, borda tracejada roxa e barra listrada "ENTREGA".
- Rodapé de ajuda (texto `#5D5C6B` 11px) descrevendo os gestos.

---

## Fora de escopo (registrado)

- **Qualquer mudança de comportamento, lógica, backend ou schema.** É redesign visual — a persistência, o cálculo de datas, os gestos do Gantt e as regras de negócio ficam intactos.
- **SVG oficial do monograma:** decisão do responsável de seguir com o `mono-light.png` do pacote nesta fase. Trocar por um SVG oficial no futuro é substituição de asset isolada.
- **Variações não aprovadas** do `.dc.html` (`1a/1b`, toggle `4c`, `5a/5b/5c`, etc.) — só referência histórica.
- **Navy da logo como cor primária:** vetado pelo cliente. O azul-marinho não vira cor de UI; o monograma é só acento/marca d'água.
- Itens `aria-disabled` da sidebar decorativa continuam desligados (roadmap).

## Verificação por sub-fase (roda na execução)

- **Comum a todas:** `npm run lint` e `npm run build` limpos; conferência visual contra os screenshots do pacote (`componentes-aprovados`, `cards-6a-6b`, `cronograma-5d`, `versao-aprovada`); estados de hover e animações (glow do botão, "desenhar" do check, hover do `×` do chip, hover da lixeira); responsivo em 375 / 768 / 1024px. **Sem `pytest` novo** — nenhum backend é tocado.
- **14a:** botão `1c` em todos os CTAs (busca visual por tela, já que a classe global muda de uma vez); monograma sutil e não intrusivo em fundo escuro.
- **14b:** checkbox alterna e persiste o `tap_assinado`/toggle TAP como antes; lixeira ainda dispara o `window.confirm` e a exclusão; `×` do chip ainda remove o membro.
- **14c:** os dois cards (`6a`/`6b`) batem com o print; nada quebra no drag do Kanban.
- **14d:** arrastar/redimensionar/ligar continuam funcionando pós-restyling; setas e barras alinhadas; scroll horizontal em 375px preservado.

## Riscos registrados

1. **Asset PNG em fundo escuro (14a):** `mono-light.png` é recorte de trabalho; validar nitidez/opacidade sobre `#0D0D15` para não ficar "sujo". (SVG oficial fica para evolução futura, por decisão do responsável.)
2. **Substituir controles nativos sem quebrar acessibilidade/estado (14b):** manter `input` real escondido + `<label>`, preservar `onChange`/`checked`; teclado e leitores de tela continuam funcionando.
3. **`.btn-primary` global (14a):** trocar a classe afeta **todos** os CTAs de uma vez — ótimo para consistência, mas exige varredura visual de cada tela para pegar regressões.
4. **Regressão responsiva (todas):** cards e cronograma precisam ser re-testados no drawer off-canvas (<768px) e no icon-rail (768–1023px).
5. **Refino do `5d` sobre a engine viva (14d):** o restyling não pode alterar as medições por `%`/rects que o drag/resize/setas da Fase 13 usam; conferir que os gestos seguem exatos após mudar alturas (linha 64px, barra 46px).
