# Plano de ação — Fases 16, 17 e 18 (convenção de dias úteis + data final editável, Termo Aditivo, abas da gestão com documentos e dashboards)

Registro do planejamento pedido pelo responsável em **09/07/2026**, na sequência da Fase 15 ([plano-fase-15.md](plano-fase-15.md)). Origem: quatro pedidos numa mesma sessão — (1) correção do cálculo de dias úteis (a data final sai errada), (2) edição direta da data final de entrega na edição de etapa, (3) menu horizontal de abas na tela da gestão (Projetos / Documentos importantes / Dashboards) e (4) botão de **Termo Aditivo** nas entregas, formalizando dias adicionais para alimentar dashboards de atraso.

> Instrução explícita do responsável: **as fases só começam mediante comando direto**. Este documento é **apenas o planejamento** — nada foi implementado. Os ADRs 018, 019 e 020 estão **pré-registrados** em [../arquitetura/decisoes.md](../arquitetura/decisoes.md) com status "planejado"; na execução de cada fase, virar para "implementado". A Fase 11 (go-live/Hub) segue **gated no acesso externo**.

| Fase | Entrega | Status |
|---|---|---|
| 16 | Convenção **inclusiva** de dias úteis (dia de início conta como dia 1) + campo de **data final** na edição de etapa | ⏳ Planejada (ADR-018) |
| 17 | **Termo Aditivo** por etapa: registro formal de dias adicionais, com efeito na data final e histórico para dashboards | ⏳ Planejada (ADR-019) |
| 18 | Abas na tela da gestão: **Projetos** (Kanban atual) / **Documentos importantes** / **Dashboards** | ⏳ Planejada (ADR-020) — **18c gated na definição de KPIs com a diretoria** |

**Ordem obrigatória: 16 → 17 → 18.** A 16 corrige a base de cálculo de datas sobre a qual tudo se apoia (inclusive o efeito do termo aditivo); a 17 cria o dado que o dashboard da 18c consome (atrasos formalizados). As sub-fases 18a/18b não dependem da 17, mas executar a 18 por último evita entregar um dashboard vazio.

## Diagnóstico verificado no código (09/07/2026)

- **Bug de convenção confirmado.** [`calcular_data_fim`](../../backend/app/utils/calendario.py) usa `workalendar.add_working_days`, que **não conta o dia de início** ("A data de início não conta como dia útil gasto", docstring atual). Exemplo do responsável: início 23/02/2026 (segunda) + 5 dias úteis → hoje devolve **02/03/2026** (24, 25, 26, 27, pula fds, 02/03); na convenção esperada pela empresa (o dia da demanda **conta como dia 1**) seria **27/02/2026** (23, 24, 25, 26, 27). Não é bug do workalendar — é a convenção escolhida na Fase 5 que não bate com a operação real.
- **Efeito colateral útil da convenção atual:** a cascata ([`routes/calendario.py:52`](../../backend/app/routes/calendario.py)) usa `calcular_data_fim` como "início da próxima etapa" — o que, na convenção atual (exclusiva), dá o dia certo. Na nova convenção, o próximo início passa a ser `data_fim + 1 dia útil`, e **os inícios encadeados resultam idênticos aos de hoje** (23/02+5 → fim 27/02 → próxima começa 02/03). Só a **data final exibida** muda (um dia útil mais cedo).
- **`data_fim` nunca é persistida** — é derivada em [`routes/etapas.py:40`](../../backend/app/routes/etapas.py) e em `GET /calendario/data-fim`. Mudar a convenção **não exige migração nem recriar o `.db`**: os `dias_uteis_esperados` armazenados continuam válidos; as datas finais derivadas mudam na hora.
- **`contar_dias_uteis` é o inverso exato da convenção atual** (Fase 13, ADR-015, com teste de ida-e-volta) — precisa mudar junto, mantendo a inversão exata na nova convenção.
- **`ModalEditarEtapa.jsx` só edita dias úteis + data de início** (a data final vem de `DataFimPreview`, read-only). Não há campo de data final.
- **Feriados municipais (ex.: Uberlândia) não estão no calendário** — risco registrado desde a Fase 5 (workalendar `Brazil()` só nacionais). É exatamente o caso que motiva a edição manual da data final (16b).
- **A tela da gestão (`TelaGestao` em [`App.jsx`](../../frontend/src/App.jsx)) não tem abas** — header + formulário + `KanbanFases` direto. O padrão de abas existe em [`PaginaProjeto.jsx`](../../frontend/src/components/PaginaProjeto.jsx) (`.tabs-container`/`.tab`, estado `abaAtiva` não persistido — ADR-010).
- **Não existe nada de termo aditivo, documentos ou dashboards** no modelo (dashboards estavam explicitamente fora de escopo no [roadmap.md](roadmap.md) — esta fase os retira de lá na forma mínima).

---

## Fase 16 — Convenção inclusiva de dias úteis + data final editável (ADR-018)

### 16a — Correção da convenção de contagem (backend)

**Nova convenção (única em todo o sistema): o dia de início conta como dia útil 1.** `dias_uteis_esperados = 5` a partir de segunda 23/02 ⇒ entrega sexta **27/02**.

> **Esclarecimento (pedido pelo responsável em 09/07/2026): não é "tirar um dia da data final".** O que muda é **quais dias contam** como dias úteis trabalhados da demanda, na fonte única da contagem. Hoje o dia em que a demanda começa **não conta** como dia útil gasto (a contagem começa no dia seguinte); na nova convenção ele **conta como o dia 1**. Os `dias_uteis_esperados` armazenados não mudam — muda o conjunto de dias que eles representam:
>
> | | seg 23/02 | ter 24 | qua 25 | qui 26 | sex 27 | fds | seg 02/03 |
> |---|---|---|---|---|---|---|---|
> | Hoje (exclusiva) | início *(não conta)* | 1º | 2º | 3º | 4º | — | **5º = entrega** |
> | Nova (inclusiva) | **1º** | 2º | 3º | 4º | **5º = entrega** | — | 1º dia da *próxima* etapa |
>
> **Consistência para relatórios (requisito do responsável):** as três funções mudam **juntas** (`calcular_data_fim`, `contar_dias_uteis` como inverso exato, cascata), e cada dia útil passa a pertencer a **exatamente uma etapa** (23–27/02 da etapa 1; 02/03 é o dia 1 da etapa 2). Na convenção atual, o dia de entrega de uma etapa coincide com o dia "de início não contado" da seguinte — ambiguidade que contaminaria relatórios de esforço/atraso.

- **`calcular_data_fim(data_inicio, dias)`** (`utils/calendario.py`): passa a devolver o N-ésimo dia útil **contando o próprio início** quando ele é dia útil; se o início cai em fds/feriado, o dia 1 é o primeiro dia útil seguinte. Implementação: normalizar o início para o primeiro dia útil ≥ início e somar `dias − 1` dias úteis. Edge: `dias <= 0` → mantém devolvendo o próprio início normalizado (registrar em teste).
- **`contar_dias_uteis(data_inicio, data_fim)`**: vira o inverso exato da nova convenção (contagem **inclusiva nas duas pontas**): `contar(23/02, 27/02) = 5`; `contar(d, d) = 1` para `d` dia útil; `data_fim < data_inicio` → 0; data_fim em fds/feriado continua arredondando para o dia útil que cobre. **Teste de ida-e-volta obrigatório** com a nova convenção (mesmo rigor do risco 4 da Fase 13).
- **Cascata** (`POST /calendario/cascata`): próximo início = **primeiro dia útil após a data final** (`add_working_days(fim, 1)`). Resultado: inícios idênticos aos atuais (nenhuma etapa "anda" de lugar); só a data final exibida de cada etapa encurta um dia útil.
- **Pontos que mudam juntos:** `routes/calendario.py` (`/data-fim`, `/dias-uteis`, `/cascata`), derivação em `routes/etapas.py`. O frontend **não muda** (nunca calcula datas — ADR-008): `DataFimPreview`, Gantt, calendário e cards refletem na hora.
- **Testes:** atualizar `test_fase5.py` (as duas asserções mudam de expectativa), `test_fase12.py` (exemplo da cascata) e `test_fase13.py` (ida-e-volta) para a nova convenção + caso novo com o exemplo real do responsável (23/02/2026 + 5 → 27/02/2026) e caso de início em fim de semana.
- **Comunicar na entrega:** todas as datas finais exibidas de projetos existentes encurtam um dia útil (os inícios não mudam). Não há migração — `data_fim` é derivada.

### 16b — Data final editável na edição de etapa (frontend; backend inalterado)

**Princípio preservado (ADR-008): a data final continua derivada — nunca persistida.** O campo novo é açúcar de UI: o gerente informa a data final desejada e o sistema converte em dias úteis via o reverse-calendar existente.

- **`ModalEditarEtapa.jsx`**: novo campo "Data final" ao lado de "Dias úteis" e "Data de início". Os três ficam **sincronizados**: editar dias → data final recalcula (`GET /calendario/data-fim`, como hoje no preview); editar data final → dias recalculam (`GET /calendario/dias-uteis` com a contagem nova). No salvar, viaja **só `dias_uteis_esperados`** no `PATCH` (nada muda no backend; em bloco, a propagação ADR-009 segue automática).
- **Caso de uso motivador:** feriado municipal de Uberlândia não contado pelo calendário nacional — o gerente empurra a data final 1 dia; os dias úteis armazenados absorvem a diferença. Como feriados municipais **são** dias úteis nacionais, a data re-derivada bate exatamente com a escolhida.
- **Validação de UX:** data final caindo em fds/feriado nacional → aviso e ajuste para o dia útil que cobre (comportamento natural do `contar_dias_uteis`); data final < data de início → erro amigável; janela de plausibilidade (ADR-013) espelhada com `min`/`max` como nos outros campos de data.
- **Fora deste item:** editar data final **não** é termo aditivo — é correção do planejamento (sem registro formal). A distinção é a essência da Fase 17; deixar clara na UI (rótulos distintos).

---

## Fase 17 — Termo Aditivo por etapa (ADR-019)

**Proposta (aceitando o convite para propor, aprovada pelo responsável em 09/07/2026):** manter o formulário de formalização, mas **mínimo**, e guardar o termo como **registro separado** (intocável a partir do momento em que o documento formal é anexado — ver regra abaixo) em vez de editar os dias da etapa. É o que alimenta dashboards de atraso com dados confiáveis: os `dias_uteis_esperados` originais ficam intactos (compromisso/planejado), o termo registra a extensão (realidade), e a diferença é a métrica. O responsável validou explicitamente a convivência das **duas datas**: a **planejada** (`data_fim_original`) e a **real/efetiva** (`data_fim`, modificada pelos termos).

### 17a — Modelo e rotas (backend; schema **aditivo**)

- **Nova tabela `TermoAditivo`** (`termos_aditivos`):

  | Campo | Tipo | Observação |
  |---|---|---|
  | id | int | PK |
  | etapa_id | int | FK → Etapa, `ondelete` em cascata ORM (padrão ADR-012) |
  | dias_adicionais | int | > 0 (422 se ≤ 0) |
  | motivo | str | obrigatório — sem motivo não há formalização |
  | criado_em | datetime | carimbo do registro (para linha do tempo/dashboard) |
  | documento_url | str? | link do documento formal do termo (Drive); `null` = ainda não anexado — controla a trava de exclusão |

  **Tabela puramente aditiva ⇒ `create_all` materializa no próximo boot sem dropar o `.db`** (mesmo caso da Fase 13/ADR-015 — o fluxo ADR-001 não é necessário).
- **Derivação da data final passa a considerar os termos:** `data_fim = calcular_data_fim(data_inicio, dias_uteis_esperados + Σ dias_adicionais)`. `EtapaResposta` ganha: `dias_aditivos` (Σ), `data_fim_original` (derivada **sem** termos — o compromisso) e `termos_aditivos[]` (`id`, `dias_adicionais`, `motivo`, `criado_em`). O `data_fim` existente passa a ser a **data efetiva** (com termos) — Kanban, tabela, Gantt e calendário ganham a data real de entrega sem mudarem de código.
- **Rotas** (`routes/etapas.py`): `POST /etapas/{id}/termos-aditivos` (cria; 404 etapa inexistente; 422 dias ≤ 0 ou motivo vazio); `PUT /etapas/{id}/termos-aditivos/{termo_id}/documento` (anexa/atualiza o link do documento formal; validação leve de URL http/https → 422); e `DELETE /etapas/{id}/termos-aditivos/{termo_id}` com a **regra decidida pelo responsável (09/07/2026)**: termo **sem documento anexado** pode ser excluído (lançamento em rascunho/erro); termo **com `documento_url` preenchido** está formalizado com o cliente e fica **intocável** — DELETE devolve **409**. Dias e motivo **nunca se editam** (sem PATCH desses campos) — para corrigir, exclui (enquanto sem documento) e relança.
- **Bloco de entrega (decidido pelo responsável em 09/07/2026): o termo é do bloco, não de um membro.** Se uma etapa interna atrasa, o gerente compensa **realocando os dias úteis entre as etapas** (edição da Fase 12/16b) para entregar o bloco no prazo; o termo aditivo só existe quando **o bloco inteiro** atrasa. Na UI, o botão de termo aparece **no card/modal do bloco** — membros não têm botão individual. Armazenamento: o termo é gravado na **etapa de referência** do bloco (`membros[0]`) e a derivação da data efetiva considera o **Σ de termos de todos os membros** (robusto a termos residuais em outros membros). **Edge registrado:** desfazer o bloco mantém o termo na etapa em que foi gravado (passa a estender só ela) — aceito no piloto; avisar no confirm de desfazer.
- **`api.js`**: `criarTermoAditivo(etapaId, dados)`, `excluirTermoAditivo(etapaId, termoId)`.
- **Testes** (`test_fase17.py`): criar termo desloca `data_fim` e preserva `data_fim_original`; Σ com múltiplos termos; validações 404/422; termo em membro de bloco (conforme decisão); delete restaura a data.

### 17b — Botão e formulário de formalização (frontend)

- **Ponto de entrada:** botão "Termo aditivo" (ícone `FilePlus`/similar, estilo tonal) no card de etapa do Kanban e no `ModalEditarEtapa` (seção própria, separada dos campos de correção — reforçando a distinção 16b × 17). **Em blocos, o botão fica no card/modal do bloco** — membros individuais não recebem termo (decisão de 09/07/2026).
- **`ModalTermoAditivo.jsx`** (padrão `ModalBloco`/`ModalEditarEtapa`, `.form-*`, `useToast`): campos **dias adicionais**, **motivo** e **link do documento formal (opcional — pode ser anexado depois)** + resumo do efeito ("entrega passa de 27/02 para 04/03") calculado via `GET /calendario/data-fim`. Em bloco, o resumo deixa claro que a **entrega conjunta** se desloca.
- **Sinalização visual:** badge/chip "+N dia(s) · termo aditivo" (âmbar tonal, padrão `chip-warning`) no card da etapa e na tabela; no Gantt, a barra já se estende naturalmente (deriva de `data_fim` efetiva) — opcional marcar o trecho aditivo com listra sutil (só CSS, avaliar na execução).
- **Histórico visível:** lista de termos (dias, motivo, data, link do documento quando anexado) no `ModalEditarEtapa` da etapa/bloco. Termo **sem documento** mostra a lixeira `3c` (excluível) e o campo/botão "Anexar documento"; termo **com documento** trava (sem lixeira) e exibe o link — espelho fiel da regra 409 do backend.

---

## Fase 18 — Abas da gestão: Projetos / Documentos / Dashboards (ADR-020)

### 18a — Shell de abas na tela da gestão (frontend puro)

- **`TelaGestao` (App.jsx)** ganha o menu horizontal no padrão visual já existente (`.tabs-container`/`.tab` de `PaginaProjeto.jsx`): **Projetos** (default — o `KanbanFases` atual, intocado), **Documentos** e **Dashboards**. Estado `abaAtiva` local e **não persistido** (coerente com ADR-010).
- Extrair o conteúdo de cada aba para componentes próprios se `TelaGestao` crescer demais (padrão container da Fase 7b).

### 18b — Documentos importantes (backend + frontend)

**Formato confirmado pelo responsável (09/07/2026): links nomeados para o Drive, replicando a página de "Documentos importantes" que a gestão mantém hoje no Notion** (print de referência da sessão: seções "Base de Dados", "Gestão 2026.1", "EAPs", "Escopos Padronizados", "Projetos 2026", cada uma apontando para o drive.google.com). Sem upload de arquivo — a informação continua concentrada no Drive; a aba é o índice.

- **Nova tabela `Documento`** (aditiva — mesmo fluxo brando da 17a): `id`, `gestao_id` (FK), `nome`, `url`, `criado_em`. **Sem vínculo com projeto** — o formato atual é da gestão como um todo (print); vincular a projeto fica registrado como evolução, se pedida. Cascata ORM na exclusão da gestão (padrão ADR-012; documentos **não bloqueiam** a exclusão — são só links, diferente do 409 de gestão-com-projetos).
- **Rotas** (`routes/gestoes.py` ou router novo `documentos.py`): `GET /gestoes/{id}/documentos`, `POST /gestoes/{id}/documentos`, `DELETE /documentos/{id}`. Validação leve de URL (esquema http/https) → 422 (mesma validação reusada no `documento_url` do termo aditivo, 17a).
- **Frontend:** aba com grid de cards de link (nome + `ExternalLink` abrindo em nova aba, visual `.ui-card`), formulário inline "+ Adicionar documento" (`.form-*`, `useToast`) e lixeira `3c`. Sem editor — para corrigir, exclui e recria (piloto).

### 18c — Dashboards da gestão (backend + frontend)

> **Gated (09/07/2026): os KPIs ainda não foram levantados** — a aba veio de um comentário do diretor "por cima" e **precisa ser trabalhada com a diretoria antes de executar**. A 18a entrega a aba como **placeholder** ("em construção", coerente com o padrão dos itens `aria-disabled` da sidebar); o conteúdo abaixo é a **proposta-base para levar à diretoria**, não escopo fechado.

**Primeiro dashboard proposto: atrasos e termos aditivos** (o motivo de negócio citado pelo responsável), mais uma visão geral de andamento. **Sem biblioteca nova de gráficos** — barras/donuts em CSS/SVG com os tokens do design system (mesma filosofia sem-dependências do resto do frontend).

- **Rota agregadora** `GET /gestoes/{id}/dashboard` (evita N chamadas de etapas por projeto), devolvendo:
  - `projetos_por_fase` (contagem por `Projeto.fase`);
  - `etapas_por_status` (contagem por `Etapa.status`);
  - `termos`: total de termos, Σ dias aditivos, e ranking por projeto e por serviço (`[{projeto/servico, qtd_termos, dias_aditivos}]`);
  - `pontualidade`: etapas concluídas/em andamento com vs. sem termo aditivo (proxy de atraso formalizado — sem depender de "data real de conclusão", que o modelo não tem; se a diretoria quiser atraso *real*, isso é schema novo e fica registrado como evolução).
- **Frontend:** aba com cards de KPI (nº projetos, % etapas concluídas, termos aditivos, dias aditivos totais) + barras por fase/status + tabela-ranking "projetos com mais dias aditivos". Estado vazio amigável ("nenhum termo aditivo registrado 🎉").
- **Fora de escopo do 18c:** filtros por período, export, comparação entre gestões — registrar no roadmap se pedidos.

---

## Perguntas ao responsável — respostas registradas em 09/07/2026

1. **(16a) Convenção inclusiva:** ✅ **confirmada pelo responsável em 09/07/2026** ("contar a seg 23/02 como 1º dia da demanda é justamente a proposta"), após o esclarecimento incorporado ao quadro da Fase 16 (não é "tirar um dia da data final" — muda **quais dias contam**, nas três funções juntas, com inverso exato e cada dia útil pertencendo a exatamente uma etapa). Requisito dele atendido: dados sem inconsistência para relatórios.
2. **(17a) Bloco:** ✅ decidido — o termo é **do bloco inteiro**. Atraso de etapa interna se resolve realocando dias úteis entre as etapas do bloco; termo só quando o bloco atrasa. Botão no card/modal do bloco; membros sem termo individual.
3. **(17a) Exclusão:** ✅ decidido — termo **sem documento anexado é descartável**; anexar o **documento formal do termo** (link) **trava** o registro (DELETE → 409).
4. **(18b) Documentos:** ✅ confirmado — links nomeados para o Drive, replicando a página atual do Notion (print de referência da sessão).
5. **(18c) KPIs:** ❌ **não definidos** — a aba nasce como placeholder (18a) e a execução da 18c fica **gated** até a diretoria levantar os KPIs (a proposta-base do plano serve de pauta para essa conversa).

## Fora de escopo (registrado)

- **Feriados municipais/estaduais no calendário** (ex.: Uberlândia): continua fora — a 16b dá a válvula de escape manual. Se um dia entrar, é evolução isolada em `utils/calendario.py` (workalendar tem subclasses regionais).
- **Data real de conclusão de etapa** (para atraso real vs. formalizado): schema novo, fora desta leva; o dashboard usa o termo aditivo como proxy.
- **Upload/armazenamento de arquivos** (18b) e **bibliotecas de gráficos** (18c).
- **Reagendamento automático por dependência** (segue ADR-015) e alterações no catálogo (ADR-005).

## Verificação por fase (roda na execução)

- **16:** `pytest` com expectativas novas (todos os 43+ verdes) + caso 23/02/2026+5 → 27/02/2026; manual: criar etapa com o exemplo real e conferir Kanban/tabela/Gantt/calendário; editar a data final no modal e ver os dias recalcularem (e vice-versa); cascata na criação produz os mesmos inícios de antes.
- **17:** reiniciar backend (tabela aditiva via `create_all`); `pytest test_fase17.py`; manual: lançar termo numa etapa avulsa (badge + data efetiva + `data_fim_original` preservada), num membro de bloco (efeito conforme decisão), excluir termo restaura.
- **18:** `npm run lint`/`build`; manual: navegar as três abas (Kanban intocado), CRUD de documento com link abrindo em nova aba, dashboard batendo com os dados reais da gestão de teste; viewport 375/768/1024px.

## Riscos registrados

1. **(16a) Mudança silenciosa de datas exibidas:** usuários podem estranhar as entregas "encurtando" um dia. Mitigar comunicando na entrega da fase (é a correção pedida).
2. **(16a) Convenção tem que mudar em bloco:** `calcular_data_fim`, `contar_dias_uteis` e a cascata precisam virar **juntos** na mesma entrega, com ida-e-volta testada — meia-convenção quebraria a edição por data final (16b) e o resize do Gantt (Fase 13).
3. **(16b) Três campos sincronizados no modal:** loop de recomputação (dias→data→dias) — usar a mesma guarda de sequência da cascata (Fase 12) e definir "quem manda" por último campo tocado.
4. **(17a) Σ de termos em bloco:** a derivação por membro precisa considerar os termos do bloco inteiro (se a proposta for aprovada) — testar explicitamente para não divergir entre membros.
5. **(17) Confusão correção × formalização:** editar dias/data final (16b) e lançar termo (17) mudam a mesma data efetiva por caminhos diferentes. Mitigar com rótulos/microcopy distintos e seções separadas no modal.
6. **(18c) Dashboard sem dado de conclusão real:** o "atraso" reportado é o formalizado (termos), não o observado. Está explícito na rota/UI para não induzir leitura errada da diretoria.
7. **(17a) Desfazer bloco com termo lançado:** o termo permanece na etapa de referência em que foi gravado e passa a estender só ela — aceito no piloto; o confirm de desfazer deve avisar quando houver termo no bloco.
8. **(17a) Trava por documento depende de anexar de verdade:** se o gerente formalizar com o cliente e esquecer de anexar o link, o termo continua excluível. Mitigar com microcopy no histórico ("anexe o documento para travar o registro"); trilha rígida (flag de cancelamento) fica como evolução se a diretoria exigir.
