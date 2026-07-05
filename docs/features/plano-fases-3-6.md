# Plano de continuidade — Fases 3 a 6 (identidade Apoio Hub, TAP, etapas com datas, entregas em bloco)

Registro do planejamento aprovado pelo responsável do projeto em **04–05/07/2026**, na sequência das Fases 1 (rebuild do modelo/navegação) e 2 (seed do catálogo). Documenta o que cada fase entrega, as decisões de produto tomadas, as tecnologias escolhidas e o **status de execução**.

| Fase | Entrega | Status |
|---|---|---|
| 3 | Identidade visual Apoio Hub + shell da sidebar + responsividade | ✅ **Concluída** (05/07/2026) |
| 4 | Status do TAP editável na página do projeto + Clicksign no roadmap | ✅ **Concluída** (05/07/2026) |
| 5 | Datas nas etapas + cards editáveis/adicionáveis/reordenáveis na criação | ⏳ Pendente |
| 6 | Entregas em bloco interativas (card único, ligação com o mouse, desfazer) | ⏳ Pendente (depende da 5) |

## Decisões de produto (tomadas com o responsável)

- **Sidebar = shell decorativo do Apoio Hub.** A sidebar real já existe na plataforma; o piloto a replica visualmente, mas só **Projetos** e **Membros** são funcionais. Os demais itens ficam `aria-disabled`.
- **Tela Membros mostra a equipe ativa sem exigir cadastro** (no Hub real o cadastro é orgânico). O cadastro de colaborador/professor foi mantido nela **apenas como recurso provisório de testes**, até o piloto ter acesso às tabelas do Hub — remover na integração (roadmap).
- **Card de etapa na criação de projeto**: campos editáveis são **nome, dias úteis e data de início**; a **data final é calculada** (data de início + dias úteis). Botão de adicionar etapa (escopos padrão são só um norte) e reordenação por arrastar.
- **Cálculo de dias úteis considera feriados nacionais desde já** (lib `workalendar`, calendário `Brazil`); feriados municipais/estaduais ficam fora.
- **Entregas em bloco viram um card único** com um só prazo de dias úteis para o conjunto (ex.: bloco de 3 etapas = 15 dias úteis no card).
- **Gesto de ligação com o mouse** (arrastar uma entrega sobre outra + confirmar) para formar bloco existe **no Kanban de etapas E no formulário de criação**; todo bloco tem botão de desfazer.
- **Status dentro do bloco é individual por etapa**: o card do bloco mostra progresso ("1/3 concluídas") e fica na coluna da etapa menos avançada.
- **Clicksign**: a atualização automática do `tap_assinado` via gatilho ficou **somente no roadmap** (viabilidade não levantada) — ver [roadmap.md](roadmap.md).

## Tecnologias escolhidas

| Necessidade | Escolha | Motivo |
|---|---|---|
| Reordenar cards e ligar entregas | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | Compatível com React 19; touch + teclado de graça; drag types distintos p/ reordenar vs. ligar (~10kb) |
| Ícones de linha estilo Hub | `lucide-react` *(já instalado na Fase 3)* | Mesmo estilo do Hub, tree-shakable |
| Dias úteis com feriados nacionais | `workalendar` (backend) | Feriados BR prontos (inclusive móveis); `add_working_days()`; já era a lib prevista no roadmap do calendário |
| Tema dark / identidade | Tokens CSS já existentes em `App.css` (retheme de valores) | Todos os componentes já consomem os tokens |
| Avatares | Componente próprio `AvatarIniciais.jsx` | Modelo sem foto; iniciais + cor por hash do nome, zero deps |
| Datas no formulário | `<input type="date">` nativo + `Intl.DateTimeFormat('pt-BR')` | Cálculo fica no backend (fonte única via endpoint) |
| Feedback/modais | `Toast.jsx` existente + modal próprio leve | Padrão do repo |

---

## Fase 3 — Identidade visual Apoio Hub (✅ concluída em 05/07/2026)

**O que foi feito:**

1. **Retheme dark** em `frontend/src/App.css`: tokens trocados para a paleta do Hub (fundo `#0D0D15`, superfícies `#16161F`, brand indigo `#6C5CE7`, texto `#F1F0F7`/`#9B9AA8`), status translúcidos, sombras/glow indigo, novos tokens `--fase-*` para os dots das colunas do Kanban. Auditoria das cores hardcoded que assumiam fundo claro (chips, toasts, sombras navy, gradiente da sidebar).
2. **Sidebar shell do Hub** em `App.jsx`: logo "Apoio Hub / Apoio Consultoria Júnior · EJ", user card decorativo (`USUARIO_DEMO` — não há auth), menu completo (`ITENS_MENU_HUB`: Home, Meu Perfil, Membros, Chat, Sede Agora, Escalas, Rankings, Projetos, Academia, Agenda, Central de Forms, Sair) com ícones `lucide-react`; item ativo = pílula indigo com chevron; itens decorativos `aria-disabled`.
3. **Tela Membros**: a antiga tela Equipe virou o item "Membros", em grid de cards estilo Hub com `AvatarIniciais.jsx` (novo componente: iniciais + cor determinística por hash do nome); cadastro mantido como botões discretos (provisório de testes).
4. **Kanban de fases estilo Hub** (`KanbanFases.jsx` + `fases.js`): headers de coluna com dot colorido + contagem, affordance fantasma "+ Novo projeto" em coluna vazia, card com chip do serviço, bloco GERENTE (avatar + nome) e fileira de avatares dos consultores.
5. **Backend — enriquecimento do `GET /projetos/`**: novo schema `ProjetoListaResposta` com `equipe` embutida (equipe derivada, ADR-002); helper `equipe_derivada()` extraído em `routes/projetos.py` e reusado no detalhe. Gerente/serviço são resolvidos no frontend por lookup (`useDados()` agora carrega também `listarServicos()`).
6. **Headers estilo Hub** ("Projetos / Acompanhe o andamento dos projetos da Apoio" com ícone briefcase) e migração dos inline styles de `FormularioProjetos.jsx` para classes utilitárias `.form-*` em `App.css`.
7. **Responsividade**: sidebar completa ≥1024px; rail só-ícones (76px) em 768–1023px; drawer off-canvas + topbar com hamburger <768px (state `menuAberto`); kanbans com scroll horizontal em telas médias e empilhados <640px.

**Verificação feita:** `npm run lint` e `npm run build` limpos; `pytest` 3/3; inspeção de estilos computados no preview (tokens dark, pílula ativa, rail e topbar) nas larguras 375/768+/1280.

## Fase 4 — TAP editável + Clicksign no roadmap (✅ concluída em 05/07/2026)

**O que foi feito:**

1. **UI em `PaginaProjeto.jsx`** (card Iniciação): botão "✓ Marcar TAP como assinado" quando pendente; "Reverter para pendente" (com `window.confirm`) quando assinado. Usa o `atualizarProjeto()` já existente em `api.js` (`PUT /projetos/{id}`, que já aceitava `tap_assinado`) + toast; merge parcial no estado local.
2. **Teste de contrato** `test_atualizar_tap_assinado` em `backend/tests/test_smoke.py`: alterna o TAP nos dois sentidos e confirma que a `fase` não muda (ADR-007). Backend não mudou nesta fase.
3. **Roadmap**: nova seção "Atualização automática do TAP via Clicksign" em [roadmap.md](roadmap.md) — só levantamento (plano/API da conta, webhooks vs. polling, correlação documento↔projeto); a edição manual permanece como fallback permanente.

**Verificação feita:** `pytest` 4/4; fluxo completo na UI (marcar assinado → chip verde + botão alternado → persistido no banco → revertido).

---

## Fase 5 — Datas nas etapas + editor de cards na criação (⏳ pendente)

> Nota: um início desta fase (coluna `Etapa.data_inicio`, `utils/calendario.py`, `workalendar` no requirements) foi aplicado e **revertido** em 05/07/2026 para manter o repositório consistente enquanto a documentação era consolidada — a fase deve ser executada por inteiro, incluindo o fluxo ADR-001.

**Backend:**
- `Etapa.data_inicio` (Date, nullable) no modelo — **mudança de schema ⇒ fluxo ADR-001** (apagar `piloto_projetos.db`, reiniciar, `python -m app.seed_catalogo`).
- `workalendar` no `requirements.txt`; `backend/app/utils/calendario.py` com `calcular_data_fim(data_inicio, dias_uteis)` (`workalendar.america.Brazil`); router `backend/app/routes/calendario.py` com `GET /calendario/data-fim` (prévia para o formulário — o frontend nunca calcula datas localmente).
- Schemas: `EtapaProjetoCriar` (`nome`, `dias_uteis_esperados`, `data_inicio`, `etapa_template_id?`, `bloco_grupo?`) + campo opcional `ProjetoCriar.etapas` (**a `ordem` não viaja no payload** — o backend atribui `ordem = índice + 1`; campo omitido ⇒ cópia literal dos templates, comportamento atual). `EtapaResposta` ganha `data_inicio` e `data_fim` calculada.
- Cascade (`services/projetos.py`) com dois caminhos; nos dois, templates com `ordem` repetida materializam bloco: chave uuid compartilhada em `bloco_entrega` (que passa a ser **chave de bloco**, não rótulo). Itens com o mesmo `bloco_grupo` no payload idem, normalizados para o mesmo prazo/data.
- Testes: unit do calendário (fim de semana + feriado), cascade materializa blocos, criação customizada (reordenada, editada, etapa manual), `etapas: []` → 422, template de outro serviço → 404.

**Frontend:**
- Instalar `@dnd-kit/*`; novo `EtapasEditor.jsx`: cards editáveis (nome, dias úteis, data de início; data final calculada via endpoint), handle ⠿ para reordenar (dnd-kit sortable vertical, `arrayMove`), setas ↑/↓ como fallback acessível, remover (com guarda), "+ Adicionar etapa", badge "manual" quando `etapa_template_id === null`; blocos do catálogo aparecem agrupados como card único com um só prazo/data.
- Integração no `FormularioProjetos.jsx`: substitui o preview de chips; flag `etapasSujas` — o payload só inclui `etapas` se houve edição (senão o backend copia templates literalmente); trocar de serviço descarta customizações com aviso.
- `KanbanEtapas.jsx` exibe `data_inicio`/`data_fim` nos cards.

**Docs da fase:** ADR-008 (etapas customizadas + ordem posicional + datas calculadas + por que não viola ADR-005), `modelo-dados.md` (campo novo, semântica de `bloco_entrega`, fluxo com dois caminhos), `CLAUDE.md`, `visao-geral.md`, `roadmap.md` (workalendar adotado para datas; calendário visual segue futuro).

## Fase 6 — Entregas em bloco interativas (⏳ pendente, depende da 5)

**Backend:** `POST /projetos/{id}/blocos` (`etapa_ids` min 2, `dias_uteis_esperados`, `data_inicio?` — valida mesmo projeto e ausência de bloco prévio; aplica chave uuid + prazo/data compartilhados) e `DELETE /projetos/{id}/blocos/{chave}` (limpa a chave; membros mantêm valores). Testes de criação, rejeições e desfazer.

**Frontend:**
- `KanbanEtapas.jsx`: card único de bloco na coluna da **etapa menos avançada**, com progresso "X/Y concluídas", prazo/data do bloco, lista interna de etapas (cada uma com status e equipe próprios) e botão "Desfazer bloco".
- Gesto de ligação: handle 🔗 em cada card avulso; arrastar sobre outro card → modal de confirmação (prazo pré-preenchido com o maior entre os membros; data com a mais cedo). No kanban chama a API; no editor de criação só atualiza `bloco_grupo` local (o backend materializa na criação).
- `api.js`: `criarBloco()` / `desfazerBloco()`.

**Docs da fase:** ADR-009 (modelo de bloco: chave compartilhada + prazo redundante nos membros; status individual; gesto nos dois contextos), `modelo-dados.md`, `CLAUDE.md`, `visao-geral.md`.

## Riscos registrados

1. **Dois gestos de arrastar no mesmo card** (⠿ reordenar vs. 🔗 ligar): mitigar com handles e drag types separados; se confundir na prática, degradar a ligação para "clicar no 🔗 do card A e depois no card B".
2. **Prazo do bloco gravado redundante nos membros** (sem tabela nova): trade-off deliberado; promover a entidade própria se blocos ganharem mais atributos.
3. **Feriados**: só nacionais (workalendar `Brazil`); municipais/estaduais fora do escopo.
4. **`@dnd-kit` está em modo manutenção**: estável e compatível com React 19; fallback de reordenação são as setas ↑/↓.
5. **Fase 5 apaga os dados de teste** (fluxo ADR-001): re-seed do catálogo + recriar projetos de teste à mão.
