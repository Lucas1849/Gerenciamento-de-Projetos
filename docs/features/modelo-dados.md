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

Catálogo dos 9 serviços da cartela (Pesquisa de Mercado, Plano de Marketing, Plano de Comunicação, Plano de Negócios, Planejamento Estratégico, Plano Operacional, Mapeamento de Processos, Cliente Oculto, Valuation).

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
| descricao_padrao | string | opcional; pré-preenche a etapa gerada |
| dias_uteis_esperados_padrao | int | opcional; pré-preenche a etapa gerada |

### Professor

Professor(a) orientador(a) — pessoa externa à empresa júnior, não é um `Trabalhador`. Perfil estendido na Fase 20 (ADR-022); a aba "Professores orientadores" da galeria é o lugar canônico de cadastro/consulta.

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| nome | string | |
| email | string | opcional |
| servico_interesse | string | opcional; **texto livre** — não é FK ao catálogo (decisão do responsável em 09/07/2026) |
| contato | string | opcional; telefone/WhatsApp/e-mail alternativo (o `email` permanece) |
| observacoes | string | opcional |

### Projeto (reescrito)

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| nome | string | |
| descricao | string | opcional |
| objetivo | string | opcional |
| nome_contratante | string | opcional |
| agregados_contratante | string | opcional; texto livre separado por vírgula (mantido como está) |
| servico_id | int | FK → Servico (substitui `tipo_servico` texto livre) |
| gestao_id | int | FK → Gestao |
| fase | string | `kickoff \| andamento \| finalizacao \| ajustes \| concluido` — validado via `Literal` no Pydantic. Substitui `status` e `kickoff_realizado` (ver ADR-007) |
| tap_assinado | bool | mantido como booleano independente — marco contratual, não derivável da `fase` (ver ADR-007) |
| gerente_id | int | FK → Trabalhador |
| diretor_id | int | FK → Trabalhador |
| professor_orientador_id | int | FK → Professor, nullable (pode ficar pendente enquanto a diretora busca o orientador) |

Removidos: `consultor1_id`, `consultor2_id`, `consultor3_id`, `status`, `kickoff_realizado` (ver ADR-007). `tap_assinado` **não** é removido — permanece como bool independente.

### Etapa (substitui TarefaKanban)

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| projeto_id | int | FK → Projeto |
| etapa_template_id | int | FK → EtapaTemplate, nullable (nulo = etapa adicionada manualmente, fora do template) |
| ordem | int | substitui `depende_de_id` (ver ADR-006) |
| nome | string | |
| descricao | string | opcional |
| dias_uteis_esperados | int | opcional |
| data_inicio | date | opcional (Fase 5). A **data final nunca é armazenada**: é derivada (`data_inicio + dias_uteis_esperados`, feriados nacionais via workalendar) e exposta em `EtapaResposta.data_fim` (ADR-008) |
| bloco_entrega | string | opcional. Desde a Fase 5 é **chave de bloco** (uuid compartilhado entre as etapas do mesmo bloco de entrega), não um rótulo humano (ADR-008) |
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

### EtapaDependencia (associação N:N — implementada na Fase 13)

> **Implementada (06/07/2026).** Reintroduz a dependência entre etapas que o ADR-006 havia removido (ali chamada `depende_de_id`), agora como **tabela própria** (`etapa_dependencias`) e **só informativa** (grava/exibe "Bloqueado por / Bloqueando"; não reagenda datas). Ver ADR-015 e [plano-fases-12-13.md](plano-fases-12-13.md). É **adição pura de tabela**, então `create_all` a materializa no próximo boot sem apagar dados — o fluxo ADR-001 (recriar `.db`) ficou como conservador, mas não foi necessário.

| Campo | Tipo | Observação |
|---|---|---|
| id | int | PK |
| etapa_id | int | FK → Etapa (a etapa **bloqueada** / sucessora) |
| bloqueada_por_id | int | FK → Etapa (a etapa **bloqueadora** / predecessora) |

`UniqueConstraint(etapa_id, bloqueada_por_id)`; cascade delete junto com as etapas (coerente com ADR-012). A `EtapaResposta` passa a expor `bloqueada_por: [{id, nome}]` e `bloqueando: [{id, nome}]`. Convive com `bloco_entrega` (bloco de entrega ≠ dependência — ver ADR-015).

### Trabalhador

Sem mudanças nesta fase (`nome`, `cargo`, `emailInstitucional`). Campo de "pontos fortes" fica fora do escopo atual — ver [roadmap.md](roadmap.md).

## Fluxo de criação de projeto (regra de negócio central)

1. Gerente/diretora escolhe o `Servico` no formulário → backend retorna os `EtapaTemplate` daquele serviço (dias úteis e descrição pré-preenchidos, editáveis).
2. Ao submeter o formulário com gerente, diretor, professor orientador (opcional), gestão e N consultores iniciais, o backend gera as etapas por **um de dois caminhos** (ADR-008, Fase 5):
   - **Sem `etapas` no payload**: gera uma `Etapa` para cada `EtapaTemplate` do serviço escolhido (cópia literal). Templates com a mesma `ordem` materializam como bloco de entrega (mesma chave uuid em `bloco_entrega`).
   - **Com `etapas` no payload**: usa a lista customizada (reordenada/editada/com etapas manuais). A `ordem` não viaja — o backend atribui `ordem = índice + 1`. Itens com o mesmo `bloco_grupo` viram bloco (chave uuid compartilhada, prazo/data normalizados pelo primeiro item). Lista vazia ⇒ 422; template de outro serviço ⇒ 404.
   - Nos dois caminhos, atribui automaticamente os N consultores iniciais a **todas** as etapas geradas, criando uma linha em `EtapaConsultor` por (etapa, consultor) com `data_entrada = hoje`.
3. A partir daí, a equipe de cada etapa pode ser ajustada individualmente (adicionar/remover consultor), sem afetar as demais etapas.
4. **Blocos de entrega também podem ser formados/desfeitos depois da criação** (Fase 6, ADR-009): `POST /projetos/{id}/blocos` (`etapa_ids` mín. 2, `dias_uteis_esperados`, `data_inicio?`) aplica uma chave uuid compartilhada em `bloco_entrega` e o prazo/data em todos os membros (etapa de outro projeto ⇒ 404; etapa já em bloco ⇒ 409); `DELETE /projetos/{id}/blocos/{chave}` limpa só a chave — os membros mantêm prazo/data/status. O status é sempre individual por etapa; o card do bloco no Kanban interno mostra o progresso e fica na coluna da etapa menos avançada.
5. A "equipe do projeto" mostrada na Visão Geral é **derivada**: união de todos os `trabalhador_id` com `data_saida IS NULL` em qualquer etapa daquele projeto. Não existe uma lista de equipe armazenada no nível do projeto. Desde a Fase 3, o `GET /projetos/` (listagem) também embute essa equipe derivada em cada item (`ProjetoListaResposta.equipe`) para alimentar os avatares dos cards do Kanban de fases.

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
