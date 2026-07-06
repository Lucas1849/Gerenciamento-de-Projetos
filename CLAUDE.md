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
- `backend/requirements.txt` is populated with the real dependencies (fastapi, uvicorn, sqlalchemy>=2.0, pydantic>=2.0, workalendar); `backend/.env.example` documents the environment variables.
- Tests exist in `backend/tests/` (`conftest.py`, `test_smoke.py`, `test_fase5.py`, `test_fase6.py`, `test_fase8.py`, `test_fase9.py`, `test_fase10.py` — 31 tests). Run them from `backend/` with `pytest`.

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

**Fases 3, 4 and 5 are done** (Apoio Hub dark retheme + sidebar shell + responsiveness; TAP status toggle; stage dates + custom stage editor). Fase 5 (ADR-008): `Etapa.data_inicio` stored, end date always **derived** via business days with national holidays (`app/utils/calendario.py`, workalendar; preview via `GET /calendario/data-fim` — the frontend never computes dates locally); `POST /projetos/` accepts an optional `etapas` list (custom creation: reordered/edited/manual stages, positional `ordem` assigned by the backend, blocks via `bloco_grupo`; `Etapa.bloco_entrega` is now a shared uuid block key, not a label); `EtapasEditor.jsx` + `etapasEditorUtils.js` provide the editable/sortable stage cards in `FormularioProjetos.jsx` (@dnd-kit, arrow-key fallback), and the payload only includes `etapas` when the user actually edited them. **Fase 6 is done** (ADR-009): interactive block deliveries — `POST /projetos/{id}/blocos` / `DELETE /projetos/{id}/blocos/{chave}` form/undo blocks on existing projects (shared uuid key + prazo/data written redundantly on each member; status stays individual per etapa); `KanbanEtapas.jsx` renders each block as a single card in the column of the least-advanced etapa with "X/Y concluídas" progress and an undo button; the link gesture (drag the 🔗 handle of a loose card onto another + confirm in the shared `ModalBloco.jsx`) exists in the stage Kanban (calls the API via `criarBloco()`/`desfazerBloco()` in `api.js`) and in the creation editor (local merge only — the backend materializes via `bloco_grupo`). The approved plan, product decisions and per-phase status live in [docs/features/plano-fases-3-6.md](docs/features/plano-fases-3-6.md).

**Fases 7a and 7b are done.** 7a: Etapas tab is now first and the default in `PaginaProjeto.jsx`. 7b (ADR-010): `EtapasProjeto.jsx` is the container for the Etapas tab — it fetches etapas + colaboradores once, owns the shared handlers (status, equipe, recarregar) and a pill sub-nav switching four views: `KanbanEtapas.jsx` (now a props-controlled view, still encapsulating the 🔗 DndContext gesture and bloco API calls), `TabelaEtapas.jsx`, `CronogramaEtapas.jsx` and `CalendarioEtapas.jsx` (month state shared via `NavMes.jsx`); `datasUtils.js` holds calendar-grid arithmetic (UTC, ISO-string comparisons — business-day math stays backend-only per ADR-008) and `etapasUtils.js` holds RANK/FLUXO/block grouping with "Bloco N" labels. **Fase 8 is done** (ADR-011): N-etapa blocks — `POST /projetos/{id}/blocos/{chave}/etapas` extends an existing block (new etapas adopt the block's prazo/data, status stays individual) and `DELETE /projetos/{id}/blocos/{chave}/etapas/{etapa_id}` removes a specific member (block dissolves when 1 member would remain — minimum block = 2); "Desfazer bloco" total is untouched. In the Kanban, `CardBloco` is a droppable (`bloco-{chave}`) so dragging a loose card's 🔗 onto a block extends it (confirmed in `ModalBloco.jsx` `modo="estender"`, prazo/data read-only), and each member has an `Unlink` button; the creation editor also allows merging a loose card into a block item (target keeps its dias/data). **Fase 9 is done** (ADR-012): `DELETE /projetos/{id}` cascades (EtapaConsultor → Etapas → Projeto, via `cascade="all, delete-orphan"` on the ORM relationships — deliberate SIEX-history loss, acceptable in the pilot); `DELETE /gestoes/{id}` returns 409 if the gestão still has projects; trash buttons (`Trash2`/`btn-ghost-danger`) on gestão cards and project cards with strong `window.confirm`. **Fase 10 is done** (ADR-013): date plausibility — `data_inicio` must be within 01/01/(current year − 1) to 31/12/(current year + 2), single source of truth in `janela_datas_plausiveis()`/`validar_data_plausivel()` (`app/utils/calendario.py`), applied via Pydantic `field_validator` on `EtapaProjetoCriar`/`EtapaCriar`/`BlocoCriar` → 422 in Portuguese; the frontend mirrors it for UX only (`janelaDatas()`/`dataPlausivel()` in `datasUtils.js`, `min`/`max` on date inputs, submit pre-check). **Fase 11 is planned but NOT started** (externally gated on Hub DB access) — the product owner explicitly ordered that no phase begins without his direct command. The executable plan lives in [docs/features/plano-fases-7-11.md](docs/features/plano-fases-7-11.md). **Read that plan before executing any of those phases.**

The real Apoio Hub database schema (25 MySQL tables) was mapped on 05/07/2026 — analysis, pilot↔Hub correspondence and the piloto→produção removal checklist live in [docs/arquitetura/integracao-apoio-hub.md](docs/arquitetura/integracao-apoio-hub.md) (the raw CSV lives locally at `docs/arquitetura/dados/apoio-hub-columns.csv` but is **gitignored** — internal platform metadata; the doc transcribes what matters). Key facts: `plataforma_hub_funcionarios` already covers members (photos, status, `nivel_acesso` for future permission gating); the Hub already has a thin projetos/etapas module with the same phase/status enums; `Professor` has no Hub counterpart.

[docs/features/roadmap.md](docs/features/roadmap.md) lists what's explicitly *out* of scope for the current rebuild (automatic calendar generation, SIEX export, member strengths, real Apoio Hub integration, Clicksign TAP auto-update) and why.

[docs/arquitetura/agentes-claude-code.md](docs/arquitetura/agentes-claude-code.md) documents the custom Claude Code subagents (`.claude/agents/*.md`) set up to execute this rebuild — schema rewrite, backend modularization, frontend nav, docs sync, smoke tests — and the order they're meant to run in. Prefer invoking those over ad hoc prompts when doing Fase 1 work covered by their scope.

### Frontend: manual state-based navigation, no router

`App.jsx` drives screen switching via `useState` (no react-router). `services/api.js` is the single centralized fetch client — all HTTP calls go through it, extending it (rather than calling `fetch` directly in components) keeps error handling consistent. `Toast.jsx` provides the `useToast()`/`ToastContainer` notification pattern used across forms — reuse it for any new form rather than rolling ad hoc alerts.

Navigation is two-level: gallery of `Gestao` (`App.jsx`) → 5-column project-phase Kanban per gestão (`KanbanFases.jsx`, columns from `Projeto.fase`, Hub-style column headers with colored dots/counts and a ghost "+ Novo projeto" affordance; cards show service chip, GERENTE block and consultant avatars from the enriched `GET /projetos/`) → project page (`PaginaProjeto.jsx`, where the TAP signature status can be toggled after creation via `PUT /projetos/{id}` — the Clicksign auto-update idea is roadmap-only) with a 3-column stage Kanban (`KanbanEtapas.jsx`, renamed from `Kanban.jsx`, columns from `Etapa.status`, team shown per stage). `FormularioProjetos.jsx` was rewritten (service select with stage-template preview, variable number of initial consultants, `tap_assinado` checkbox); `FormularioGestao.jsx` and `FormularioProfessor.jsx` are new; `components/fases.js` holds the phase constants; `api.js` covers all the new domains.

The sidebar is a **decorative shell replicating the real Apoio Hub sidebar**: only **Projetos** and **Membros** are functional; the other items (Home, Chat, Rankings, etc.) are `aria-disabled` placeholders — do not wire them up. The Membros screen shows the team as a Hub-style card grid (`AvatarIniciais.jsx` renders initials avatars — the model has no photos); its colaborador/professor registration forms are **temporary test scaffolding** until the pilot gets access to the real Hub tables (roadmap).

### Design system

`frontend/src/App.css` (and `index.css`) define the visual identity via CSS custom properties (`--color-brand`, `--sp-*` spacing scale, `--text-*` type scale, `--fase-*` kanban dot colors, etc.). Since Fase 3 the theme is **dark, matching the Apoio Hub** (background `#0D0D15`, surfaces `#16161F`, indigo brand `#6C5CE7`). Reuse these tokens instead of hardcoding colors/spacing in component styles; prefer the `.form-*` utility classes over inline styles in forms. Icons come from `lucide-react`; drag-and-drop from `@dnd-kit/*` (the only frontend dependencies besides react/react-dom). Responsive behavior: full sidebar ≥1024px, icon rail 768–1023px, off-canvas drawer + topbar <768px.
