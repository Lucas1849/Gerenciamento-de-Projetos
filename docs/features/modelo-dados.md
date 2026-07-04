# Modelo de Dados — Estado Alvo

Descreve as entidades que a Fase 1 vai construir em `backend/app/models/banco_de_dados.py`. Ver o "porquê" de cada decisão em [../arquitetura/decisoes.md](../arquitetura/decisoes.md).

## Entidades

### Gestao

Semestre/ciclo de gestão da empresa júnior (ex. "2026.1"). Usada para agrupar projetos na galeria.

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| nome | string | único, ex. `"2026.1"` |
| ativa | bool | default `false`; usada como default de novos projetos |

### Servico

Catálogo dos 8 serviços da cartela (Pesquisa de Mercado, Plano de Marketing, Plano de Comunicação, Plano de Negócios, Planejamento Estratégico, Plano Operacional, Mapeamento de Processos, Cliente Oculto).

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| nome | string | único |
| descricao | string | opcional |

### EtapaTemplate

Molde de etapa por serviço — usado para gerar as `Etapa` reais de um projeto no momento da criação.

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| servico_id | int | FK → Servico |
| ordem | int | posição da etapa dentro do serviço |
| nome | string | |
| descricao_padrao | string | pré-preenche a etapa gerada |
| dias_uteis_esperados_padrao | int | pré-preenche a etapa gerada |

### Professor

Professor(a) orientador(a) — pessoa externa à empresa júnior, não é um `Trabalhador`.

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| nome | string | |
| email | string | opcional |

### Projeto (reescrito)

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| nome | string | |
| descricao | string | |
| objetivo | string | |
| nome_contratante | string | |
| agregados_contratante | string | texto livre separado por vírgula (mantido como está) |
| servico_id | int | FK → Servico (substitui `tipo_servico` texto livre) |
| gestao_id | int | FK → Gestao |
| fase | string | `kickoff \| andamento \| finalizacao \| ajustes \| concluido` — validado via `Literal` no Pydantic. Substitui `status`, `kickoff_realizado`, `tap_assinado` (ver ADR-007) |
| gerente_id | int | FK → Trabalhador |
| diretor_id | int | FK → Trabalhador |
| professor_orientador_id | int | FK → Professor, nullable (pode ficar pendente enquanto a diretora busca o orientador) |

Removidos: `consultor1_id`, `consultor2_id`, `consultor3_id`, `status`, `kickoff_realizado`, `tap_assinado` (ver ADR-007 sobre este último).

### Etapa (substitui TarefaKanban)

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| projeto_id | int | FK → Projeto |
| etapa_template_id | int | FK → EtapaTemplate, nullable (nulo = etapa adicionada manualmente, fora do template) |
| ordem | int | substitui `depende_de_id` (ver ADR-006) |
| nome | string | |
| descricao | string | |
| dias_uteis_esperados | int | |
| bloco_entrega | string | opcional, mantido como está |
| status | string | `nao_iniciada \| em_andamento \| concluida` |

### EtapaConsultor (associação N:N)

O núcleo da equipe flexível (ADR-002). Permite qualquer número de consultores por etapa, incluindo temporários que entram e saem ao longo do tempo.

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK surrogate (não composta — permite a mesma pessoa reentrar na mesma etapa mais de uma vez) |
| etapa_id | int | FK → Etapa |
| trabalhador_id | int | FK → Trabalhador |
| data_entrada | date | |
| data_saida | date | nullable = ainda ativo na etapa. Remoção de consultor é **soft delete**: preenche esta data, nunca apaga a linha (necessário para a futura ficha SIEX) |

### Trabalhador

Sem mudanças nesta fase (`nome`, `cargo`, `emailInstitucional`). Campo de "pontos fortes" fica fora do escopo atual — ver [roadmap.md](roadmap.md).

## Fluxo de criação de projeto (regra de negócio central)

1. Gerente/diretora escolhe o `Servico` no formulário → backend retorna os `EtapaTemplate` daquele serviço (dias úteis e descrição pré-preenchidos, editáveis).
2. Ao submeter o formulário com gerente, diretor, professor orientador (opcional), gestão e N consultores iniciais, o backend:
   - Cria o `Projeto`.
   - Gera uma `Etapa` para cada `EtapaTemplate` do serviço escolhido.
   - Atribui automaticamente os N consultores iniciais a **todas** as etapas geradas, criando uma linha em `EtapaConsultor` por (etapa, consultor) com `data_entrada = hoje`.
3. A partir daí, a equipe de cada etapa pode ser ajustada individualmente (adicionar/remover consultor), sem afetar as demais etapas.
4. A "equipe do projeto" mostrada na Visão Geral é **derivada**: união de todos os `trabalhador_id` com `data_saida IS NULL` em qualquer etapa daquele projeto. Não existe uma lista de equipe armazenada no nível do projeto.

## Exemplos de payload

### Criar projeto

```json
POST /projetos/
{
  "nome": "Plano de Marketing — Padaria Sabor & Cia",
  "descricao": "Reposicionamento de marca para expansão de franquias",
  "objetivo": "Aumentar reconhecimento de marca na região metropolitana",
  "nome_contratante": "Padaria Sabor & Cia",
  "agregados_contratante": "Maria (sócia), João (gerente financeiro)",
  "servico_id": 2,
  "gestao_id": 5,
  "gerente_id": 12,
  "diretor_id": 3,
  "professor_orientador_id": null,
  "consultores_iniciais_ids": [15, 16, 17]
}
```

### Resposta de uma etapa (com equipe embutida)

```json
{
  "id": 40,
  "projeto_id": 8,
  "etapa_template_id": 3,
  "ordem": 1,
  "nome": "Diagnóstico de marca",
  "descricao": "Levantamento da percepção atual de marca",
  "dias_uteis_esperados": 5,
  "bloco_entrega": null,
  "status": "em_andamento",
  "consultores": [
    { "id": 15, "nome": "Ana Souza", "cargo": "Consultora Jr", "emailInstitucional": "ana@apoio.com.br" },
    { "id": 16, "nome": "Bruno Lima", "cargo": "Consultor Jr", "emailInstitucional": "bruno@apoio.com.br" }
  ]
}
```
