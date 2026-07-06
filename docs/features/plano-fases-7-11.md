# Plano de ação — Fases 7 a 11 (visualizações de etapas, blocos N-etapas, exclusões, datas e go-live)

Registro do planejamento aprovado pelo responsável do projeto em **05/07/2026**, na sequência das Fases 3–6 ([plano-fases-3-6.md](plano-fases-3-6.md)). Origem: correções e melhorias solicitadas após os testes do piloto, com referência visual das telas de projetos do Notion (visões Por status / Tabela / Cronograma / Calendário), mais o envio do **schema real do banco do Apoio Hub** pelo mantenedor da plataforma (analisado em [../arquitetura/integracao-apoio-hub.md](../arquitetura/integracao-apoio-hub.md)).

> Instrução explícita do responsável: as fases só começam mediante comando direto. A **Fase 7a foi executada em 05/07/2026** mediante comando; as demais seguem aguardando.

| Fase | Entrega | Status |
|---|---|---|
| 7a | Aba **Etapas** primeiro (e padrão); Visão Geral depois | ✅ Concluída (05/07/2026) |
| 7b | Visualizações múltiplas de etapas (Por status / Tabela / Cronograma / Calendário) com submenu | ⏳ Aguardando comando |
| 8 | Entregas em bloco com N etapas: estender, retirar etapa específica e romper | ⏳ Aguardando comando |
| 9 | Exclusão (DELETE) de gestões e projetos pelos cards | ⏳ Aguardando comando |
| 10 | Tratamento/validação de datas (ano plausível, formato DD/MM/AAAA) | ⏳ Aguardando comando |
| 11 | Go-live / integração com o Apoio Hub | 🔒 Gatilho externo (acesso ao banco do Hub) |

**Ordem obrigatória: 7a → 7b → 8** (a UI da Fase 8 edita o `KanbanEtapas.jsx` refatorado na 7b; o backend da 8 pode andar em paralelo à 7b). **Fases 9 e 10 são independentes** entre si e das demais (a parte frontend da 10 reusa o `datasUtils.js` criado na 7b). ADRs novos (010, 011, 012) são escritos **na execução** de cada fase, seguindo o padrão do repo.

## Diagnóstico verificado no código (05/07/2026)

- Aba padrão hoje é `'geral'` (`PaginaProjeto.jsx:15`); as duas abas são renderizadas nas linhas 83–90.
- **Por que blocos não passam de 2 etapas**: `CardBloco` **não é droppable** (só `CardEtapaAvulsa` registra `useDroppable`, id `card-*`); `aoSoltarLigacao` só trata drops em ids `card-*`; no editor de criação há early-return quando o alvo da ligação é bloco (`EtapasEditor.jsx:204`); e o backend **não estende** bloco existente (`POST /projetos/{id}/blocos` sempre gera uuid novo e responde 409 para etapa já em bloco). Porém `BlocoCriar.etapa_ids` já aceita N≥2 na criação e blocos de N membros vindos do catálogo já renderizam corretamente — a limitação é de **gesto/extensão**, não de modelo.
- Datas: `EtapaResposta` já traz `data_inicio` + `data_fim` derivada — as novas visões não precisam de backend. Não existe lib nem CSS de tabela/cronograma/calendário no projeto.
- O `<input type="date">` aceita qualquer ano digitado (ex. 8250) e o backend aceita qualquer data válida — origem do problema da Fase 10.

---

## Fase 7 — Etapas em primeiro plano + visualizações múltiplas (100% frontend)

### 7a — Inversão das abas (trivial, commit próprio)

Em `frontend/src/components/PaginaProjeto.jsx`: `abaAtiva` inicial `'geral'` → `'etapas'`; inverter a ordem dos dois `<div className="tab">` (Etapas primeiro). Nada de CSS ou backend.

### 7b — Submenu de visualizações

**Arquitetura:** novo container `EtapasProjeto.jsx` busca etapas + colaboradores **uma vez** e concentra os handlers hoje dentro do `KanbanEtapas` (mover status, equipe, recarregar — mover sem alterar corpo). Submenu de pílulas (`role="tablist"`, classes novas `.subnav`/`.subnav-pill`) com ícones lucide já disponíveis na versão instalada: `SquareKanban`, `Table2`, `ChartGantt`, `CalendarDays` → **Por status / Tabela / Cronograma / Calendário**. A visão ativa não persiste entre navegações (useState local — trade-off consciente, registrar no ADR-010).

**Componentes novos** (`frontend/src/components/`): `TabelaEtapas.jsx`, `CronogramaEtapas.jsx`, `CalendarioEtapas.jsx`, `NavMes.jsx` (header ‹ mês › + "Hoje", compartilhado entre cronograma e calendário), `datasUtils.js` (aritmética de **grade de calendário** em UTC, comparações por string ISO — cálculo de dias úteis continua exclusivo do backend, ADR-008) e `etapasUtils.js` (RANK, agrupamento de blocos e rótulos "Bloco 1, 2…" extraídos do `KanbanEtapas`). `KanbanEtapas` vira visão controlada por props (o `DndContext`/gesto 🔗 permanecem encapsulados nele).

**As visões:**
- **Tabela** ("Todas as etapas"): linhas planas ordenadas por `ordem` — colunas Etapa, Status (`<select>` chamando o handler de mover), Início, Término, Prazo, Equipe (chips), Bloco (chip "📦 Bloco N"); wrapper com `overflow-x`.
- **Cronograma**: um CSS grid por mês (coluna de rótulos + 1 coluna por dia), barras posicionadas por `gridColumn` com clamp nos limites do mês, cor por status, **bloco = uma barra única** (prazo/data compartilhados por ADR-009), faixas de fim de semana, etapas sem `data_inicio` num aside "Sem data de início". Mês exibido compartilhado com o Calendário (estado no container; inicial = mês do menor `data_inicio`).
- **Calendário**: grade 7 colunas, **chips pontuais em `data_inicio` (▸) e `data_fim` (✔)** — sem spans multi-semana (complexidade não justificada; registrar no ADR-010); máx. 3 chips por célula + "+N"; célula de hoje destacada.

**CSS:** seção nova no `App.css` (`.subnav*`, `.tabela-*`, `.nav-mes*`, `.cronograma-*`, `.crono-barra--{status}`, `.calendario-*`, `.cal-chip--{status}`, `.sem-data-aside`) usando só os tokens existentes. **Backend: nada** — `GET /projetos/{id}/etapas` já entrega tudo.

---

## Fase 8 — Entregas em bloco com N etapas: estender, retirar etapa específica e romper

Requisito explícito do responsável: além de **estender** o bloco, deve ser possível **retirar uma etapa específica de dentro do bloco** E **manter o rompimento total** ("Desfazer bloco" atual, intocado). Os três gestos coexistem. **Sem mudança de schema** (`bloco_entrega` já modela N membros).

**Backend** (`routes/projetos.py`; schema novo `BlocoEstender { etapa_ids: List[int] min 1 }`):
- `POST /projetos/{id}/blocos/{chave}/etapas` — estende bloco existente: valida projeto/bloco (404), ids repetidos (422), etapa de outro projeto (404), etapa já em bloco — inclusive o próprio (409). As novas etapas **adotam o prazo/data do bloco** (copiados de um membro, redundância do ADR-009; sem re-perguntar ao usuário) e mantêm status individual. Responde todos os membros.
- `DELETE /projetos/{id}/blocos/{chave}/etapas/{etapa_id}` — retira etapa específica: ela volta a ser avulsa mantendo prazo/data; **se restar apenas 1 membro, o bloco inteiro dissolve** (invariante: bloco mínimo = 2). 404 para bloco/etapa não pertencente.
- `api.js`: `estenderBloco(projetoId, chave, etapaIds)`, `removerEtapaDoBloco(projetoId, chave, etapaId)`.
- Testes novos `backend/tests/test_fase8.py` (~6): estender adota prazo/data e preserva status; rejeições 404/409/422; criar bloco com 3 ids direto na API (já funciona — documentar com teste); retirar 3→2 mantém bloco; 2→1 dissolve; 404s do delete.

**Kanban** (pós-refactor da 7b):
- `CardBloco` ganha `useDroppable({ id: 'bloco-${chave}' })` + realce de alvo; `aoSoltarLigacao` ramifica por prefixo do `over.id` (`card-` = criar bloco como hoje; `bloco-` = estender, novo estado `extensao`). Blocos **não** ganham handle 🔗 (só avulsa→bloco; bloco→bloco fora de escopo).
- Botão `Unlink` pequeno por membro dentro do card do bloco ("Remover do bloco", com `window.confirm` e toast específico quando a remoção dissolve o bloco). "Desfazer bloco" continua exatamente como está.

**Editor de criação** (`EtapasEditor.jsx`): remover o early-return da linha 204 e permitir merge de card avulso em item-bloco (append em `membros`); realce de alvo passa a incluir blocos; `confirmarLigacao` com payload opcional (na extensão o alvo mantém dias/data próprios). `etapasEditorUtils.js` e o cascade via `bloco_grupo` já suportam N — sem mudança.

**`ModalBloco.jsx`**: prop retrocompatível `modo: 'criar' | 'estender'` — no modo estender: título "Adicionar ao bloco de entrega", prazo/data exibidos read-only com a explicação "a etapa adota o prazo e a data de início do bloco; o status continua individual", CTA "Adicionar ao bloco".

---

## Fase 9 — Exclusão de gestões e projetos (rotas DELETE + botões nos cards)

> Futuramente (Fase 11) essas rotas serão **exclusivas de diretores e cargos com permissão de edição** no Apoio Hub (`funcionarios.nivel_acesso`). No piloto, sem auth, ficam abertas.

**Backend:**
- `DELETE /projetos/{projeto_id}` (`routes/projetos.py`) — exclusão em cascata: EtapaConsultor → Etapas → Projeto, via `cascade="all, delete-orphan"` nos relationships `Projeto.etapas` e `Etapa.consultores` (mudança só de ORM, **não** de schema de banco — fluxo ADR-001 não é acionado). 404 se inexistente.
- `DELETE /gestoes/{gestao_id}` (`routes/gestoes.py`) — **bloqueado se a gestão tiver projetos** (409 "Gestão possui N projeto(s); exclua-os primeiro") — default seguro contra perda em massa; gestão vazia exclui normal. 404 se inexistente.
- **Tensão com ADR-002 → registrar em ADR-012**: excluir projeto apaga o histórico de EtapaConsultor (dado da futura ficha SIEX). Aceitável no piloto (exclusão existe para dados de teste/projetos cancelados); em produção, gating por cargo e possivelmente arquivamento em vez de exclusão.
- `api.js`: `excluirProjeto(projetoId)`, `excluirGestao(gestaoId)`. Testes (`test_fase9.py`): cascata completa, gestão com projetos → 409, gestão vazia → 200, 404s.

**Frontend:**
- Botão de lixeira (lucide `Trash2`, estilo `btn-ghost-danger` discreto) no **card de gestão** (`CardGestao`, galeria em `App.jsx`) e no **card de projeto** (`KanbanFases.jsx`, rodapé do card, com `stopPropagation`).
- Confirmação forte via `window.confirm` explicitando o efeito ("Excluir o projeto X? Isso apaga as etapas e o histórico de equipe. Não pode ser desfeito." / "Excluir a gestão X?"); toast de sucesso/erro (o 409 da gestão vira mensagem clara) + `recarregar()`.

---

## Fase 10 — Tratamento e validação de datas (ano plausível + formato brasileiro)

Problema: hoje é possível criar etapa com data inicial inexistente/absurda (ex. **05/12/8250**).

- **Regra de plausibilidade (fonte única no backend)**: `data_inicio` deve estar entre **01/01/(ano atual − 1)** e **31/12/(ano atual + 2)** — janela dinâmica baseada no ano corrente (em 2026: 2025–2028), cobrindo gestões passadas recentes e planejamento futuro razoável. Helper `validar_data_plausivel()` em `app/utils/calendario.py`, aplicado via `field_validator` do Pydantic em **todos** os pontos de entrada de data: `EtapaProjetoCriar.data_inicio`, `EtapaCriar.data_inicio`, `BlocoCriar.data_inicio` (`BlocoEstender` não carrega data — nada a fazer) → 422 com mensagem em português.
- **Frontend**: os inputs de data (`EtapasEditor.jsx` e `ModalBloco.jsx`) ganham atributos `min`/`max` calculados da mesma janela (helper no `datasUtils.js` da Fase 7b) + validação no submit (bloqueia com mensagem antes do POST). Exibição permanece **DD/MM/AAAA** em todo lugar (`Intl.DateTimeFormat('pt-BR')` já é o padrão do repo; o input nativo já exibe dd/mm/aaaa em navegador pt-BR — a validação elimina os anos absurdos que o input permite digitar).
- Testes: POST de projeto com etapa em 8250 → 422; ano corrente → 200; bloco com data fora da janela → 422.

---

## Fase 11 — Go-live / integração com o Apoio Hub (🔒 gatilho externo)

Depende do acesso ao banco do Hub, a concender pelo mantenedor da plataforma. Sem data. O detalhamento completo (o que sai do piloto, mapa de correspondência de tabelas, lacunas, migração SQLite → MySQL/MariaDB) vive em [../arquitetura/integracao-apoio-hub.md](../arquitetura/integracao-apoio-hub.md). Resumo do que esta fase executa:

1. Remoções da lista **piloto → produção** (cadastros provisórios de Membros, `USUARIO_DEMO`, sidebar shell, etc.).
2. Autenticação/leitura de membros via `plataforma_hub_funcionarios` (+ `funcionario_cargos`/`areas`); fotos reais (`foto_url`) com iniciais como fallback.
3. **Restringir as rotas DELETE da Fase 9 a diretores/cargos de edição** (`nivel_acesso`).
4. Migração de banco e evolução do módulo `plataforma_hub_projetos`/`projeto_etapas` para o modelo do piloto.

---

## Verificação por fase (roda na execução)

- **7a**: `npm run lint` + `npm run build`; manual: Etapas é a primeira aba e a padrão; Visão Geral (toggle TAP) segue ok.
- **7b**: lint + build; `pytest` segue verde (backend intocado); manual: Kanban 100% preservado (status, equipe, 🔗, desfazer), Tabela muda status e reflete no Kanban, Cronograma com clamp/barra única de bloco/aside sem-data, Calendário com ▸/✔/hoje/+N; viewport 375px (pílulas quebram linha, cronograma/tabela com scroll horizontal).
- **8**: `pytest` com os ~6 testes novos; manual: bloco de 2 → arrastar 🔗 de avulsa sobre o card do bloco → "Bloco de 3 etapas" com progresso 0/3; **retirar etapa específica** (3→2 mantém bloco; 2→1 dissolve com toast próprio); "Desfazer bloco" total continua funcionando; no editor, ligar avulsa em bloco e conferir que o projeto criado materializa N etapas com a mesma chave.
- **9**: `pytest` com os testes de exclusão; manual: excluir projeto pelo card (confirm → some do kanban → etapas/vínculos apagados no banco), gestão com projetos bloqueada com mensagem clara, gestão vazia excluída.
- **10**: `pytest` com os testes de validação; manual: tentar 05/12/8250 no editor → bloqueado no input (`max`) e, forçando via Swagger, 422; datas exibidas em DD/MM/AAAA em todas as visões.

## Riscos registrados

1. **Regressão no refactor do Kanban (7b)**: mover handlers sem alterar corpo; smoke manual do gesto 🔗 logo após o refactor.
2. **Off-by-one de fuso nas visões (7b)**: todo parsing de data em UTC (`T00:00:00Z`), comparações de intervalo por string ISO.
3. **Blocos com prazo/data nulos** (criados via `bloco_grupo` sem valores): visões mostram "—"/aside; extensão copia `None`; modal estender mostra "sem prazo definido".
4. **Exclusão apaga histórico SIEX (9)**: deliberado no piloto; produção = gating por cargo + possível arquivamento (ADR-012).
5. **Janela de datas fixa em código (10)**: se a empresa planejar mais de 2 anos à frente, ajustar a constante — decisão barata registrada no validador.
