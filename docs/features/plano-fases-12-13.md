# Plano de ação — Fases 12 e 13 (cascata de datas, edição de etapas/blocos, cronograma interativo com dependências)

Registro do planejamento aprovado pelo responsável do projeto em **06/07/2026**, na sequência das Fases 7–11 ([plano-fases-7-11.md](plano-fases-7-11.md)). Origem: correções e melhorias solicitadas após os testes do piloto, com referência visual de um vídeo das telas de cronograma do Notion (arrastar/redimensionar barras e ligar etapas por dependência "Bloqueado por / Bloqueando").

> Instrução explícita do responsável: **as fases só começam mediante comando direto**. A Fase 12 foi executada em 06/07/2026 sob comando direto; a Fase 13 segue **planejada, não iniciada** (assim como a 11).

| Fase | Entrega | Status |
|---|---|---|
| 12 | Cascata reativa de datas na criação + edição pós-criação de etapas/blocos (rota + formulário nas visões) | ✅ Concluída (06/07/2026, ADR-014) |
| 13 | Dependências informativas entre etapas + cronograma interativo (arrastar/redimensionar/ligar) | 📝 Planejada (06/07/2026, ADR-015) |

**Ordem obrigatória: 12 → 13.** A Fase 12 não mexe em schema (fluxo ADR-001 não é acionado) e deve ser **validada pelo gerente antes** de iniciar a 13. A Fase 13 **reintroduz dependência entre etapas** (revertendo a decisão do ADR-006, que já previa isso como "mudança de schema isolada") → **exige apagar e recriar o `.db`** e re-rodar `python -m app.seed_catalogo` (ADR-001). O cronograma interativo da Fase 13 depende do `PATCH /etapas/{id}` entregue na 12. Os ADRs 014 e 015 já estão **pré-registrados** em [../arquitetura/decisoes.md](../arquitetura/decisoes.md) com status "planejado"; na execução de cada fase, virar o status para "implementado".

## Diagnóstico verificado no código (06/07/2026)

- **Cascata**: não existe hoje. A convenção de dias úteis do backend (`calcular_data_fim(data_inicio, dias)`, `app/utils/calendario.py`, ADR-008) já devolve exatamente a **data de início da próxima etapa** na convenção "contando o dia de início" — o encadeamento reusa isso, sem matemática de dias úteis no frontend. A prévia por card (`DataFimPreview` em `EtapasEditor.jsx`, via `calcularDataFim()` de `api.js`) já mostra a data final.
- **Edição de etapa**: **não existe rota** para alterar `nome`/`descricao`/`dias_uteis_esperados`/`data_inicio`/`ordem`. Só `PUT /etapas/{id}/status` (`routes/etapas.py`). Campos de etapa só são tocados indiretamente pelas rotas de bloco.
- **Dependências**: **não existem**. O ADR-006 removeu `depende_de_id`; `Etapa.ordem` é só posicional. Não há tabela nem campos de "bloqueado por / bloqueando".
- **Cronograma**: `CronogramaEtapas.jsx` é **read-only** — CSS grid por mês, barras posicionadas por `gridColumn` com clamp, bloco = barra única (ADR-009). Sem drag, sem resize, sem setas. **Não existe reverse-calendar** (contar dias úteis entre duas datas) no backend.
- **Tabela**: `TabelaEtapas.jsx` só edita o `status` (via `<select>`); demais colunas são read-only. Sem colunas de dependência.

---

## Fase 12 — Cascata reativa de datas + edição de etapas/blocos (sem mudança de schema)

### 12a — Cascata reativa de datas no editor de criação (100% frontend + 1 rota utilitária)

**Regra (correção explícita do gerente):** não é só a 1ª etapa que dispara o preenchimento — **toda etapa** recalcula racionalmente pelos dias úteis. Mudar os **dias úteis de qualquer etapa** recalcula a data de término dela **e** a data de início da etapa seguinte, cascateando para frente a partir do ponto alterado.

- **Modelo do encadeamento:** `início[0]` = âncora (data digitada manualmente no 1º card). Para `k ≥ 1`: `início[k] = calcular_data_fim(início[k-1], dias[k-1])`. Alterar `dias[j]` ou `início[0]` recomputa `início[j+1], início[j+2], …` (tudo à frente do ponto alterado). Cada **card** do editor é uma unidade (bloco = 1 card, com seu `dias`/`data` compartilhados) — a cascata roda sobre `itensEtapas` na ordem visual.
- **Interrupção segura:** um card sem `dias` preenchido **quebra a cadeia** dali para frente (os cards seguintes mantêm o que têm / permanecem em branco até o `dias` ser informado). O usuário pode sobrescrever manualmente qualquer `início`, mas ele será recomputado se um valor **acima** dele mudar (âncora previsível: o topo manda).
- **Backend (ADR-008, sem N chamadas sequenciais):** nova rota utilitária `POST /calendario/cascata` (`routes/calendario.py`), body `{ "data_inicio": date, "dias": [int, …] }` → `{ "inicios": [date, …] }`, onde `inicios[0] = data_inicio` e `inicios[k] = calcular_data_fim(inicios[k-1], dias[k-1])`. Um único round-trip. Cliente novo em `api.js`: `cascataDatas(dataInicio, diasLista)`. A prévia de término por card continua via `DataFimPreview`.
- **Arquivos:** `EtapasEditor.jsx` (disparar a cascata em `onChange` de `dias` e da data-âncora), `etapasEditorUtils.js` (helper de cascata sobre os itens), `FormularioProjetos.jsx` (marcar `etapasSujas` quando a cascata altera datas, para o payload viajar customizado). **Nada** de matemática de dias úteis local.

### 12b — Edição pós-criação de etapas e blocos (backend)

**Sem mudança de schema.** Reusa o padrão de escrita redundante dos blocos (ADR-009) e a validação de plausibilidade (ADR-013).

- **Schema** (`schemas.py`): novo `EtapaEditar` (`nome?`, `descricao?`, `dias_uteis_esperados?`, `data_inicio?`) com `field_validator` de `validar_data_plausivel` em `data_inicio`. Mantém `EtapaAtualizar` (status) intocado.
- `PATCH /etapas/{etapa_id}` (`routes/etapas.py`): aplica só os campos enviados. **Se a etapa pertence a um bloco** (`bloco_entrega` preenchido) e mudam `dias_uteis_esperados`/`data_inicio`, propaga o novo valor a **todos os membros** do bloco (redundância ADR-009); `nome`/`descricao` permanecem **individuais**. 404 se a etapa não existir; 422 para data implausível.
- `PUT /projetos/{projeto_id}/etapas/ordem` (`routes/projetos.py`), body `{ "ordem": [etapa_id, …] }`: reatribui `ordem = índice + 1` para todas as etapas do projeto na ordem recebida. Cobre reordenar avulsas **e** reordenar membros dentro de um bloco. Valida que a lista contém exatamente os ids das etapas do projeto (422 caso divirja; 404 se o projeto não existir).
- `api.js`: `atualizarEtapa(etapaId, dados)` (PATCH) e `reordenarEtapas(projetoId, ordemIds)` (PUT).
- **Consultores reusam o que já existe** (`POST`/`DELETE /etapas/{id}/consultores`) — nenhuma rota nova para equipe.
- Testes `backend/tests/test_fase12.py` (~7): editar nome/dias/data de etapa avulsa; editar dias/data de membro de bloco propaga aos demais e mantém status individual; editar só nome de membro **não** propaga; data implausível → 422; reordenar reatribui `ordem`; reordenar com lista divergente → 422; `POST /calendario/cascata` encadeia certo (bater com o exemplo 06/07 → 07/07 → 09/07).

### 12c — Formulário de edição de etapa/bloco (frontend, acessível em todas as visões)

- Novo componente `ModalEditarEtapa.jsx` (usa classes `.form-*`, `useToast`, reusa `DataFimPreview`):
  - **Etapa avulsa:** editar nome, descrição, dias úteis, data de início (com prévia de término) e consultores (add/remover via handlers existentes).
  - **Bloco:** editar dias úteis + data de início **compartilhados** (aplicam a todos os membros via `PATCH`), editar o **nome** de cada membro, **reordenar membros** (→ `reordenarEtapas`) e consultores por membro.
- **Ponto de entrada em cada visão:** botão de edição (lucide `Pencil`) em cada card do `KanbanEtapas.jsx` e em cada linha do `TabelaEtapas.jsx` — satisfaz "as outras formas de visualização também editam". `EtapasProjeto.jsx` (container) ganha os handlers `editarEtapa`/`reordenar` (chamam a API + `recarregar()` já existente) e os repassa como props.
- **CSS:** reaproveitar `.form-*` e tokens existentes; classes novas mínimas para o botão ✏️ nos cards/linhas.

---

## Fase 13 — Dependências informativas entre etapas + cronograma interativo

> **Reverte parcialmente o ADR-006.** O ADR-006 removeu `depende_de_id` por YAGNI, registrando que reintroduzir seria "uma mudança de schema isolada" — é exatamente esta fase. **Muda schema → apagar e recriar o `.db` + `python -m app.seed_catalogo` (ADR-001).** Os dados de teste atuais serão perdidos; **confirmar o timing com o gerente antes de executar.**

### 13a — Modelo e rotas de dependência (backend)

- **Modelo** (`models/banco_de_dados.py`): nova tabela `EtapaDependencia`:

  | Campo | Tipo | Observação |
  |---|---|---|
  | id | int | PK |
  | etapa_id | int | FK → Etapa (a etapa **bloqueada** / sucessora) |
  | bloqueada_por_id | int | FK → Etapa (a etapa **bloqueadora** / predecessora) |

  Com `UniqueConstraint(etapa_id, bloqueada_por_id)` e cascade delete junto com as etapas (coerente com ADR-012). Relacionamentos self-referential em `Etapa` para navegar os dois sentidos.
- **Serialização:** `EtapaResposta` ganha `bloqueada_por: [{id, nome}]` e `bloqueando: [{id, nome}]` (só id + nome — leve para os chips/setas).
- **Rotas** (`routes/etapas.py`):
  - `POST /etapas/{etapa_id}/dependencias`, body `{ "bloqueada_por_id": int }` — cria o vínculo. Validações: ambas as etapas no **mesmo projeto** (422/404), **sem auto-referência** (422), **sem duplicata** (409), **sem ciclo direto** (se B já é bloqueada por A, recusar A bloqueada por B — 422). Ciclos indiretos ficam fora de escopo (dependência é **só informativa**, ADR-015).
  - `DELETE /etapas/{etapa_id}/dependencias/{bloqueada_por_id}` — remove o vínculo (404 se não existir).
- **Reverse-calendar** (`utils/calendario.py` + `routes/calendario.py`): `contar_dias_uteis(data_inicio, data_fim)` devolve a contagem de dias úteis coerente com `calcular_data_fim` (início exclusivo, feriados nacionais) e `GET /calendario/dias-uteis?data_inicio=…&data_fim=…` → `{ "dias_uteis": int }`. Usado pelo redimensionamento do cronograma para converter a nova data final em `dias_uteis_esperados`.
- `api.js`: `criarDependencia(etapaId, bloqueadaPorId)`, `removerDependencia(etapaId, bloqueadaPorId)`, `contarDiasUteis(dataInicio, dataFim)`.
- Testes `backend/tests/test_fase13.py`: criar/remover dependência; rejeições de auto-referência/duplicata/ciclo direto/etapa de outro projeto; `bloqueada_por[]`/`bloqueando[]` na resposta; `GET /calendario/dias-uteis` bate com o inverso de `calcular_data_fim`.

### 13b — Cronograma interativo (frontend)

Reescreve `CronogramaEtapas.jsx` mantendo o CSS grid por mês (ADR-010). **Dependências são só informativas** — nada é reagendado automaticamente ao ligar (decisão do responsável). Interações:

- **Arrastar a barra na horizontal** → nova `data_inicio`: converte o deslocamento em dias pela largura da coluna e, no drop, chama `atualizarEtapa(id, { data_inicio })` (data final se re-deriva sozinha). **Pointer events nativos.**
- **Redimensionar a borda direita** → nova duração: converte a nova data final em dias úteis via `contarDiasUteis(data_inicio, data_fim)` e chama `atualizarEtapa(id, { dias_uteis_esperados })`. **Pointer events nativos.**
- **Arrastar um conector de uma barra até outra** → cria dependência: `criarDependencia(alvo, origem)`. Reusa o padrão @dnd-kit já usado no 🔗 do Kanban (draggable handle → droppable barra), porém com **semântica de dependência** (distinta do bloco de entrega). Setas SVG entre as pontas das barras no mês visível; para dependências fora do mês, marcador/tooltip ("bloqueada por X").
- **Bloco = uma barra** (data compartilhada): arrastar/redimensionar aplica a **todos os membros** (o `PATCH` da Fase 12 já propaga).
- **CSS novo** em `App.css`: handles de resize, conector de dependência, setas/linhas, cursores de arraste — só com tokens existentes.

### 13c — Colunas de dependência na Tabela

- `TabelaEtapas.jsx` ganha as colunas **"Bloqueado por"** e **"Bloqueando"** (chips com o nome das etapas relacionadas + `×` para remover; `<select>` para adicionar), chamando `criarDependencia`/`removerDependencia`. Espelha o print de referência do gerente. Reusa o handler de `recarregar()` do container.

---

## Fora de escopo (registrado)

- **Reagendamento automático por dependência** (mover B empurrar A): decisão explícita do responsável — dependências são **só informativas** nesta fase (ADR-015). Se um dia for pedido, é evolução isolada em cima da tabela `EtapaDependencia`.
- **Detecção de ciclos indiretos** (A→B→C→A): fora de escopo; só o ciclo direto é barrado.
- **Métricas e dashboards de projetos**: registrados no [roadmap.md](roadmap.md) para depois da Fase 13 — não fazem parte de nenhuma destas duas fases.
- Alterar o catálogo de serviços (conteúdo da diretoria, ADR-005).

## Verificação por fase (roda na execução)

- **12**: `pytest` com os testes novos de `test_fase12.py` (mantendo os 31 atuais verdes) + `npm run lint`/`build`. Manual: criar projeto, preencher só a data do 1º card e conferir a cascata; **mudar os dias úteis de um card do meio** e ver as datas seguintes recalcularem (bater com 06/07 → 07/07 → 09/07); abrir projeto, editar etapa e bloco pelo ✏️ (nome/dias/data/ordem/consultores) no Kanban **e** na Tabela; confirmar persistência via `GET /projetos/{id}/etapas`.
- **13**: recriar o `.db` + seed; `pytest` com `test_fase13.py`. Manual: no cronograma, **arrastar** uma barra (muda início), **redimensionar** (muda data final), **ligar** duas etapas (dependência) e conferir a seta + as colunas "Bloqueado por"/"Bloqueando" na Tabela; confirmar que bloco arrasta como unidade; viewport 375px com scroll horizontal.

## Riscos registrados

1. **Cascata sobrescrevendo edição manual (12a)**: âncora previsível — o topo manda; card sem `dias` quebra a cadeia. Deixar claro na UX que datas abaixo de um valor alterado são recomputadas.
2. **Propagação de bloco no `PATCH` (12b)**: editar dias/data de um membro precisa atingir todos os membros do bloco; nome/descrição, não. Testar os dois caminhos.
3. **Perda de dados de teste na recriação do `.db` (13)**: deliberado (ADR-001); confirmar timing com o gerente e re-rodar o seed do catálogo.
4. **Reverse-calendar inconsistente com `calcular_data_fim` (13a)**: `contar_dias_uteis` deve ser o inverso exato (início exclusivo, mesmos feriados) — teste de ida-e-volta obrigatório.
5. **Setas de dependência entre meses no cronograma (13b)**: layout por mês dificulta desenhar a seta cross-mês; fallback = marcador/tooltip no mês visível.
6. **Dois gestos de "ligar" com significados diferentes (13b)**: 🔗 do Kanban = bloco de entrega; conector do cronograma = dependência. Rotular e diferenciar visualmente para não confundir o usuário.
