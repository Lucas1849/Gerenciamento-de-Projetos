# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Piloto de uma aplicação de gestão de projetos para a Apoio Consultoria (empresa júnior). Visual alinhado à identidade do "Apoio Hub" (plataforma centralizadora mantida separadamente, fora deste repo), mas roda isolado, com seus próprios dados e sem autenticação real. See [README.md](README.md) for the product pitch and [docs/arquitetura/visao-geral.md](docs/arquitetura/visao-geral.md) for the full as-is/to-be architecture writeup.

## Commands

**Backend** (from `backend/`):
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
- API: `http://127.0.0.1:8000`, interactive docs (Swagger): `http://127.0.0.1:8000/docs`
- SQLite DB (`piloto_projetos.db`) is created automatically on first run via `Base.metadata.create_all()` — there is no migration tool (Alembic deliberately not adopted, see ADR-001). To apply a schema change, delete the `.db` file and restart.
- `backend/requirements.txt` is populated with the real dependencies (fastapi, uvicorn, sqlalchemy>=2.0, pydantic>=2.0); `backend/.env.example` documents the environment variables.
- Smoke tests exist in `backend/tests/` (`conftest.py` + `test_smoke.py`, 3 tests). Run them from `backend/` with `pytest`.

**Frontend** (from `frontend/`):
```bash
npm install
npm run dev       # Vite dev server, http://localhost:5173
npm run build
npm run lint
npm run preview
```
- Backend URL is configured via `BASE_URL` in `frontend/src/services/api.js`.

## Architecture

### Backend is modularized — thin entrypoint plus per-domain routers

The FastAPI app is `backend/main.py` (project root of `backend/` — there is no `backend/app/main.py`; the old empty one was removed). It is a thin entrypoint: FastAPI instance, CORS, `Base.metadata.create_all()` and `include_router` calls. The layers:
- `backend/app/routes/` — one router per domain: `colaboradores.py`, `professores.py`, `gestoes.py`, `catalogo.py`, `projetos.py`, `etapas.py`.
- `backend/app/services/projetos.py` — cascade logic for project creation (Projeto → Etapas from templates → EtapaConsultor).
- `backend/app/utils/db.py` — the `get_db` dependency.
- `backend/app/database.py` — SQLAlchemy engine/session (SQLite).
- `backend/app/models/banco_de_dados.py` — all ORM models in one file.
- `backend/app/schemas.py` — all Pydantic request/response schemas in one file.

### The new data model is implemented — frontend and backend both use it

`banco_de_dados.py` now implements the redesigned model: `Gestao` (semester cohort), `Servico` + `EtapaTemplate` (service catalog with stage templates), `Professor`, `Projeto`, `Etapa`, and `EtapaConsultor` (flexible many-to-many consultant assignment per stage, supporting temporary consultants with `data_entrada`/`data_saida`), supporting the two-level Kanban (project phase in the gallery vs. stage status inside a project). The full spec is in [docs/features/modelo-dados.md](docs/features/modelo-dados.md), with the reasoning for each design choice in [docs/arquitetura/decisoes.md](docs/arquitetura/decisoes.md) (ADR-001 through ADR-007). **Read those two files before touching the schema** — they remain the source of truth for intent.

**Fase 2 is done: the service catalog is seeded via script.** `backend/app/seed_catalogo.py` transcribes the diretoria-approved catalog from [docs/features/catalogo-servicos.md](docs/features/catalogo-servicos.md) (9 services with real stages and expected business days; stages sharing the same `ordem` are block deliveries). Run it from `backend/` with `python -m app.seed_catalogo` — it is idempotent (skips services whose name already exists) and must be re-run after deleting the `.db` file (ADR-001 flow). The frontend still has no UI to create services, by design — the catalog is diretoria-validated content, not user data; changes go through the doc first (ADR-005).

[docs/features/roadmap.md](docs/features/roadmap.md) lists what's explicitly *out* of scope for the current rebuild (automatic calendar generation, SIEX export, member strengths, real Apoio Hub integration) and why.

[docs/arquitetura/agentes-claude-code.md](docs/arquitetura/agentes-claude-code.md) documents the custom Claude Code subagents (`.claude/agents/*.md`) set up to execute this rebuild — schema rewrite, backend modularization, frontend nav, docs sync, smoke tests — and the order they're meant to run in. Prefer invoking those over ad hoc prompts when doing Fase 1 work covered by their scope.

### Frontend: manual state-based navigation, no router

`App.jsx` drives screen switching via `useState` (no react-router). `services/api.js` is the single centralized fetch client — all HTTP calls go through it, extending it (rather than calling `fetch` directly in components) keeps error handling consistent. `Toast.jsx` provides the `useToast()`/`ToastContainer` notification pattern used across forms — reuse it for any new form rather than rolling ad hoc alerts.

Navigation is two-level: gallery of `Gestao` (`App.jsx`) → 5-column project-phase Kanban per gestão (`KanbanFases.jsx`, columns from `Projeto.fase`) → project page (`PaginaProjeto.jsx`) with a 3-column stage Kanban (`KanbanEtapas.jsx`, renamed from `Kanban.jsx`, columns from `Etapa.status`, team shown per stage). `FormularioProjetos.jsx` was rewritten (service select with stage-template preview, variable number of initial consultants, `tap_assinado` checkbox); `FormularioGestao.jsx` and `FormularioProfessor.jsx` are new; `components/fases.js` holds the phase constants; `api.js` covers all the new domains.

### Design system

`frontend/src/App.css` (and `index.css`) define the visual identity via CSS custom properties (`--color-brand`, `--sp-*` spacing scale, `--text-*` type scale, etc.) intended to match the Apoio Hub's look. Reuse these tokens instead of hardcoding colors/spacing in component styles.
