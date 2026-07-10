# Visão Geral da Arquitetura

Este documento descreve o estado atual do sistema (as-is) e o estado alvo (to-be) que guia a continuidade do projeto. Contexto completo do produto está em [../features/roadmap.md](../features/roadmap.md) e as decisões técnicas específicas em [decisoes.md](decisoes.md).

## Stack

- **Backend:** Python + FastAPI + SQLAlchemy, banco SQLite (`backend/piloto_projetos.db`).
- **Frontend:** React 19 + Vite, sem TypeScript, sem router. Navegação feita por estado do componente (`useState`) em `App.jsx`. Ícones via `lucide-react` (line icons, estilo do Apoio Hub).
- **Autenticação:** nenhuma neste piloto. O login real vive na plataforma Apoio Hub (separada, hospedada no Hostgator), mantida por outro membro. A integração com ela é um item de roadmap, não faz parte da base sólida atual.

## Estado atual (as-is)

### Backend

- O backend está **modularizado**. `backend/main.py` é o entrypoint fino: instancia o FastAPI, configura CORS, roda `Base.metadata.create_all()` e inclui os routers por domínio.
- Rotas em `backend/app/routes/` (um router por domínio): `colaboradores.py`, `professores.py`, `gestoes.py`, `catalogo.py`, `projetos.py`, `etapas.py`.
- Camadas de apoio: `backend/app/utils/db.py` (dependência `get_db`), `backend/app/services/projetos.py` (lógica de cascade na exclusão de projetos), `backend/app/database.py` (engine/session), `backend/app/models/banco_de_dados.py` (todos os modelos ORM) e `backend/app/schemas.py` (todos os schemas Pydantic).
- `backend/app/main.py` (o resíduo vazio da tentativa antiga de modularização) foi **removido**.
- `backend/requirements.txt` e `backend/.env.example` estão populados com as dependências e variáveis reais.
- Modelo de dados atual (`banco_de_dados.py`): já é o modelo novo — `Gestao`, `Servico`, `EtapaTemplate`, `Professor`, `Projeto`, `Etapa`, `EtapaConsultor` (ver [../features/modelo-dados.md](../features/modelo-dados.md) para o detalhamento; o catálogo validado está em [../features/catalogo-servicos.md](../features/catalogo-servicos.md)).
- `GET /projetos/` responde com `ProjetoListaResposta`: cada projeto embute a `equipe` derivada (união dos consultores ativos das etapas, ADR-002) — usada nos avatares dos cards do Kanban de fases. O helper `equipe_derivada()` em `routes/projetos.py` é compartilhado entre a listagem e o detalhe.

### Frontend

O frontend foi **reescrito para o modelo novo** e consome a API modularizada. Desde a Fase 3, o visual segue a **identidade do Apoio Hub**: tema dark (tokens em `App.css`), acento indigo (`#6C5CE7`) e uma **sidebar réplica do Hub como shell decorativo** — só os itens **Projetos** e **Membros** são funcionais; os demais (Home, Chat, Rankings etc.) existem apenas na plataforma real. O layout é responsivo: sidebar completa (≥1024px), rail só-ícones (768–1023px) e drawer off-canvas com topbar (<768px); os kanbans ganham scroll horizontal em telas médias e empilham em telas estreitas.

A tela **Membros** exibe a equipe em grid de cards (avatares por iniciais via `AvatarIniciais.jsx` — o modelo não tem foto); o cadastro de colaboradores/professores nela é **provisório para testes**, até o piloto ter acesso às tabelas do Hub (roadmap).

A navegação é em **dois níveis**, ainda via `useState` em `App.jsx` (sem router):

- **Nível 1 — galeria de gestões:** `App.jsx` lista as `Gestao` (semestres); ao entrar numa gestão, `GaleriaProjetos.jsx` (Fase 22, ADR-024 — substituiu o Kanban de 5 colunas do antigo `KanbanFases.jsx`) mostra os projetos numa **galeria de cards** (3 por linha no desktop, 2/1 em telas menores) com badge de `Projeto.fase` (`kickoff` → `andamento` → `finalizacao` → `ajustes` → `concluido`) no canto do card, chips de filtro por fase com contagem, card fantasma "+ Novo projeto" e cards com chip do serviço, bloco GERENTE e avatares dos consultores (equipe derivada embutida pelo `GET /projetos/`); a fase é alterada pelo select da aba Visão Geral do projeto.
- **Nível 2 — página do projeto:** `PaginaProjeto.jsx` abre um projeto; `KanbanEtapas.jsx` (renomeado de `Kanban.jsx`) mostra as etapas num Kanban de **3 colunas** por `Etapa.status`, com a equipe exibida por etapa (`EtapaConsultor`).
- `FormularioProjetos.jsx` reescrito: select de serviço (com preview das etapas-template do serviço escolhido), consultores iniciais em número variável e checkbox de `tap_assinado`.
- Novos formulários: `FormularioGestao.jsx` e `FormularioProfessor.jsx`.
- `components/fases.js` centraliza as constantes de fase; `services/api.js` foi estendido para todos os domínios novos (gestões, catálogo, professores, projetos, etapas).
- `FormularioColaborador.jsx`, `Toast.jsx`: padrões mantidos.

## Fase 2 — catálogo de serviços semeado (concluída)

`backend/app/seed_catalogo.py` semeia `Servico`/`EtapaTemplate` com o catálogo real aprovado pela diretoria em [../features/catalogo-servicos.md](../features/catalogo-servicos.md) (9 serviços; etapas com a mesma `ordem` são entregas em bloco). Rodar de `backend/` com `python -m app.seed_catalogo` — idempotente (pula serviços já existentes) e deve ser reexecutado após apagar o `.db` (fluxo ADR-001). O frontend continua **sem UI para criar serviços** (por design — mudanças no catálogo passam pelo documento e nova validação, ADR-005).

## Fase 3 — identidade visual Apoio Hub (concluída em 05/07/2026)

O frontend foi rethemado para a identidade dark do Apoio Hub (tokens em `App.css`), a sidebar virou um **shell decorativo réplica do Hub** (só Projetos e Membros funcionais), a tela Membros exibe a equipe em grid de cards com avatares por iniciais (`AvatarIniciais.jsx`; cadastro mantido como recurso provisório de testes), o Kanban de fases ganhou o visual do Hub (dots, contagens, card com serviço/gerente/consultores — alimentado pelo `GET /projetos/` enriquecido) e o layout ficou responsivo (sidebar → rail → drawer). Detalhes e decisões em [../features/plano-fases-3-6.md](../features/plano-fases-3-6.md).

## Fase 4 — status do TAP editável (concluída em 05/07/2026)

A página do projeto permite marcar o TAP como assinado (e reverter, com confirmação) após a criação, via `PUT /projetos/{id}` — endpoint que já existia; a fase adicionou a UI, o toast e o teste de contrato que sela a independência TAP × fase (ADR-007). A ideia de atualização automática via Clicksign ficou **somente no roadmap** ([../features/roadmap.md](../features/roadmap.md)).

## Fase 5 — datas nas etapas + editor de cards na criação (concluída em 05/07/2026)

`Etapa.data_inicio` foi adicionada (mudança de schema — fluxo ADR-001 executado) e a **data final é sempre derivada** por dias úteis com feriados nacionais (`workalendar`, `app/utils/calendario.py`; prévia via `GET /calendario/data-fim` — o frontend nunca calcula datas localmente). `POST /projetos/` aceita o campo opcional `etapas` (criação customizada: reordenada/editada/etapas manuais, ordem posicional atribuída pelo backend; blocos por `bloco_grupo`; `bloco_entrega` virou chave uuid de bloco) — ver ADR-008. No frontend, `EtapasEditor.jsx` (+ `etapasEditorUtils.js`) substitui o preview de chips no `FormularioProjetos.jsx`: cards editáveis (nome, dias úteis, data de início; data final calculada pelo backend), reordenação por arrastar (`@dnd-kit`) com setas ↑/↓ como fallback acessível, "+ Adicionar etapa" e badge "manual"; o payload só inclui `etapas` se houve edição. `KanbanEtapas.jsx` exibe `data_inicio → data_fim` nos cards.

## Fase 6 — entregas em bloco interativas (concluída em 05/07/2026)

Blocos de entrega viraram interativos (ADR-009): no backend, `POST /projetos/{id}/blocos` forma um bloco a partir de etapas existentes (chave uuid compartilhada em `bloco_entrega` + prazo/data aplicados aos membros; 404 para etapa de outro projeto, 409 para etapa já em bloco) e `DELETE /projetos/{id}/blocos/{chave}` o desfaz limpando só a chave (membros mantêm prazo/data/status). No frontend, `KanbanEtapas.jsx` mostra o bloco como **card único** na coluna da etapa menos avançada, com progresso "X/Y concluídas", prazo/data do bloco, lista interna de etapas (status e equipe individuais) e botão "Desfazer bloco"; o **gesto de ligação** (arrastar o handle 🔗 de um card avulso sobre outro + confirmar no `ModalBloco.jsx`) existe no Kanban de etapas (chama a API) e no editor de criação (mescla local; o backend materializa via `bloco_grupo`). Detalhes em [../features/plano-fases-3-6.md](../features/plano-fases-3-6.md).

## Próximas fases (7–11 — planejadas, aguardando comando)

O plano aprovado em 05/07/2026 está em [../features/plano-fases-7-11.md](../features/plano-fases-7-11.md) — **nenhuma fase iniciada** por instrução explícita do responsável: 7a (aba Etapas primeiro/padrão), 7b (visualizações múltiplas de etapas: kanban/tabela/cronograma/calendário com submenu), 8 (blocos com N etapas: estender, retirar etapa específica, romper), 9 (DELETE de gestões/projetos pelos cards), 10 (validação de datas plausíveis) e 11 (go-live/integração com o Hub). O schema real do banco do Apoio Hub foi mapeado — análise e definições piloto → produção em [integracao-apoio-hub.md](integracao-apoio-hub.md).

## Estado alvo (to-be)

O modelo de dados e a navegação precisam suportar o que o produto realmente exige (ver [../features/modelo-dados.md](../features/modelo-dados.md) para o detalhamento completo das entidades):

- **Catálogo de serviços** com etapas padrão por tipo de serviço (dias úteis + descrição), carregadas automaticamente ao criar um projeto.
- **Gestões** (semestres, ex. "2026.1") como nível de agrupamento na galeria de projetos.
- **Equipe flexível por etapa**, não fixa por projeto: qualquer número de consultores, incluindo temporários que entram/saem ao longo do tempo (necessário para a futura ficha SIEX).
- **Kanban em dois níveis**: fase do projeto (`kickoff` → `andamento` → `finalizacao` → `ajustes` → `concluido`) na galeria da gestão, e status de cada etapa (`não iniciada` → `em andamento` → `concluída`) dentro do projeto — **já concluído** no frontend (ver as-is acima).
- Backend modularizado em routers por domínio (colaboradores, professores, gestões, catálogo de serviços, projetos, etapas), com `backend/main.py` como entrypoint fino — **já concluído** (ver as-is acima).

Funcionalidades de maior esforço (calendário automático, exportação SIEX, pontos fortes dos membros, integração real com o Apoio Hub) ficam registradas em [../features/roadmap.md](../features/roadmap.md) e não fazem parte desta base sólida.

## Decisão sobre os resíduos identificados

- ~~`backend/app/main.py` (vazio, versionado)~~: **resolvido** — removido; `backend/main.py` é o único entrypoint, agora fino e modularizado.
- ~~`backend/app/routes/`, `services/`, `utils/` (não versionados)~~: **resolvido** — populados de verdade como parte da modularização.
- ~~`backend/requirements.txt`, `.env.example` vazios~~: **resolvido** — preenchidos com as dependências e variáveis reais em uso.
- `backend/piloto_projetos.db`: **pendente** — ainda está versionado no git (gera diffs binários a cada execução local); será removido do controle de versão e ignorado via `.gitignore` (dado de piloto, descartável — confirmado com o responsável pelo projeto).
