# Plano de ação — Fase 31 (fases do escopo: catálogo novo + organização das etapas em Alinhamento / Diagnóstico / Estratégia / Ação)

> **STATUS: EXECUTADA (16/10/2026), por comando direto do responsável.** As nove decisões Q1–Q9 e as
> três decisões de produto do §§4/5 foram resolvidas (seguindo as recomendações do plano) e registradas
> no ADR-035 ([decisoes.md](../arquitetura/decisoes.md)) antes da implementação. 31a–31e completas e
> verificadas (testes de backend 92/92, build+lint do frontend, fluxo manual no browser). Pendente:
> Fase 32 (o slide) e a passada visual 28e/30e, herdadas.
>
> **Esta fase não gera o slide.** Ela entrega o *dado* (a fase de cada etapa) e a *tela* (as quatro
> caixas no formulário) que o gerador de slide vai consumir depois, na Fase 32. É a mesma separação
> que funcionou no calendário de kick-off: primeiro o dado e a decisão, depois o SVG.

Insumos desta fase, ambos recebidos em **12/10/2026**:

1. **`escopos_oficiais_apoio_2026-10-12.md`** — ordem, blocos e prazos reais de cada serviço,
   transcritos da tabela "Cronograma de Atividades" dos documentos oficiais de proposta.
2. **"Estruturação dos escopos em fases" (PDF, 24/09/2026)** — a proposta de classificação das
   etapas nas quatro fases, para apresentar à diretoria.

Documentação derivada: catálogo normativo em [catalogo-servicos.md](catalogo-servicos.md); critério,
divergências e decisões pendentes em [classificacao-fases-etapas.md](classificacao-fases-etapas.md).

---

## 1. O que a fase entrega

| # | Entrega | Camada |
|---|---|---|
|**31a**|Catálogo sincronizado com os escopos oficiais de 12/10|seed + doc|
|**31b**|`fase` como atributo de primeira classe de `EtapaTemplate` e `Etapa`|schema + API|
|**31c**|As quatro caixas no formulário de criação, com as etapas padrão já distribuídas e movíveis|frontend|
|**31d**|Reatribuição de fase depois da criação, na página do projeto|frontend|
|**31e**|Fase visível nas superfícies que já existem (tabela, Kanban)|frontend|

O que **não** está nesta fase: o slide, o tema visual do slide, a exportação PNG/zip. Isso é a Fase 32,
e herda de 28/30 praticamente toda a mecânica.

---

## 2. Pré-requisito que bloqueia a execução: as 9 decisões

As decisões Q1–Q9 de [classificacao-fases-etapas.md](classificacao-fases-etapas.md) **não são
detalhe de acabamento** — três delas mudam o que é construído:

- **Q1 (fase vazia)** define se o modelo precisa representar "fase sem etapas". Depois de 12/10 são
  **3 serviços de 8** nessa situação. Se a fase vazia aparece no slide, as quatro caixas do formulário
  também precisam existir sempre, mesmo vazias — o que, aliás, é o comportamento natural da tela.
- **Q5 (Valuation)** define se o seed tem 8 ou 9 serviços, e o que acontece com o projeto #6, que está
  em andamento.
- **Q7 (53 × 60 dias)** é erro aritmético na fonte oficial: transcrever antes de corrigir viola ADR-005.

As outras seis (Q2, Q3, Q4, Q6, Q8, Q9) mudam **valores** da tabela, não a arquitetura — podem ser
respondidas durante a execução, mas antes do seed rodar.

**Recomendação: levar as nove à mesma rodada de validação da diretoria, junto com a apresentação do
PDF.** Elas estão escritas em linguagem de negócio justamente para isso.

---

## 3. 31a — sincronizar o catálogo (destrutivo)

`backend/app/seed_catalogo.py` hoje transcreve o catálogo de **04/07**. Os escopos de 12/10 mudam
**8 dos 9 serviços** (apêndice §11 de [catalogo-servicos.md](catalogo-servicos.md)).

**Isto é um fluxo destrutivo ADR-001**, e a razão é específica: `seed_catalogo` é idempotente **por
nome de serviço** — ele pula serviços que já existem. Re-rodar não atualizaria etapa nenhuma. O fluxo é:

1. reescrever a constante `CATALOGO` a partir de [catalogo-servicos.md](catalogo-servicos.md);
2. apagar `backend/piloto_projetos.db`;
3. subir o backend (`create_all` recria o schema);
4. `python -m app.seed_catalogo` **e** `python -m app.seed_professores` (os dois, como em 21/07).

**Custo registrado, não escondido:** isso apaga os projetos de teste locais. No piloto é aceitável
(mesma posição do ADR-009/012). No **Hub** não é — lá existe projeto real em produção, e a atualização
do catálogo terá de ser `UPDATE`/`INSERT` em SQL, com os projetos existentes preservados. Isso é
trabalho da Fase 33 (port), e precisa ficar registrado agora para não virar surpresa.

**O que não muda:** projetos já criados mantêm suas etapas. `Etapa` é cópia do template no momento da
criação (ADR-008), não uma referência viva — alterar o catálogo nunca reescreve projeto existente.
É por isso que a Q9 existe.

---

## 4. 31b — `fase` no modelo

### A decisão de modelagem (proposta ADR-035)

A fase é **atributo da etapa**, não uma tabela nova e não uma derivação da ordem.

```
EtapaTemplate.fase : string, nullable      # ponto de partida, vem do catálogo
Etapa.fase         : string, nullable      # o que vale no projeto; o gerente pode mudar
```

Valores: `alinhamento | diagnostico | estrategia | acao` (sem acento, mesmo padrão de
`Etapa.status` e `Projeto.fase`). **Nulo = não classificada** — estado legítimo e necessário para os
projetos que já existem (Q9) e para etapas manuais criadas fora do template.

⚠️ **Cuidado de nomenclatura, que já causou confusão nesta base:** `Projeto.fase` **já existe** e
significa outra coisa — é o estágio do projeto na galeria (`kickoff | andamento | ajustes |
concluido`, ADR-024/030). A fase do escopo é de **etapa**, não de projeto. Recomendação: nomear o
campo novo `fase_escopo` no código, ou documentar a colisão em todo lugar onde as duas aparecem. A
decisão fica no ADR-035.

### Por que atributo, e não tabela

Já foi tentado o caminho oposto nesta base: o ADR-006 removeu dependências entre etapas para
simplificar, e o ADR-015 teve de reintroduzi-las como tabela quando a necessidade voltou. A diferença
é que dependência é **relação N:N**; fase é **classificação 1:1**. Uma coluna resolve, dá ordenação e
filtro de graça, e não cria uma segunda fonte de verdade sobre a etapa.

### Migração

Puro acréscimo de coluna. `create_all` **não altera tabela existente** — mas como a 31a já exige o
fluxo destrutivo ADR-001, a coluna nasce junto. **Não há migração incremental a planejar**, desde que
31a e 31b entrem na mesma execução. Se forem separadas, 31b vira um `ALTER TABLE` manual.

### API

| Rota | Mudança |
|---|---|
|`GET /catalogo/servicos`|`EtapaTemplateResposta` ganha `fase`|
|`POST /projetos/`|cada item de `etapas[]` aceita `fase` (opcional); sem `etapas[]`, a fase vem do template|
|`GET /projetos/{id}/etapas`|`EtapaResposta` ganha `fase`|
|`PATCH /etapas/{id}`|aceita `fase` — **individual, nunca propagada pelo bloco**|
|`PUT /projetos/{id}/etapas/fases`|**rota nova**: `{etapa_id: fase}` em lote, para a tela salvar um arrasto só uma vez|

**Validação:** valor fora do enum ⇒ 422 em português (mesmo padrão do ADR-013).

**A pergunta de propagação em bloco** (P2) precisa de resposta explícita no ADR: prazo e data se
propagam entre membros do bloco (ADR-009), nome e descrição não. A fase deveria propagar? P2 diz que
um bloco está todo na mesma fase — então **sim, propagar** é o coerente. Mas isso impede que o gerente
quebre um bloco entre fases, que é justamente o que a proposta de 24/09 fez por engano no Plano de
Comunicação. **Recomendação: propagar, e a UI mover o bloco inteiro** — o bloco é uma entrega só, é
assim que ele aparece no slide.

---

## 5. 31c — as quatro caixas no formulário

Hoje `FormularioProjetos.jsx` (279 linhas) escolhe o serviço e renderiza `EtapasEditor.jsx` (385
linhas): uma **lista vertical única**, ordenável por arrasto (`@dnd-kit/sortable`, handle ⠿) com
fallback por setas ↑/↓, mais o gesto 🔗 (`useDraggable`) que forma blocos de entrega.

A Fase 31 transforma essa lista única em **quatro colunas**, uma por fase.

### A decisão difícil: ordem × fase

A ordem das etapas **é** o cronograma — ela define a cascata de datas (`cascatearItens`, Fase 12) e a
`ordem` que o backend grava como `índice + 1`. Se as etapas forem distribuídas em quatro colunas, a
pergunta "qual é a ordem global?" precisa de resposta.

**Opção A — fase derivada da posição (recomendada).** A lista continua sendo uma só, na ordem do
cronograma, e as quatro caixas são **faixas** sobre essa lista: arrastar uma etapa para outra faixa
move ela para a fronteira daquela faixa. A ordem global nunca é ambígua e **P1 (continuidade) vale por
construção** — é impossível produzir um escopo descontínuo.
*Custo:* o gerente não consegue representar o Plano de Marketing como ele é hoje (Q6), porque ele viola
P1. Mas é exatamente o caso em que a recomendação é corrigir o escopo.

**Opção B — quatro colunas independentes, ordem = concatenação.** Mais parecido com o desenho pedido
("quatro caixas, mover livremente"). A ordem global é `Alinhamento → Diagnóstico → Estratégia → Ação`,
concatenando cada coluna. Também garante P1, mas **reordenar dentro da coluna muda a ordem global**, e
o gerente perde a visão linear do cronograma que ele tem hoje.

**Opção C — fase livre, ordem independente.** Permite tudo, inclusive escopo descontínuo. Exige que o
slide saiba desenhar uma fase interrompida. Só faz sentido se Q1/Q6 forem respondidas nesse sentido.

> **Esta é a decisão de produto da fase.** A recomendação é **A**, porque preserva a cascata de datas
> e o editor que já existe (o `EtapasEditor` continua sendo uma `SortableContext` só, ganhando
> cabeçalhos de faixa), e porque transforma P1 de regra escrita em invariante de código. Confirmar
> antes de executar.

### Interação

- Faixa com cabeçalho (nome da fase + contagem + soma de dias úteis) e cor própria — reusar os
  tokens `--fase-*` que já existem no `App.css`, **sem introduzir cor nova**.
- Fase vazia: a faixa **aparece mesmo assim**, com estado vazio ("nenhuma etapa nesta fase"). São
  3 serviços de 8 nessa condição — esconder a faixa esconderia a informação.
- **Bloco de entrega move inteiro** (consequência de P2 e da decisão de propagação do §4).
- Acessibilidade: o `EtapasEditor` já tem fallback por teclado nas setas ↑/↓; a mudança de fase
  precisa de equivalente (ex.: `Alt+←/→` move de faixa), senão a tela fica dependente de arrasto.

### Payload

`etapasParaPayload()` (em `etapasEditorUtils.js`) passa a incluir `fase` em cada item. Nada mais
muda: dias e data de início continuam sendo o que viaja, e a data final continua derivada no backend
(ADR-008/016/018 intactos).

---

## 6. 31d — mudar a fase depois da criação

O pedido: *"caso um projeto seja criado e o gerente queira editar uma etapa para outra fase, aparecerá
um quadrado com as caixas e o gerente irá movê-la"*.

Reaproveitar o que existe, em vez de inventar tela nova:

- **`ModalEditarEtapa.jsx`** (362 linhas) já é aberto pelo ✏️ no Kanban e na tabela, com o estado
  vivendo em `EtapasProjeto.jsx` (`edicaoIds`). Ganha um seletor de fase — caminho de uma etapa só.
- **Uma visão "Fases"** na sub-nav da aba Etapas (hoje: Kanban · Tabela · Cronograma · Calendário) —
  as mesmas quatro caixas do formulário, agora sobre as etapas do projeto, para reclassificar várias
  de uma vez. É aqui que o `PUT /projetos/{id}/etapas/fases` em lote se paga, e é o caminho natural
  para resolver a Q9 nos 9 projetos existentes.

Reaproveitamento barato: se 31c for feito como um componente que recebe itens e devolve itens
(`CaixasDeFase.jsx`), as duas telas são o mesmo componente com handlers diferentes — foi assim que o
`SeletorFase.jsx` serviu ao card e à Visão Geral (ADR-030).

---

## 7. 31e — onde a fase aparece

- **`TabelaEtapas.jsx`**: coluna "Fase" (ao lado de "Bloqueado por"/"Bloqueando").
- **`KanbanEtapas.jsx`**: chip discreto no card. ⚠️ **Cuidado:** as colunas do Kanban são
  `Etapa.status`; a fase é outro eixo. Um chip é suficiente — **não** transformar o Kanban interno em
  Kanban de fases, senão a tela passa a ter dois significados.
- **`CronogramaEtapas.jsx`**: oportunidade real — faixas de fase ao fundo do Gantt tornam o cronograma
  parecido com o slide final. **Opcional nesta fase**, e deliberadamente adiado: o motor de
  pointer-events da Fase 13 é frágil e já foi mexido três vezes.

---

## 8. O que isso prepara (Fase 32, não planejada aqui)

O slide "Cronograma de Execução" sai do mesmo molde do calendário de kick-off:

| Calendário de kick-off (28/30) | Slide de cronograma (32) |
|---|---|
|`calendarioKickoffTema.js`|tema próprio, mesma estrutura|
|`montarPaginas()` — uma página por mês|`montarFases()` — uma linha por fase|
|`CalendarioKickoff.jsx` — SVG 1440×810|componente SVG equivalente|
|`calendarioKickoffExport.js` — canvas 2×, zip|**reutilizável quase inteiro**|
|`CalendarioConfig` (cores por etapa)|persistência equivalente, se houver cor por fase|

A exportação (rasterização 2×, fontes embutidas, copiar por mês, zip store-only) é **genérica** e deve
ser extraída, não duplicada. Fica registrado como dívida a pagar na Fase 32, não agora.

**Insumo recebido em 15/10/2026 — o pré-requisito visual está resolvido:** `Proposta Espaço da
Mente.pdf`, página única de **1440×810** (a mesma base do calendário de kick-off), transcrita pelos
objetos internos em [cronograma-proposta.md](cronograma-proposta.md) — geometria, cores, fontes e a
estrutura de células mescladas. Plano de execução em [plano-fase-32.md](plano-fase-32.md).

Dois achados dessa transcrição realimentam **esta** fase:

- **A célula de prazo mesclada do slide é exatamente o `bloco_entrega`** do modelo. O slide não
  precisa de conceito novo — ele já desenha um dado que existe desde a Fase 5. Isso reforça a
  recomendação do §4: a fase **propaga dentro do bloco**, porque o bloco é uma linha só no slide.
- **A Q6 pode ser considerada respondida pela evidência:** neste slide aprovado por cliente o
  "Público-alvo" (Diagnóstico) vem **antes** da "Jornada do cliente" (Estratégia), e as fases ficam
  contínuas. A prática comercial já faz a inversão que a regra P1 pede.

---

## 9. Ordem de execução e dependências

```
31a (catálogo + ADR-001)  →  31b (fase no modelo)  →  31c (formulário)  →  31d (pós-criação)  →  31e (superfícies)
                                                                              ↓
                                                                      Fase 32 (slide)
                                                                              ↓
                                                                      Fase 33 (port p/ o Hub)
```

Dependências já existentes na fila: **Fase 29** (port do calendário de kick-off para o Hub) segue não
iniciada, e a **Fase 27** (seletor de fase + "Meus projetos") segue num PR não mergeado no Hub. A Fase
31 **não** depende de nenhuma das duas — mas o port da 31 (Fase 33) vai encontrar o mesmo campo de
minas registrado no [plano-fases-25-27.md](plano-fases-25-27.md): enum de fase diferente entre as
stacks, Tailwind lá × custom properties aqui, e a necessidade do gate `podeEditar`.

**Pendência herdada que continua aberta:** a passada visual 28e/30e (PNG rasterizado no browser).

---

## 10. Riscos registrados

| Risco | Mitigação |
|---|---|
|**Colisão de nome** entre `Projeto.fase` (galeria) e a fase do escopo|nomear `fase_escopo` no código; decidir no ADR-035|
|**Catálogo novo não bate com os projetos existentes** — vários têm etapas que saíram do escopo|a fase deles é atribuída à mão, pela tela da 31d (Q9)|
|**Fonte oficial com erro aritmético** (Plano de Comunicação, 53 × 60)|corrigir no documento antes de transcrever (ADR-005: a fonte é soberana, mas tem de ser consistente)|
|**ADR-001 no Hub é inaceitável**|a atualização do catálogo lá é `UPDATE`/`INSERT`, não wipe — registrado para a Fase 33|
|**Dois eixos no Kanban interno** (status × fase)|fase entra como chip, nunca como coluna|
|**Mexer no `CronogramaEtapas`** (pointer events da Fase 13)|31e trata o Gantt como opcional e adiável|

---

## 11. Decisões que preciso do responsável antes de executar

1. **Q1–Q9** de [classificacao-fases-etapas.md](classificacao-fases-etapas.md) (idealmente na mesma
   rodada com a diretoria).
2. **Opção A, B ou C** para a relação ordem × fase no editor (§5) — recomendação: **A**.
3. **A fase propaga dentro do bloco de entrega?** (§4) — recomendação: **sim**.
4. **`fase` ou `fase_escopo`** como nome do campo (§4) — recomendação: **`fase_escopo`**.
5. **Arquivo original do slide** (Canva/PDF), para a Fase 32 (§8).
