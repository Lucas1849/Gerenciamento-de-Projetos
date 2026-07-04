# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Piloto de uma aplicação de gestão de projetos para a Apoio Consultoria (empresa júnior). Visual alinhado à identidade do "Apoio Hub" (plataforma centralizadora mantida separadamente, fora deste repo), mas roda isolado, com seus próprios dados e sem autenticação real. See [README.md](README.md) for the product pitch and [docs/arquitetura/visao-geral.md](docs/arquitetura/visao-geral.md) for the full as-is/to-be architecture writeup.

## Commands

**Backend** (from `backend/`):
```bash
pip install fastapi uvicorn "sqlalchemy>=2.0" pydantic
uvicorn main:app --reload
```
- API: `http://127.0.0.1:8000`, interactive docs (Swagger): `http://127.0.0.1:8000/docs`
- SQLite DB (`piloto_projetos.db`) is created automatically on first run via `Base.metadata.create_all()` — there is no migration tool (Alembic deliberately not adopted, see ADR-001). To apply a schema change, delete the `.db` file and restart.
- `backend/requirements.txt` is currently empty (tracked but not yet populated) — the pip install line above is the real dependency list until that's fixed.
- No test suite exists yet (`backend/tests/` is empty, untracked scaffolding).

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

### Backend is a single-file monolith — don't assume the `app/routes|services|utils` split exists yet

The FastAPI app that actually runs is `backend/main.py` (project root of `backend/`, not `backend/app/main.py`). It defines every route inline (no service layer):
- `backend/app/database.py` — SQLAlchemy engine/session (SQLite).
- `backend/app/models/banco_de_dados.py` — all ORM models in one file.
- `backend/app/schemas.py` — all Pydantic request/response schemas in one file.

`backend/app/main.py` is tracked in git but **empty** — dead code left over from an abandoned modularization attempt, slated for removal. `backend/app/routes/`, `backend/app/services/`, `backend/app/utils/`, `backend/tests/` exist on disk but are **not tracked in git** — they're scaffolding for the planned modularization (see the continuity plan below), safe to populate without risk of conflicting with committed content.

### The current data model is being replaced — check which one you're looking at

The model *currently implemented* in `banco_de_dados.py` is rigid: `Projeto` has fixed `gerente_id` + `consultor1_id`/`consultor2_id`/`consultor3_id` FKs (exactly 3 consultants, no more, no fewer), `tipo_servico` is a free-text string, and `TarefaKanban` is a flat 3-column board (`TODO`/`DOING`/`DONE`) with one responsible worker per task.

This is being redesigned. The *target* model — catalog of services with per-service stage templates, projects grouped by `Gestao` (semester cohort), flexible many-to-many consultant assignment per stage (`EtapaConsultor`, supporting temporary consultants with `data_entrada`/`data_saida`), and a two-level Kanban (project phase in the gallery vs. stage status inside a project) — is fully specified in [docs/features/modelo-dados.md](docs/features/modelo-dados.md), with the reasoning for each design choice in [docs/arquitetura/decisoes.md](docs/arquitetura/decisoes.md) (ADR-001 through ADR-007). **Read those two files before touching the schema** — they are the source of truth for where this is headed, not the current `banco_de_dados.py`.

The validated content for the service catalog (real stages, expected business days, sources) lives in [docs/features/catalogo-servicos.md](docs/features/catalogo-servicos.md) — already approved by the diretoria, ready to seed once the new model exists.

[docs/features/roadmap.md](docs/features/roadmap.md) lists what's explicitly *out* of scope for the current rebuild (automatic calendar generation, SIEX export, member strengths, real Apoio Hub integration) and why.

### Frontend: manual state-based navigation, no router

`App.jsx` drives screen switching via `useState` (no react-router). `services/api.js` is the single centralized fetch client — all HTTP calls go through it, extending it (rather than calling `fetch` directly in components) keeps error handling consistent. `Toast.jsx` provides the `useToast()`/`ToastContainer` notification pattern used across forms — reuse it for any new form rather than rolling ad hoc alerts.

Current screens: flat project card grid + team roster (`App.jsx`), project detail with tabs for overview and a generic Kanban (`PaginaProjeto.jsx`, `Kanban.jsx`). Per the target model above, this is expected to become a two-level navigation (gallery of `Gestao` → 5-column project-phase Kanban → project page with a 3-column stage Kanban) — don't be surprised if components get renamed/restructured to match (e.g. `Kanban.jsx` → `KanbanEtapas.jsx`).

### Design system

`frontend/src/App.css` (and `index.css`) define the visual identity via CSS custom properties (`--color-brand`, `--sp-*` spacing scale, `--text-*` type scale, etc.) intended to match the Apoio Hub's look. Reuse these tokens instead of hardcoding colors/spacing in component styles.
