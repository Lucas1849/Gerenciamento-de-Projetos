# Visão Geral da Arquitetura

Este documento descreve o estado atual do sistema (as-is) e o estado alvo (to-be) que guia a continuidade do projeto. Contexto completo do produto está em [../features/roadmap.md](../features/roadmap.md) e as decisões técnicas específicas em [decisoes.md](decisoes.md).

## Stack

- **Backend:** Python + FastAPI + SQLAlchemy, banco SQLite (`backend/piloto_projetos.db`).
- **Frontend:** React 19 + Vite, sem TypeScript, sem router, sem lib de drag-and-drop. Navegação feita por estado do componente (`useState`) em `App.jsx`.
- **Autenticação:** nenhuma neste piloto. O login real vive na plataforma Apoio Hub (separada, hospedada no Hostgator), mantida por outro membro. A integração com ela é um item de roadmap, não faz parte da base sólida atual.

## Estado atual (as-is)

### Backend

- O backend está **modularizado**. `backend/main.py` é o entrypoint fino: instancia o FastAPI, configura CORS, roda `Base.metadata.create_all()` e inclui os routers por domínio.
- Rotas em `backend/app/routes/` (um router por domínio): `colaboradores.py`, `professores.py`, `gestoes.py`, `catalogo.py`, `projetos.py`, `etapas.py`.
- Camadas de apoio: `backend/app/utils/db.py` (dependência `get_db`), `backend/app/services/projetos.py` (lógica de cascade na exclusão de projetos), `backend/app/database.py` (engine/session), `backend/app/models/banco_de_dados.py` (todos os modelos ORM) e `backend/app/schemas.py` (todos os schemas Pydantic).
- `backend/app/main.py` (o resíduo vazio da tentativa antiga de modularização) foi **removido**.
- `backend/requirements.txt` e `backend/.env.example` estão populados com as dependências e variáveis reais.
- Modelo de dados atual (`banco_de_dados.py`): já é o modelo novo — `Gestao`, `Servico`, `EtapaTemplate`, `Professor`, `Projeto`, `Etapa`, `EtapaConsultor` (ver [../features/modelo-dados.md](../features/modelo-dados.md) para o detalhamento; o catálogo validado está em [../features/catalogo-servicos.md](../features/catalogo-servicos.md)).

### Frontend

O frontend foi **reescrito para o modelo novo** e consome a API modularizada. A navegação é em **dois níveis**, ainda via `useState` em `App.jsx` (sem router):

- **Nível 1 — galeria de gestões:** `App.jsx` lista as `Gestao` (semestres); ao entrar numa gestão, `KanbanFases.jsx` mostra os projetos num Kanban de **5 colunas** por `Projeto.fase` (`kickoff` → `andamento` → `finalizacao` → `ajustes` → `concluido`).
- **Nível 2 — página do projeto:** `PaginaProjeto.jsx` abre um projeto; `KanbanEtapas.jsx` (renomeado de `Kanban.jsx`) mostra as etapas num Kanban de **3 colunas** por `Etapa.status`, com a equipe exibida por etapa (`EtapaConsultor`).
- `FormularioProjetos.jsx` reescrito: select de serviço (com preview das etapas-template do serviço escolhido), consultores iniciais em número variável e checkbox de `tap_assinado`.
- Novos formulários: `FormularioGestao.jsx` e `FormularioProfessor.jsx`.
- `components/fases.js` centraliza as constantes de fase; `services/api.js` foi estendido para todos os domínios novos (gestões, catálogo, professores, projetos, etapas).
- `FormularioColaborador.jsx`, `Toast.jsx`: padrões mantidos.

## Próximo passo — Fase 2: semear o catálogo de serviços

As tabelas `Servico`/`EtapaTemplate` existem mas estão **vazias**, e o frontend **não tem UI para criar serviços** (por design — o catálogo é conteúdo validado pela diretoria, não dado de usuário). O próximo passo é criar `backend/app/seed_catalogo.py` para semear o catálogo real a partir de [../features/catalogo-servicos.md](../features/catalogo-servicos.md).

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
