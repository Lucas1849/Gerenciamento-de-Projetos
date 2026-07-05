# Apoio Hub — Gestão de Projetos

Aplicação de gestão de projetos para os gerentes da Apoio Consultoria (empresa júnior). Centraliza o andamento e a documentação dos projetos: alocação de equipe, etapas por tipo de serviço, e Kanban de acompanhamento.

Este repositório é um **piloto** — visual alinhado à identidade do Apoio Hub (plataforma centralizadora da empresa, mantida separadamente), mas por enquanto rodando isolado, com seus próprios dados e sem autenticação real. Desde a Fase 3, o tema é **dark, réplica do Apoio Hub** (sidebar completa como shell decorativo; só "Projetos" e "Membros" são funcionais no piloto).

Contexto completo do produto, decisões de arquitetura e roadmap: veja [docs/arquitetura/visao-geral.md](docs/arquitetura/visao-geral.md).

## Stack

- **Backend:** Python + FastAPI + SQLAlchemy + SQLite
- **Frontend:** React 19 + Vite (+ `lucide-react` para os ícones)

## Rodando o backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

- API disponível em `http://127.0.0.1:8000`
- Documentação interativa (Swagger) em `http://127.0.0.1:8000/docs`
- O banco SQLite (`piloto_projetos.db`) é criado automaticamente na primeira execução, dentro de `backend/`.
- Depois de criar o banco (ou de apagá-lo para mudança de schema — fluxo ADR-001), semeie o catálogo de serviços: `python -m app.seed_catalogo` (de dentro de `backend/`).

## Rodando o frontend

```bash
cd frontend
npm install
npm run dev
```

- Aplicação disponível em `http://localhost:5173` (padrão do Vite)
- O endereço do backend é configurado em `frontend/src/services/api.js` (`BASE_URL`)

## Estrutura do projeto

```
backend/
  main.py                      # entrypoint fino (FastAPI, CORS, create_all, routers)
  app/
    database.py                # configuração da conexão SQLAlchemy
    schemas.py                 # schemas Pydantic (request/response)
    seed_catalogo.py           # seed do catálogo aprovado pela diretoria (Fase 2)
    models/banco_de_dados.py   # modelos SQLAlchemy (tabelas)
    routes/                    # um router por domínio (projetos, etapas, catálogo...)
    services/projetos.py       # cascade de criação de projeto
    utils/db.py                # dependência get_db
  tests/                       # smoke tests (pytest)
frontend/
  src/
    App.jsx / App.css          # layout, sidebar shell do Hub, tokens do design system
    components/                # telas e componentes React
    services/api.js            # cliente centralizado de chamadas à API
docs/
  arquitetura/                 # visão geral e decisões de arquitetura (ADRs)
  features/                    # modelo de dados, catálogo, roadmap, plano de fases
```

## Documentação

- [Visão geral da arquitetura (as-is / to-be)](docs/arquitetura/visao-geral.md)
- [Decisões de arquitetura (ADRs)](docs/arquitetura/decisoes.md)
- [Modelo de dados](docs/features/modelo-dados.md)
- [Catálogo de serviços e etapas padrão](docs/features/catalogo-servicos.md)
- [Plano de continuidade — Fases 3 a 6 (status e decisões)](docs/features/plano-fases-3-6.md)
- [Roadmap futuro](docs/features/roadmap.md)
