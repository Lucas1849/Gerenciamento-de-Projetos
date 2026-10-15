# Catálogo de Serviços — Etapas Padrão

> ## ⚠️ Status desta versão (12/10/2026)
>
> Este documento foi **substituído pelos escopos oficiais de 12/10/2026**, transcritos da tabela
> "Cronograma de Atividades" de cada documento oficial de proposta (a lista "Escopo do projeto",
> seção 4.1, foi usada para conferência). Ele ganhou também a coluna **Fase** (Alinhamento /
> Diagnóstico / Estratégia / Ação), insumo da Fase 31.
>
> **O seed ainda NÃO reflete este documento.** `backend/app/seed_catalogo.py` continua transcrevendo
> o catálogo validado em **04/07** (9 serviços, outras etapas e outros prazos). A sincronização é
> parte da **Fase 31** e **só acontece por comando direto do responsável** — ver
> [plano-fase-31.md](plano-fase-31.md). Até lá, código e documento divergem **de propósito**, e o
> apêndice §11 registra exatamente em quê.
>
> Atualizar o seed implica o **fluxo destrutivo ADR-001** (apagar `piloto_projetos.db` e re-semear):
> `seed_catalogo` é idempotente **por nome de serviço**, então re-rodar não atualiza etapa nenhuma
> dos serviços que já existem.

As etapas, dias úteis e descrições abaixo **não devem ser inventadas pela IA** — são informação
operacional real da consultoria (ADR-005 em [../arquitetura/decisoes.md](../arquitetura/decisoes.md)).
Qualquer mudança aqui exige nova validação da diretoria e atualização correspondente do seed.

Etapas que dividem a mesma célula de prazo no documento oficial são **entregas em bloco**: no modelo
do piloto elas compartilham a mesma `ordem` (ADR-008/009) e, no slide, um prazo só.

A coluna **Fase** vem da proposta "Estruturação dos escopos em fases" (24/09/2026). Onde a etapa é
nova ou mudou no escopo de 12/10 — e portanto não estava naquela proposta — a célula está marcada
com ⚑ e é **proposta deste documento**, pendente de validação. As divergências entre os dois
documentos estão consolidadas em [classificacao-fases-etapas.md](classificacao-fases-etapas.md).

---

## 1. Pesquisa de Mercado — 80 dias úteis

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Alinhamento e Kick Off|5|Alinhamento|
|2|Identificação do Problema ⛓|5|Diagnóstico|
|2|Objetivo Geral da Pesquisa ⛓|5|Diagnóstico|
|3|Definição do Público-Alvo e Amostra ⛓|15|Diagnóstico|
|3|Análise de Concorrência ⛓|15|Diagnóstico|
|4|Análise de Tendências ⛓|10|Diagnóstico|
|4|Potenciais Parcerias ⛓|10|Diagnóstico ⚑|
|5|Levantamento de Temas ⛓|10|Estratégia|
|5|Instrumento de Pesquisa ⛓|10|Estratégia|
|6|Aplicação do Instrumento de Pesquisa|25|Ação|
|7|Tabulação e Análise dos Resultados|10|Ação|

*Reestruturado em 12/10: o serviço passou de 10 etapas majoritariamente soltas (73 dias) para
**7 ordens com 4 blocos** (80 dias). "Potenciais Parcerias" entrou no escopo; "Análise e Tabulação"
virou "Tabulação e Análise".*

⚑ A fase de "Potenciais Parcerias" não constava na proposta de 24/09 (a célula ficou vazia). Por P2
ela herda a fase do bloco (Diagnóstico) — **mas a mesma etapa é Estratégia no Plano de Marketing**.
Ver Q2 em [classificacao-fases-etapas.md](classificacao-fases-etapas.md).

## 2. Plano de Marketing — 85 dias úteis (sem blocos)

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Alinhamento e Kick Off|5|Alinhamento|
|2|Análise de Contexto|2|Diagnóstico|
|3|Análise de Setor|10|Diagnóstico|
|4|Análise de Recursos|5|Diagnóstico|
|5|Análise de Concorrentes e Vantagens Competitivas|10|Diagnóstico|
|6|Potenciais Parcerias|5|**Estratégia**|
|7|Definição do Público-alvo|5|**Diagnóstico**|
|8|Persona|10|Estratégia|
|9|Jornada do Cliente|5|Estratégia|
|10|Mix de Marketing|10|Estratégia|
|11|Análise Swot|5|Estratégia|
|12|Elaboração de Plano de Ação|10|Ação|
|13|Relatório Final|3|Ação|

*Mudou em 12/10: "Jornada do Cliente" saiu do bloco com "Potenciais Parcerias" e virou etapa solta na
ordem 9; o serviço **não tem mais nenhum bloco**; total 81 → 85 dias.*

⚠️ **Único serviço em que as fases não ficam contínuas (P1):** a ordem 6 é Estratégia e a ordem 7
volta para Diagnóstico. O aviso da proposta de 24/09 descrevia isso como "o bloco 6 (Parcerias +
Jornada)" — **esse bloco não existe mais**, mas a descontinuidade permanece, agora entre duas etapas
soltas. Sugestão mantida: **inverter as ordens 6 e 7** no escopo.

## 3. Plano de Comunicação — 53 dias úteis

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Alinhamento e Kick Off|5|Alinhamento|
|2|Contexto e determinação de objetivos ⛓|15|Diagnóstico|
|2|Análise mercadológica/externa ⛓|15|Diagnóstico|
|2|Público-Alvo ⛓|15|Diagnóstico|
|3|Planejamento de Ações e Metas ⛓|15|Estratégia|
|3|Orçamento de Comunicação ⛓|15|Estratégia|
|3|Composto/Mix Promocional ⛓|15|Estratégia|
|4|Elaboração das Mensagens ⛓|15|Estratégia ⚑|
|4|Seleção de Meios e Canais ⛓|15|Estratégia|
|5|Elaboração do Relatório Final|3|Ação|

*Mudou em 12/10: "Planejamento de Metas" virou "Planejamento de Ações e Metas"; "Análise
Mercadológica" virou "Análise mercadológica/externa"; a ordem 4 inverteu (Mensagens antes de Meios).*

⚠️ **O documento oficial declara "total 60 dias", mas a soma das próprias linhas dá 53.** Divergência
interna do documento oficial — precisa de correção na fonte antes de virar seed.

⚑ A proposta de 24/09 classificou **o mesmo bloco 4 em duas fases**: "Elaboração das Mensagens" como
Ação e "Seleção de Meios e Canais" como Estratégia. Isso **viola P2** (bloco é indivisível). Proposta
deste documento: **Estratégia para as duas** — ainda é desenho do plano, a veiculação é do cliente.
Ver Q3.

*Observação herdada: "Contexto e determinação de objetivos" tem um pé no Alinhamento, mas divide
bloco com Análise mercadológica e Público-Alvo — por P2 vai inteiro para Diagnóstico.*

## 4. Plano de Negócios — 65 dias úteis

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Alinhamento e Kick Off|5|Alinhamento|
|2|Planejamento das Atividades|5|Alinhamento|
|3|Análise de Setor ⛓|15|Diagnóstico|
|3|Análise de Mercado ⛓|15|Diagnóstico|
|4|Plano Operacional ⛓|20|Estratégia|
|4|Recursos Humanos ⛓|20|Estratégia|
|5|Plano Financeiro|15|Estratégia|
|6|Relatório Final|5|Ação|

*Mudou em 12/10: **"Pesquisa de Mercado" (30 dias) e "Plano de Marketing" (10 dias) saíram do
escopo** — o documento oficial diz isso explicitamente. Total 95 → 65 dias.*

⚠️ A lista "Escopo do projeto" (4.1) deste documento oficial **começa em "Análise de Contexto"**, e
não em Kick Off / Planejamento das Atividades como a tabela de cronograma. Divergência interna da
fonte — a tabela foi adotada aqui (é dela que saem ordem, blocos e prazos), mas precisa de
confirmação.

## 5. Planejamento Estratégico — 55 dias úteis (sem blocos)

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Planejamento|5|Alinhamento|
|2|Análise de Contexto|15|Diagnóstico|
|3|Definição de Propósito e Valores|5|Estratégia|
|4|Estabelecimento de Objetivos|5|Estratégia|
|5|Formulação de Estratégias|10|Estratégia|
|6|Plano de Ação|10|Ação|
|7|Relatório Final|5|Ação|

*Inalterado em 12/10 — único serviço idêntico ao catálogo de 04/07.*

*Observação: "Estabelecimento de Objetivos" aqui é Estratégia (vem depois do diagnóstico, define o
rumo) — diferente de "Definição de Objetivos" do Cliente Oculto, que é Alinhamento (vem antes de tudo).*

## 6. Plano Operacional — 60 dias úteis (sem blocos)

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Análise de Contexto|10|Diagnóstico|
|2|Definição de Metas e Indicadores|5|Estratégia|
|3|Layout e Fluxo de Processos|15|Estratégia|
|4|Capacidade Produtiva|15|Estratégia ⚑|
|5|Organograma|10|Estratégia|
|6|Relatório|5|Ação|

*Mudou em 12/10: **"Alinhamento e Kick Off" saiu do escopo** e entrou "Capacidade Produtiva" (15 dias).*

⚠️ **Fase Alinhamento vazia** — consequência direta da remoção do Kick Off. Ver Q1.

## 7. Mapeamento de Processos — 65 dias úteis (sem blocos)

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Análise de Contexto|10|Diagnóstico|
|2|Mapeamento da Estrutura Organizacional|20|Estratégia|
|3|Mapeamento de Processos|20|Estratégia|
|4|Revisão de Processos|10|Estratégia ⚑|
|5|Relatório Final|5|Ação|

*Reestruturado em 12/10: de 6 etapas para 5. **Saíram** "Planejamento das Atividades", "Definição de
metas e Indicadores", "Estruturação dos Processos" e "Descrição de cargos"; **entraram** "Mapeamento
da Estrutura Organizacional", "Mapeamento de Processos" e "Revisão de Processos".*

⚠️ **Fase Alinhamento vazia** — "Planejamento das Atividades" saiu do escopo. Ver Q1.

⚑ Questão de mérito que levanto: "Mapeamento da Estrutura Organizacional" e "Mapeamento de Processos"
são **levantamento do como-é** — pelo critério da seção 2 da proposta seriam **Diagnóstico**, não
Estratégia. Mantive a classificação de 24/09 para não alterar a proposta em silêncio. Ver Q4.

## 8. Cliente Oculto — 35 dias úteis (sem blocos)

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Planejamento|5|Alinhamento|
|2|Definição de Objetivos|2|Alinhamento|
|3|Definição dos Critérios de Avaliação|3|Estratégia|
|4|Orientação dos Consultores|5|Estratégia|
|5|Execução|10 (média mínima)|Ação|
|6|Análise|5|Ação|
|7|Relatório Final|5|Ação|

*Mudou em 12/10: "Alinhamento e Kick Off" virou **"Planejamento"**.*

⚠️ **Fase Diagnóstico vazia** — o levantamento acontece na Execução, que é Ação. Ver Q1.

## 9. Valuation — ❌ não é serviço oficial

O documento de 12/10 registra: *"Não é serviço oficial; sem escopo oficial."*

⚠️ **Mas existe projeto ativo usando esse serviço** no Apoio Hub — #6 "Análise Estratégica para
Geração de Valor da Midiática", em andamento, 7 etapas. Decisão necessária (Q5): o serviço sai do
catálogo (e o que acontece com o projeto existente), fica como serviço legado não ofertável, ou
permanece? Enquanto não houver decisão, o escopo de 24/09 fica registrado aqui **como histórico, não
como catálogo**:

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Kick-off e Alinhamento|5|Alinhamento|
|2|Análise de Contexto|5|Diagnóstico|
|3|Análise de Setor ⛓|15|Diagnóstico|
|3|Análise de Mercado ⛓|15|Diagnóstico|
|4|Análise dos Intangíveis|15|Estratégia|
|5|Previsibilidade e Escalabilidade da Receita|15|Estratégia|
|6|Relatório Final|3|Ação|

---

## 10. Resumo das fases por serviço

| Serviço | Alinhamento | Diagnóstico | Estratégia | Ação | Contínuo (P1)? |
|---|---|---|---|---|---|
|Pesquisa de Mercado|1|6|2|2|✅|
|Plano de Marketing|1|5|5|2|❌|
|Plano de Comunicação|1|3|5|1|✅|
|Plano de Negócios|2|2|3|1|✅|
|Planejamento Estratégico|1|1|3|2|✅|
|Plano Operacional|**0**|1|4|1|✅|
|Mapeamento de Processos|**0**|1|3|1|✅|
|Cliente Oculto|2|**0**|2|3|✅|

**Três dos oito serviços têm uma fase vazia** depois da atualização de 12/10 (antes era um só). Isso
promove a Q1 de detalhe de layout a decisão estruturante do slide.

---

## 11. Apêndice — o que mudou em relação ao catálogo de 04/07 (que ainda está no seed)

| Serviço | Mudança | Impacto no seed |
|---|---|---|
|Pesquisa de Mercado|10 etapas/73 dias → 7 ordens com 4 blocos/80 dias; +Potenciais Parcerias; "Análise e Tabulação" → "Tabulação e Análise"|reescrita total|
|Plano de Marketing|81 → 85 dias; bloco da ordem 6 desfeito; Jornada do Cliente vira ordem 9 solta|reescrita total|
|Plano de Comunicação|55 → 53 dias; renomes; ordem 4 invertida|reescrita total|
|Plano de Negócios|95 → 65 dias; **−Pesquisa de Mercado, −Plano de Marketing**|reescrita total|
|Planejamento Estratégico|—|nenhum|
|Plano Operacional|**−Alinhamento e Kick Off**, +Capacidade Produtiva|reescrita total|
|Mapeamento de Processos|6 → 5 etapas, 4 saem e 3 entram|reescrita total|
|Cliente Oculto|"Alinhamento e Kick Off" → "Planejamento"|renome|
|Valuation|deixa de ser serviço oficial|decisão pendente (Q5)|

Oito dos nove serviços mudam. Por isso a sincronização **não é um patch no seed**: é reescrita do
`CATALOGO` + fluxo destrutivo ADR-001, e está planejada como passo da Fase 31.

---

## Aprovação

| Versão | Serviços | Validado por | Data |
|---|---|---|---|
| Catálogo inicial (hoje no seed) | 9 | Diretoria | 04/07/2026 |
| Escopos oficiais + coluna Fase | 8 + Valuation pendente | **aguardando** | — |

Fontes da versão de 12/10: tabela "Cronograma de Atividades" dos documentos oficiais de proposta
(Esmalteria, Brambilla Planejados, Ecocash, Filipe, Planejamento Estratégico.pdf, Central Embalagens,
catálogo interno, Cliente Oculto.pdf). Classificação em fases: "Estruturação dos escopos em fases",
24/09/2026.
