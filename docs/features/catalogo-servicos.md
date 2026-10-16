# Catálogo de Serviços — Etapas Padrão

> ## ✅ Status desta versão (16/10/2026)
>
> Este documento foi **substituído pelos escopos oficiais de 12/10/2026**, transcritos da tabela
> "Cronograma de Atividades" de cada documento oficial de proposta (a lista "Escopo do projeto",
> seção 4.1, foi usada para conferência). Ele ganhou também a coluna **Fase** (Alinhamento /
> Diagnóstico / Estratégia / Ação), insumo da Fase 31.
>
> **As nove decisões pendentes (Q1–Q9) foram resolvidas em 16/10/2026**, por comando direto do
> responsável, seguindo as recomendações registradas neste documento e em
> [classificacao-fases-etapas.md](classificacao-fases-etapas.md) — ver ADR-035 em
> [decisoes.md](../arquitetura/decisoes.md). As marcas ⚑ abaixo foram resolvidas e mantidas apenas
> como registro histórico da proposta original.
>
> **O seed agora reflete este documento.** `backend/app/seed_catalogo.py` transcreve os escopos de
> 12/10/2026 (8 serviços ofertáveis + Valuation como legado não ofertável, `fase_escopo` por etapa),
> executado via o **fluxo destrutivo ADR-001** (apagar `piloto_projetos.db` e re-semear) como parte
> da **Fase 31** — ver [plano-fase-31.md](plano-fase-31.md).

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

~~⚑~~ **Q2 resolvida (16/10/2026):** a fase de "Potenciais Parcerias" herda o bloco (Diagnóstico, P2)
neste serviço. A mesma etapa é Estratégia no Plano de Marketing — aceito como correto: a fase é **por
serviço**, não por nome de etapa.

## 2. Plano de Marketing — 85 dias úteis (sem blocos)

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Alinhamento e Kick Off|5|Alinhamento|
|2|Análise de Contexto|2|Diagnóstico|
|3|Análise de Setor|10|Diagnóstico|
|4|Análise de Recursos|5|Diagnóstico|
|5|Análise de Concorrentes e Vantagens Competitivas|10|Diagnóstico|
|6|Definição do Público-alvo|5|Diagnóstico|
|7|Potenciais Parcerias|5|Estratégia|
|8|Persona|10|Estratégia|
|9|Jornada do Cliente|5|Estratégia|
|10|Mix de Marketing|10|Estratégia|
|11|Análise Swot|5|Estratégia|
|12|Elaboração de Plano de Ação|10|Ação|
|13|Relatório Final|3|Ação|

*Mudou em 12/10: "Jornada do Cliente" saiu do bloco com "Potenciais Parcerias" e virou etapa solta na
ordem 9; o serviço **não tem mais nenhum bloco**; total 81 → 85 dias.*

~~⚠️~~ **Q6 resolvida (16/10/2026): ordens 6 e 7 invertidas** ("Definição do Público-alvo" passa a
ser a ordem 6, "Potenciais Parcerias" a ordem 7) — resolve a única quebra de continuidade (P1) do
catálogo. Tem precedente no slide já aprovado pelo cliente (§8 do plano), em que o Público-alvo
aparece antes da Jornada do Cliente.

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

~~⚠️~~ **Q7 resolvida (16/10/2026): o total correto é 53 dias úteis** (soma das ordens distintas —
membros do mesmo bloco compartilham o prazo, não somam entre si). O "60" do documento oficial é o
erro aritmético da fonte; **53** é o valor que entra no seed.

~~⚑~~ **Q3 resolvida (16/10/2026):** o bloco 4 ("Elaboração das Mensagens" + "Seleção de Meios e
Canais") fica **Estratégia para as duas** — ainda é desenho do plano, a veiculação é do cliente. A
proposta de 24/09 havia dividido o bloco em duas fases, o que violava P2 (bloco é indivisível).

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

~~⚠️~~ **Q8 resolvida (16/10/2026):** a lista "Escopo do projeto" (4.1) deste documento oficial
começa em "Análise de Contexto"; a **tabela de cronograma** (Kick Off → Planejamento das Atividades →
…) foi a adotada, por ser dela que saem ordem, blocos e prazos.

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

~~⚠️~~ **Fase Alinhamento vazia** — consequência direta da remoção do Kick Off. **Q1 resolvida
(16/10/2026): a fase vazia aparece** no editor e no futuro slide, com estado vazio ("nenhuma etapa
nesta fase").

## 7. Mapeamento de Processos — 65 dias úteis (sem blocos)

| Ordem | Etapa | Dias úteis | Fase |
|---|---|---|---|
|1|Análise de Contexto|10|Diagnóstico|
|2|Mapeamento da Estrutura Organizacional|20|Diagnóstico|
|3|Mapeamento de Processos|20|Diagnóstico|
|4|Revisão de Processos|10|Estratégia|
|5|Relatório Final|5|Ação|

*Reestruturado em 12/10: de 6 etapas para 5. **Saíram** "Planejamento das Atividades", "Definição de
metas e Indicadores", "Estruturação dos Processos" e "Descrição de cargos"; **entraram** "Mapeamento
da Estrutura Organizacional", "Mapeamento de Processos" e "Revisão de Processos".*

~~⚠️~~ **Fase Alinhamento vazia** — "Planejamento das Atividades" saiu do escopo. **Q1 resolvida:**
a fase vazia aparece (ver Plano Operacional).

~~⚑~~ **Q4 resolvida (16/10/2026):** "Mapeamento da Estrutura Organizacional" e "Mapeamento de
Processos" são **Diagnóstico** — levantamento do como-é, pelo critério da seção 2 da proposta, não
desenho de solução. Reverte a classificação provisória de 24/09 (Estratégia).

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

~~⚠️~~ **Fase Diagnóstico vazia** — o levantamento acontece na Execução, que é Ação. **Q1 resolvida:**
a fase vazia aparece (ver Plano Operacional).

## 9. Valuation — serviço legado, não ofertável (`ofertavel = false`)

O documento de 12/10 registra: *"Não é serviço oficial; sem escopo oficial."* Mas existe projeto
ativo usando esse serviço no Apoio Hub — #6 "Análise Estratégica para Geração de Valor da Midiática",
em andamento, 7 etapas.

**Q5 resolvida (16/10/2026): o serviço permanece no catálogo, marcado `ofertavel = false`.** Não sai
(preserva o projeto #6 sem exigir decisão sobre o destino dele) e não é oferecido em novos projetos
(o catálogo público do formulário de criação oculta serviços com `ofertavel = false`). O escopo de
24/09 abaixo continua sendo o catálogo vigente deste serviço (não muda com os escopos de 12/10, que
não o cobrem):

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
|Plano de Marketing|1|5|5|2|✅ *(Q6: ordens 6/7 invertidas)*|
|Plano de Comunicação|1|3|5|1|✅|
|Plano de Negócios|2|2|3|1|✅|
|Planejamento Estratégico|1|1|3|2|✅|
|Plano Operacional|**0**|1|4|1|✅|
|Mapeamento de Processos|**0**|3|1|1|✅ *(Q4: duas etapas migraram de Estratégia p/ Diagnóstico)*|
|Cliente Oculto|2|**0**|2|3|✅|

**Três dos oito serviços têm uma fase vazia** depois da atualização de 12/10 (antes era um só).
**Q1 resolvida (16/10/2026): a fase vazia aparece** no editor e no slide, com estado vazio — em vez
de layout de largura variável. Todos os oito serviços são contínuos (P1) após a Q6.

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
| Escopos oficiais + coluna Fase + 9 decisões (Q1–Q9) | 8 ofertáveis + Valuation legado | Responsável (direto) | 16/10/2026 |

Fontes da versão de 12/10: tabela "Cronograma de Atividades" dos documentos oficiais de proposta
(Esmalteria, Brambilla Planejados, Ecocash, Filipe, Planejamento Estratégico.pdf, Central Embalagens,
catálogo interno, Cliente Oculto.pdf). Classificação em fases: "Estruturação dos escopos em fases",
24/09/2026.
