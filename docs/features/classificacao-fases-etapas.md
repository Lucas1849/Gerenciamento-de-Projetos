# Classificação das etapas em fases — critério, reconciliação e decisões pendentes

**Status: insumo da Fase 31. Nada implementado.**

As quatro fases — **Alinhamento · Diagnóstico · Estratégia · Ação** — são o agrupamento que o slide
"Cronograma de Execução" da proposta comercial precisa para ser gerado automaticamente, do mesmo
jeito que o calendário de kick-off (Fases 28/30). A classificação **por serviço** (e não projeto a
projeto) é o que impede que dois projetos do mesmo escopo saiam com a mesma etapa em fases
diferentes.

**A tabela normativa — etapa por etapa, com prazo e fase — está em
[catalogo-servicos.md](catalogo-servicos.md).** Este documento guarda o critério, o que diverge entre
as duas fontes e o que ainda precisa de decisão.

## As duas fontes e por que elas brigam

| Documento | Data | O que define |
|---|---|---|
| "Estruturação dos escopos em fases" (PDF) | **24/09/2026** | a fase de cada etapa, para os 9 serviços |
| "Escopos oficiais da Apoio" (MD) | **12/10/2026** | ordem, blocos e prazos reais de cada serviço |

O PDF foi construído sobre o catálogo validado em **04/07**. O documento de escopos é **18 dias mais
novo** e mudou 8 dos 9 serviços. Resultado: boa parte da classificação de 24/09 fala de etapas que
**não existem mais** — e as etapas que entraram **não têm fase atribuída**.

### Onde a classificação de 24/09 ficou órfã

| Serviço | Problema |
|---|---|
|Plano de Negócios|classifica "Pesquisa de Mercado" (Diagnóstico) e "Plano de Marketing" (Estratégia) — **ambas saíram do escopo**. Soma as linhas em 105 dias e declara 65.|
|Mapeamento de Processos|classifica 9 etapas (soma 105, declara 65); o escopo oficial tem **5**. Quatro das classificadas não existem mais; três das oficiais nunca foram classificadas.|
|Plano Operacional|classifica "Alinhamento e Kick Off", que **saiu do escopo**; não classifica "Capacidade Produtiva", que entrou.|
|Pesquisa de Mercado|a célula de fase de "Potenciais Parcerias" está **vazia**.|
|Plano de Comunicação|classifica **o mesmo bloco em duas fases** (Mensagens = Ação, Meios = Estratégia), violando o próprio princípio P2.|
|Cliente Oculto|classifica "Alinhamento e Kick Off"; no escopo oficial a etapa chama **"Planejamento"**.|
|Valuation|classificado integralmente, mas o escopo oficial diz que **não é serviço oficial**.|

Só **Planejamento Estratégico** e **Plano de Marketing** atravessaram os dois documentos sem conflito
de conteúdo (o Marketing mantém o problema de continuidade, por outro motivo).

## O critério (da proposta de 24/09, mantido)

| Fase | Pergunta que responde | Etapas típicas |
|---|---|---|
|**1. Alinhamento**|O que vamos fazer e por quê?|Kick Off, Alinhamento, Planejamento, Identificação do Problema, Objetivo Geral, Definição de Objetivos|
|**2. Diagnóstico**|Qual é a situação real hoje?|Análises de Contexto, Setor, Mercado, Recursos, Concorrência, Tendências, Mercadológica, Intangíveis, Definição do Público-alvo|
|**3. Estratégia**|O que propomos e como desenhamos a solução?|Persona, Jornada do Cliente, Mix, SWOT, Levantamento de Temas, Instrumento de Pesquisa, Metas e Indicadores, Organograma, planos específicos|
|**4. Ação**|O que executamos e entregamos?|Aplicação do Instrumento, Tabulação e Análise, Execução, Plano de Ação, Relatório Final|

**P1 — Continuidade:** as fases são blocos contínuos na ordem do cronograma. Uma etapa fora de ordem
quebra o bloco visual do slide.

**P2 — Entrega em bloco é indivisível:** etapas que dividem a mesma entrega ficam na mesma fase,
porque o slide desenha um prazo só para elas.

Os dois princípios continuam **pendentes de aval**.

## Decisões pendentes

| # | Questão | Por que ficou maior depois de 12/10 |
|---|---|---|
|**Q1**|Fase vazia **aparece no slide** (linha em branco) ou é **omitida**?|Antes era 1 serviço (Cliente Oculto, sem Diagnóstico). Agora são **3 de 8**: Plano Operacional e Mapeamento de Processos ficaram **sem Alinhamento**, porque o Kick Off saiu do escopo dos dois. Se a resposta for "omitir", o slide passa a ter número variável de fases — muda o layout, não só o conteúdo.|
|**Q2**|"Potenciais Parcerias" é Diagnóstico ou Estratégia?|Em Pesquisa de Mercado ela está num bloco com "Análise de Tendências" (Diagnóstico, por P2); em Plano de Marketing é etapa solta classificada como **Estratégia**. A mesma etapa, duas fases — exatamente o que a classificação por serviço deveria eliminar. Ou se aceita que a fase é por serviço (não por nome de etapa), ou uma das duas muda.|
|**Q3**|O bloco 4 do Plano de Comunicação (Mensagens + Meios) é Estratégia ou Ação?|A proposta de 24/09 dividiu o bloco em duas fases, o que P2 proíbe. Proposta registrada em [catalogo-servicos.md](catalogo-servicos.md): **Estratégia para as duas**.|
|**Q4**|"Mapeamento da Estrutura Organizacional" e "Mapeamento de Processos" são Diagnóstico ou Estratégia?|Pelo critério, mapear o como-é é levantamento ⇒ Diagnóstico. A proposta de 24/09 colocou "Estruturação dos Processos" em Estratégia, e herdei isso para as etapas novas. Se forem Diagnóstico, o serviço ganha uma fase 2 de verdade e fica bem mais equilibrado.|
|**Q5**|**Valuation** sai do catálogo?|Deixou de ser serviço oficial, mas o projeto #6 (Midiática) está **em andamento** usando ele. Opções: remover do catálogo (e decidir o destino do projeto), manter como serviço legado não ofertável, ou manter.|
|**Q6**|Inverter as ordens 6 e 7 do Plano de Marketing?|É o único serviço que viola P1. Na proposta aprovada por cliente o Público-alvo já aparece antes. Inverter no escopo resolve sem exceção de layout.|
|**Q7**|Plano de Comunicação: o total é **53** (soma das linhas) ou **60** (declarado no documento oficial)?|Divergência interna da fonte oficial. Precisa de correção **no documento**, antes de virar seed.|
|**Q8**|Plano de Negócios começa em Kick Off ou em Análise de Contexto?|A tabela de cronograma e a lista "Escopo do projeto" do mesmo documento oficial discordam. A tabela foi adotada (é dela que saem ordem, blocos e prazos).|
|**Q9**|Os projetos **já cadastrados** recebem fase retroativa?|Os 9 projetos da gestão 2026.2 nasceram do catálogo de 04/07 — várias etapas deles não existem no escopo novo. Ver abaixo.|

## Os projetos existentes — evidência do problema, e um complicador

Levantamento de 07/09/2026 (API pública do Hub, gestão 2026.2, 9 projetos). Classificando as etapas
reais de cada um pelo critério acima, **"Definição do Público-alvo e Amostra" caiu em Diagnóstico no
projeto #16 e em Alinhamento no #17** — dois projetos do mesmo serviço, porque em cada um ela estava
num bloco de entrega diferente. É a evidência original de que a fase precisa vir do serviço.

| Projeto | Serviço | Alin. | Diag. | Estrat. | Ação |
|---|---|---|---|---|---|
|#5 Projeto Lucas|Pesquisa de Mercado|1|1|2|2|
|#6 Midiática|Valuation|1|3|1|1|
|#10 Gráfica União|Plano Operacional|1|1|3|1|
|#12 T&S|Pesquisa de Mercado|1|**0**|2|2|
|#13 Meu Amigo Peludo|Mapeamento|1|1|3|1|
|#14 Erickson Esmalteria|Pesquisa de Mercado|3|3|2|2|
|#15 Vivadent|Mapeamento|1|1|3|1|
|#16 Denes e Edise|Pesquisa de Mercado|2|4|2|2|
|#17 Artur|Pesquisa de Mercado|4|1|2|2|

**O complicador (Q9):** esses projetos foram criados a partir do catálogo de 04/07 e vários já foram
editados pelo gerente. Herdar a fase do `EtapaTemplate` só funciona para quem nasceu do template e
não mudou de nome. Na prática, **a fase desses projetos terá de ser atribuída à mão** — o que é
aceitável, já que a tela de edição por fases é justamente o que a Fase 31 entrega.

---

Plano de implementação: [plano-fase-31.md](plano-fase-31.md).
