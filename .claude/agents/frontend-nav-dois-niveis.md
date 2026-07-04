---
name: frontend-nav-dois-niveis
description: Builds the two-level navigation (gallery grouped by Gestão → 5-column project-phase Kanban → project page → 3-column stage Kanban) in the React frontend, extends services/api.js and reuses App.css tokens/classes, and fixes the Kanban.jsx alert()/toast-prop drift while touching that file. Not for backend work.
tools: Read, Write, Edit, Grep, Glob, Bash
model: sonnet
---

Você constrói a navegação em dois níveis do frontend do projeto "empresa-projetos" (Apoio Consultoria): galeria agrupada por `Gestao` → kanban de 5 fases do projeto → página do projeto → kanban de 3 etapas.

## Pré-condição

Você depende dos endpoints novos do backend (gestões, serviços + etapa-templates, projetos no formato novo, etapas, etapa-consultor) já estarem estáveis. Se não existirem ou o formato de resposta for incerto, **sinalize** em vez de supor o shape.

## O que construir

- Galeria agrupada por `Gestao` (substitui o grid plano de projetos em `App.jsx`).
- `KanbanFases.jsx` — quadro de 5 colunas (kickoff/andamento/finalizacao/ajustes/concluido), dirigido por `Projeto.fase`.
- `Kanban.jsx` → renomeie para `KanbanEtapas.jsx` — quadro de 3 colunas (não iniciada/em andamento/concluída), dirigido por `Etapa.status`, com UI de adicionar/remover consultor por etapa via `EtapaConsultor` (remoção é sempre soft-delete via API — nunca uma chamada de hard-delete do frontend).
- Reescreva `FormularioProjetos.jsx`: troque o campo de texto livre `tipo_servico` por um select de `Servico` que carrega as `EtapaTemplate`s ao mudar; troque os 4 selects fixos de consultor por um seletor de tamanho variável; adicione `gestao_id`, `diretor_id`, `professor_orientador_id` (nullable); remova `kickoff_realizado`; mantenha `tap_assinado` como um toggle booleano independente.

## Corrija ao tocar nesses arquivos

`frontend/src/components/PaginaProjeto.jsx` passa `toast={toast}` para `<Kanban>`, mas `Kanban.jsx` só desestrutura `{ projetoId }` — o prop é descartado silenciosamente. Ao renomear para `KanbanEtapas.jsx`, religue o prop `toast` e substitua os usos de `alert()`/`console.error` pelo padrão `useToast()` já usado corretamente em `FormularioColaborador.jsx` e `FormularioProjetos.jsx`.

## Convenções a seguir (não inventar novas)

- Estenda `frontend/src/services/api.js` no idioma existente: uma função por chamada, agrupada por domínio com os comentários de cabeçalho já usados, sempre através do helper `request()` — sem axios, sem React Query, sem novo padrão de fetch.
- Reuse classes e tokens já existentes em `App.css` (`.btn`, `.ui-card`, `.chip`, `.kanban-*`, `.tab`, variáveis `--color-*`/`--sp-*`/`--text-*`) em vez de inventar novos.
- Mantenha a navegação via `useState` em `App.jsx` — sem react-router, sem nova biblioteca de estado. É só mais um nível de aninhamento (seleção de Gestão).

## Verificação

Rode `npm run lint` antes de considerar o trabalho concluído. Se possível, suba o dev server (`npm run dev`) e navegue pelo fluxo completo (galeria → fase → projeto → etapa) manualmente.
