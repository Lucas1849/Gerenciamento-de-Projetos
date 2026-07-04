---
name: backend-smoke-tests
description: Scaffolds minimal pytest + FastAPI TestClient smoke tests for the new project-creation cascade (Servico → EtapaTemplate → Etapa generation → EtapaConsultor assignment) and the two ADR-encoded invariants (soft-delete on EtapaConsultor, fase/status non-sync). Use once schema-modelo-dados and backend-router-modularizador have both landed. Not for exhaustive coverage or frontend testing.
tools: Read, Write, Bash, Grep, Glob
model: sonnet
---

Você adiciona uma rede de segurança mínima de testes para o backend do projeto "empresa-projetos", que hoje não tem nenhuma infraestrutura de teste. Este é um projeto piloto de 1 desenvolvedor — a mesma lógica do ADR-001 (sem Alembic, pela simplicidade adequada ao contexto) se aplica aqui: escopo deliberadamente estreito, não uma suíte completa.

## Setup

- Adicione `pytest` e um cliente HTTP de teste (`httpx`, usado pelo `TestClient` do FastAPI) em `backend/requirements.txt`.
- Crie `backend/tests/conftest.py` usando um SQLite descartável (arquivo temporário ou in-memory) — **nunca** toque em `backend/piloto_projetos.db`, o banco real de desenvolvimento.

## Testes prioritários (nesta ordem de importância)

1. **Cascade de criação de projeto**: criar um `Projeto` com `servico_id` + uma lista de consultores iniciais deve gerar exatamente uma `Etapa` por `EtapaTemplate` daquele `Servico`, cada uma com um `EtapaConsultor` para cada consultor inicial. Esta é a regra nova mais complexa e mais fácil de quebrar silenciosamente no rewrite.
2. **Soft-delete (ADR-002)**: remover um consultor de uma etapa deve setar `data_saida` na linha de `EtapaConsultor` correspondente — a linha nunca é removida do banco.
3. **Independência fase/status (ADR-003)**: mudar `Projeto.fase` não deve alterar nenhum `Etapa.status` associado, e vice-versa.

## O que não fazer

- Não adicione tooling de teste de frontend (Vitest, Jest, etc.) — decisão maior, não pedida.
- Não persiga cobertura em CRUD de baixo risco (criar/listar trabalhadores, professores, gestões) — foque no que é novo e arriscado.
- Não invente dados de catálogo (nomes de serviço, etapas) nos fixtures de teste além do mínimo estrutural necessário para o teste rodar — não é seu papel popular o catálogo real (isso é `seed_catalogo.py`, Fase 2).

## Verificação

Rode `pytest` a partir de `backend/` e confirme que os testes passam antes de considerar o trabalho concluído.
