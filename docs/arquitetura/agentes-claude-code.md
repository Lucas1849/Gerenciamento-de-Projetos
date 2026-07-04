# Agentes de IA para a Fase 1 (Claude Code)

Este documento registra o roster de subagentes do Claude Code (`.claude/agents/*.md`) configurados para executar a Fase 1 da reconstrução — reescrita do modelo de dados, modularização do backend e navegação em dois níveis do frontend — e a ordem em que devem ser usados. Complementa [decisoes.md](decisoes.md) (o "porquê" das decisões de schema) e [visao-geral.md](visao-geral.md) (o "o quê" da arquitetura alvo): este arquivo é sobre o "quem/como" — qual agente faz qual parte do trabalho e com quais restrições.

## Por que agentes dedicados

A Fase 1 tem três frentes de trabalho com fontes de verdade documentais diferentes (`modelo-dados.md`, `decisoes.md`, `visao-geral.md`) e regras específicas que uma IA sem esse contexto embutido tende a violar por padrão: inventar dados de catálogo de serviço, tentar migrar dados existentes sem Alembic, ou decidir sozinha uma questão que é da diretoria. Cada agente abaixo nasce com essas restrições já no prompt, em vez de precisar ser reexplicado a cada conversa.

## Roster

| Agente | Escopo | Modelo | Não faz |
|---|---|---|---|
| `schema-modelo-dados` | Reescreve `banco_de_dados.py` + `schemas.py` conforme `modelo-dados.md`; autor do serviço de criação de projeto (cascade) | opus | Routers, frontend |
| `backend-router-modularizador` | Extrai `main.py` para `app/routes/`, `services/`, `utils/` por domínio | sonnet | Mudar schema ou comportamento de rota |
| `frontend-nav-dois-niveis` | Galeria por Gestão → kanban de fases → projeto → kanban de etapas | sonnet | Backend |
| `docs-adr-sync` | Mantém `decisoes.md`/`modelo-dados.md`/`visao-geral.md`/`roadmap.md`/`CLAUDE.md` sincronizados; registra questões que exigem aval da diretoria | sonnet | Código (`.py`/`.jsx`) |
| `backend-smoke-tests` | Testes pytest mínimos para o cascade de criação de projeto e os dois invariantes de ADR (soft-delete, fase/status independentes) | sonnet | Cobertura completa, testes de frontend |

Definições completas (system prompt, ferramentas permitidas) em `.claude/agents/<nome>.md`.

## Ordem de execução

1. **`docs-adr-sync` (passada leve)** — corrige uma inconsistência já identificada no ADR-007 (o cabeçalho diz `Status: pendente`, mas a resposta de `tap_assinado` já está resolvida logo abaixo) e confirma que `decisoes.md`/`modelo-dados.md` estão consistentes entre si antes de qualquer código ser escrito contra eles.
2. **`schema-modelo-dados`** — reescreve models/schemas, cria o serviço de cascade de criação de projeto, apaga e recria o banco local. Raiz de dependência: nomes de campo e relacionamentos aqui moldam tudo que vem depois.
3. **`docs-adr-sync` (intercalado)** — confirma que o schema implementado bate com `modelo-dados.md`.
4. **`backend-router-modularizador`** — só agora extrai `main.py`, já que os corpos de rota precisam ser escritos contra o schema final.
5. **`docs-adr-sync` (intercalado)** — atualiza a seção as-is do backend em `visao-geral.md` e o aviso de monólito no `CLAUDE.md`.
6. **`backend-smoke-tests`** — trava o cascade e os invariantes de ADR com testes, antes do frontend depender dessa API.
7. **`frontend-nav-dois-niveis`** — constrói a navegação em dois níveis, estende `api.js`, corrige o bug do prop `toast` descartado em `Kanban.jsx`. Depende do passo 4 (API estável).
8. **`docs-adr-sync` (passada final)** — atualiza a seção as-is do frontend e reforça que "tabelas `Servico`/`EtapaTemplate` existem" ≠ "catálogo está semeado" (isso é Fase 2, via `seed_catalogo.py`).

`docs-adr-sync` não é um passo isolado no fim — ele intercala depois de cada unidade de trabalho dos outros agentes, para a documentação não driftar do código como já havia acontecido com a seção de backend do `visao-geral.md`.

## Regras que atravessam todos os agentes de implementação

- **ADR-001**: nenhum agente introduz Alembic ou script de migração. Mudança de schema = apagar `backend/piloto_projetos.db` e deixar `create_all()` recriar.
- **ADR-005**: nenhum agente inventa conteúdo de catálogo de serviço (nomes, dias úteis, descrições). `Servico`/`EtapaTemplate` nascem vazios na Fase 1; o seed real (`seed_catalogo.py`, a partir de `catalogo-servicos.md`) é Fase 2.
- Questões de modelagem ou produto que são decisão de negócio (não inferíveis dos documentos) nunca são respondidas silenciosamente por um agente — viram uma entrada nova em `decisoes.md`, registrada pelo `docs-adr-sync`.
