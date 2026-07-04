# Visão Geral da Arquitetura

Este documento descreve o estado atual do sistema (as-is) e o estado alvo (to-be) que guia a continuidade do projeto. Contexto completo do produto está em [../features/roadmap.md](../features/roadmap.md) e as decisões técnicas específicas em [decisoes.md](decisoes.md).

## Stack

- **Backend:** Python + FastAPI + SQLAlchemy, banco SQLite (`backend/piloto_projetos.db`).
- **Frontend:** React 19 + Vite, sem TypeScript, sem router, sem lib de drag-and-drop. Navegação feita por estado do componente (`useState`) em `App.jsx`.
- **Autenticação:** nenhuma neste piloto. O login real vive na plataforma Apoio Hub (separada, hospedada no Hostgator), mantida por outro membro. A integração com ela é um item de roadmap, não faz parte da base sólida atual.

## Estado atual (as-is)

### Backend

- O app que **de fato roda** é `backend/main.py` (arquivo único na raiz do backend). Ele importa de `backend/app/database.py`, `backend/app/models/banco_de_dados.py` e `backend/app/schemas.py`, e define todas as rotas inline, sem camada de serviço.
- `backend/app/main.py` está **vazio e versionado no git** — resíduo de uma tentativa de modularização que não foi concluída. `backend/app/routes/`, `backend/app/services/`, `backend/app/utils/` e `backend/tests/` existem no disco mas **não estão versionados** (scaffolding local morto).
- `backend/requirements.txt` e `backend/.env.example` estão versionados e vazios — as dependências reais nunca foram documentadas.
- `backend/piloto_projetos.db` está versionado no git, o que gera diffs binários a cada execução local.
- Modelo de dados atual (`banco_de_dados.py`):
  - `Trabalhador`: colaborador (nome, cargo, e-mail institucional).
  - `Projeto`: equipe **fixa** de `gerente_id` + `consultor1_id`/`consultor2_id`/`consultor3_id` (4 FKs fixas para `Trabalhador`); `tipo_servico` como texto livre; `status`, `kickoff_realizado` e `tap_assinado` como três campos de ciclo de vida separados e não sincronizados entre si.
  - `TarefaKanban`: tarefa com um único `trabalhador_id` responsável, `coluna_status` livre (`TODO`/`DOING`/`DONE`), e um campo `depende_de_id` que nunca chegou a ser usado (o frontend sempre envia `null`).
- Já houve uma tentativa de tabela de catálogo de serviços (`ServicosApoio`, commit `c71e220`), revertida no commit seguinte (`3e2d27b`) só para permitir testes de estilização. Não foi retomada até agora.

### Frontend

- `App.jsx`: sidebar com "Projetos" e "Equipe", projetos exibidos em grid **flat** (sem agrupamento por gestão/semestre).
- `PaginaProjeto.jsx`: abre um projeto com abas "Visão Geral" e "Quadro Kanban".
- `Kanban.jsx`: quadro genérico de 3 colunas (`TODO`/`DOING`/`DONE`) por projeto, uma tarefa = um responsável.
- `FormularioProjetos.jsx`: `tipo_servico` é input de texto livre; equipe são 4 selects fixos.
- `FormularioColaborador.jsx`, `Toast.jsx`, `services/api.js`: padrões sólidos, mantidos como estão.

## Estado alvo (to-be)

O modelo de dados e a navegação precisam suportar o que o produto realmente exige (ver [../features/modelo-dados.md](../features/modelo-dados.md) para o detalhamento completo das entidades):

- **Catálogo de serviços** com etapas padrão por tipo de serviço (dias úteis + descrição), carregadas automaticamente ao criar um projeto.
- **Gestões** (semestres, ex. "2026.1") como nível de agrupamento na galeria de projetos.
- **Equipe flexível por etapa**, não fixa por projeto: qualquer número de consultores, incluindo temporários que entram/saem ao longo do tempo (necessário para a futura ficha SIEX).
- **Kanban em dois níveis**: fase do projeto (`kickoff` → `andamento` → `finalizacao` → `ajustes` → `concluido`) na galeria da gestão, e status de cada etapa (`não iniciada` → `em andamento` → `concluída`) dentro do projeto.
- Backend modularizado em routers por domínio (colaboradores, professores, gestões, catálogo de serviços, projetos, etapas), com `backend/main.py` como entrypoint fino.

Funcionalidades de maior esforço (calendário automático, exportação SIEX, pontos fortes dos membros, integração real com o Apoio Hub) ficam registradas em [../features/roadmap.md](../features/roadmap.md) e não fazem parte desta base sólida.

## Decisão sobre os resíduos identificados

- `backend/app/main.py` (vazio, versionado): **será removido**. `backend/main.py` continua sendo o único entrypoint real, agora modularizado.
- `backend/app/routes/`, `services/`, `utils/`, `tests/` (não versionados): serão populados de verdade como parte da modularização — nenhum risco em reaproveitar, pois nunca existiu conteúdo versionado ali.
- `backend/requirements.txt`, `.env.example`: serão preenchidos com as dependências reais em uso.
- `backend/piloto_projetos.db`: será removido do controle de versão e ignorado via `.gitignore` (dado de piloto, descartável — confirmado com o responsável pelo projeto).
