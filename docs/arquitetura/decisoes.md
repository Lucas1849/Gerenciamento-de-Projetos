# Decisões de Arquitetura (ADR)

Registro curto das decisões de design assumidas na reconstrução do modelo de dados e do backend. Cada uma tem o problema, a decisão e a justificativa — para que quem chegar depois entenda o "porquê", não só o "o quê".

---

### ADR-001 — Não adotar Alembic agora

**Contexto:** o schema vai mudar bastante nesta continuidade (catálogo de serviços, etapas, equipe flexível). Hoje o banco é recriado via `Base.metadata.create_all()`.

**Decisão:** manter `create_all()`, sem ferramenta de migração.

**Justificativa:** time de 1 desenvolvedor, dado atual descartável (confirmado — não há dado de produção a preservar), schema ainda em consolidação. Alembic compensa quando há dado real que não pode ser perdido ou múltiplos devs sincronizando schema — nenhum dos dois é o caso agora.

**Gatilho para reconsiderar:** entrada de dado real em produção, ou entrada de um segundo desenvolvedor no projeto.

---

### ADR-002 — Equipe flexível por etapa, não por projeto

**Contexto:** o modelo atual fixa a equipe no nível do projeto (`gerente_id` + 3 `consultorN_id`). A visão do produto exige número variável de consultores por etapa, incluindo consultores temporários que entram/saem ao longo do projeto.

**Decisão:** a equipe de consultores só existe no nível de **etapa**, via tabela de associação `EtapaConsultor` (many-to-many com `data_entrada`/`data_saida`). Não existe mais uma lista de consultores armazenada no nível de projeto.

**Justificativa:** evita ter dois lugares (projeto e etapa) que podem divergir sobre quem está na equipe. A "equipe do projeto" exibida na tela é **derivada** (união dos consultores de todas as etapas), nunca armazenada duas vezes. Esse mesmo dado (`data_entrada`/`data_saida` por etapa) é exatamente o que a futura ficha SIEX vai precisar.

**Consequência:** ao criar um projeto com consultores iniciais, o backend atribui esses consultores a todas as etapas geradas pelo template automaticamente — ver `docs/features/modelo-dados.md`.

---

### ADR-003 — Dois níveis de Kanban, dois campos diferentes

**Contexto:** a visão do produto descreve dois Kanbans distintos: um na galeria da gestão (mostrando projetos nas fases kick-off/andamento/finalização/ajustes/concluído) e outro dentro do projeto (mostrando etapas em não-iniciada/andamento/concluída).

**Decisão:** `Projeto.fase` (5 valores) controla o Kanban da galeria; `Etapa.status` (3 valores) controla o Kanban interno do projeto. São campos independentes, sem sincronização automática entre si.

**Justificativa:** são conceitos diferentes — a fase do projeto é uma visão gerencial de alto nível; o status de etapa é operacional. Tentar sincronizá-los automaticamente (ex.: "todas etapas concluídas ⇒ projeto concluído") adicionaria uma regra de negócio não pedida; a diretora/gerente decide a fase do projeto manualmente.

---

### ADR-004 — Papéis de pessoa: `Trabalhador` vs. `Professor`

**Contexto:** o projeto tem diretora, gerente, consultores (todos membros da empresa júnior) e um professor orientador (pessoa externa, da universidade).

**Decisão:** `diretor_id` e `gerente_id` referenciam `Trabalhador` (mesma tabela de colaboradores da empresa). `professor_orientador_id` referencia uma entidade nova e separada, `Professor`.

**Justificativa:** professor orientador não é um colaborador da empresa júnior — misturar as duas tabelas obrigaria campos irrelevantes (cargo, e-mail institucional da empresa) para uma pessoa que não pertence a ela.

---

### ADR-005 — Retomada do catálogo de serviços

**Contexto:** já houve uma tentativa de tabela de catálogo de serviços (`ServicosApoio`, commit `c71e220`), revertida no commit seguinte (`3e2d27b`) para permitir testes de estilização — nunca chegou a ser usada com conteúdo real.

**Decisão:** retomar o catálogo (`Servico` + `EtapaTemplate`), mas com o conteúdo (etapas, dias úteis, descrições dos 9 serviços) **validado com a diretoria antes do seed**, não assumido pela IA. Ver `docs/features/catalogo-servicos.md`.

**Justificativa:** etapas incorretas ou genéricas em produção seriam piores do que não ter o catálogo — é informação operacional real da consultoria, não algo que se possa inferir do contexto do produto.

---

### ADR-006 — Remoção de `depende_de_id`

**Contexto:** `TarefaKanban.depende_de_id` permitia (em teoria) modelar dependência entre tarefas, mas o frontend sempre envia `null` — nunca foi usado de fato.

**Decisão:** remover o campo. A nova entidade `Etapa` tem um campo simples `ordem` (inteiro), suficiente para ordenar etapas visualmente sem modelar dependências reais.

**Justificativa:** YAGNI — não há caso de uso real hoje que precise de dependência entre etapas. Se isso for necessário no futuro, reintroduzir é uma mudança de schema isolada.

---

### ADR-007 — `kickoff_realizado` / `tap_assinado`

**Contexto:** o modelo atual tem três campos de ciclo de vida do projeto que não se relacionam entre si: `status`, `kickoff_realizado` e `tap_assinado`. O novo modelo introduz `Projeto.fase` (kickoff/andamento/finalização/ajustes/concluído) como o campo principal de ciclo de vida.

**Decisão:** remover `status` e `kickoff_realizado` (a informação do kickoff já fica implícita quando `fase != kickoff`). `tap_assinado` **continua como um campo booleano independente** de `Projeto` — é um marco jurídico/contratual que pode não coincidir exatamente com a fase do projeto.

**Justificativa:** `fase` cobre o ciclo de vida gerencial sem campos redundantes; a assinatura do TAP é um fato contratual distinto da fase e por isso não pode ser derivada dela.

**Status:** decidido (validado com a diretoria).
---

### ADR-008 — Etapas customizadas na criação, ordem posicional e datas calculadas (Fase 5)

**Contexto:** a Fase 5 exige editar as etapas na criação do projeto (nome, dias úteis, data de início, ordem, etapas manuais) e calcular a data final por dias úteis. O catálogo (ADR-005) continua sendo conteúdo validado pela diretoria.

**Decisão:**
- `ProjetoCriar` ganha o campo opcional `etapas` (`EtapaProjetoCriar[]`). Omitido ⇒ cópia literal dos templates (comportamento anterior). Presente ⇒ o backend usa a lista customizada; **lista vazia é inválida (422)**.
- A `ordem` **não viaja no payload**: o backend atribui `ordem = índice + 1`. Elimina a classe de bugs de ordem duplicada/faltante vinda do cliente.
- `Etapa.data_inicio` (Date, nullable) é armazenada; a **data final é sempre derivada** (`data_inicio + dias_uteis_esperados`, feriados nacionais via `workalendar.america.Brazil`) e exposta em `EtapaResposta.data_fim` e em `GET /calendario/data-fim` (prévia do formulário — o frontend nunca calcula datas localmente).
- `Etapa.bloco_entrega` passa a ser **chave de bloco** (uuid compartilhado), não rótulo humano. Nos dois caminhos do cascade, blocos materializam com chave compartilhada: templates com `ordem` repetida no catálogo; itens com o mesmo `bloco_grupo` no payload (normalizados para o prazo/data do primeiro item do grupo).
- `etapa_template_id` de outro serviço no payload ⇒ 404.

**Justificativa:** customizar as etapas de UM projeto não viola o ADR-005 — o catálogo (templates) permanece intocado e diretoria-validado; o que muda é a instância. Guardar só `data_inicio` e derivar `data_fim` evita datas inconsistentes armazenadas.

**Status:** implementado na Fase 5 (05/07/2026).
---

### ADR-009 — Blocos de entrega interativos: chave compartilhada, prazo redundante e status individual (Fase 6)

**Contexto:** a Fase 6 torna os blocos de entrega interativos: card único no Kanban de etapas, gesto de ligação com o mouse (arrastar o 🔗 de uma etapa sobre outra + confirmar) nos dois contextos (Kanban de etapas e editor de criação) e botão de desfazer.

**Decisão:**
- **Sem tabela nova**: o bloco continua modelado pela chave uuid compartilhada em `Etapa.bloco_entrega` (ADR-008), com **prazo/data gravados redundantes em cada membro** (`dias_uteis_esperados`/`data_inicio` idênticos). Trade-off deliberado — promover a entidade própria se blocos ganharem mais atributos.
- **Status permanece individual por etapa**: o card do bloco mostra o progresso ("X/Y concluídas") e fica na coluna da **etapa menos avançada**; cada membro mantém status e equipe próprios.
- `POST /projetos/{id}/blocos` (`etapa_ids` mín. 2, `dias_uteis_esperados`, `data_inicio?`) valida que as etapas pertencem ao projeto (404) e que nenhuma já está em bloco (409); aplica a chave uuid e o prazo/data compartilhados. `DELETE /projetos/{id}/blocos/{chave}` desfaz o bloco limpando só a chave — **os membros mantêm prazo/data/status** (404 se a chave não existir no projeto).
- **Gesto nos dois contextos, com semânticas distintas**: no Kanban de etapas o gesto chama a API; no editor de criação apenas mescla os cards localmente (o backend materializa via `bloco_grupo` no `POST /projetos/`). O modal de confirmação (`ModalBloco.jsx`, compartilhado) pré-preenche o prazo com o **maior** entre os membros e a data com a **mais cedo**.
- Os dois gestos de arrastar convivem por **drag types distintos** (handle ⠿ reordenar via sortable; handle 🔗 ligar via draggable com id prefixado `link:`); ligação restrita a cards avulsos (formar bloco a partir de bloco existente fica de fora).

**Justificativa:** reusar a chave do ADR-008 mantém um único modelo de bloco nos dois caminhos (criação e pós-criação) sem migração de schema; desfazer preservando os valores dos membros evita perda de dados num gesto reversível.

**Status:** implementado na Fase 6 (05/07/2026).
---

### ADR-010 — Visualizações múltiplas de etapas: container único, visão não persistida e calendário com chips pontuais (Fase 7b)

**Contexto:** a Fase 7b adiciona à aba Etapas quatro visualizações (Por status / Tabela / Cronograma / Calendário), com referência visual nas telas de projetos do Notion.

**Decisão:**
- **Container único** (`EtapasProjeto.jsx`): busca etapas + colaboradores uma vez e concentra os handlers (mover status, equipe, recarregar), movidos do `KanbanEtapas` **sem alterar o corpo**. `KanbanEtapas.jsx` vira visão controlada por props; o `DndContext` e o gesto 🔗 de formar blocos permanecem encapsulados nele (chamadas `criarBloco`/`desfazerBloco` também, pois são exclusivas dessa visão).
- **A visão ativa não persiste entre navegações** (useState local) — trade-off consciente: persistência exigiria estado global/URL que o app (sem router) não tem; custo de re-selecionar é baixo.
- **Sem backend novo**: `EtapaResposta` já entrega `data_inicio` + `data_fim` derivada. Aritmética nova no frontend é só de **grade de calendário** (`datasUtils.js`, tudo em UTC, comparações por string ISO) — cálculo de dias úteis continua exclusivo do backend (ADR-008).
- **Cronograma**: CSS grid por mês, barras com clamp nos limites do mês, **bloco = barra única** (prazo/data compartilhados, ADR-009), faixas de fim de semana, aside "Sem data de início". Mês exibido compartilhado com o Calendário (estado no container; inicial = mês do menor `data_inicio`).
- **Calendário com chips pontuais** em `data_inicio` (▸) e `data_fim` (✔), **sem spans multi-semana** — a complexidade de layout de spans não se justifica para o piloto; máx. 3 chips por célula + "+N".
- Agrupamento de blocos e rótulos "Bloco 1, 2…" extraídos para `etapasUtils.js`, compartilhados por todas as visões.

**Justificativa:** um único fetch/conjunto de handlers evita divergência de estado entre visões; manter o Kanban como visão controlada preserva o comportamento validado na Fase 6 com risco mínimo de regressão.

**Status:** implementado na Fase 7b (05/07/2026).

---

### ADR-011 — Blocos com N etapas: estender, retirar membro específico e romper coexistem (Fase 8)

**Contexto:** o modelo (chave uuid em `bloco_entrega`, ADR-008/009) já suporta N membros — blocos vindos do catálogo renderizam corretamente —, mas os gestos limitavam blocos interativos a 2 etapas: `CardBloco` não era droppable, o editor de criação recusava alvo-bloco e o backend não estendia bloco existente. Requisito explícito do responsável: além de estender, retirar uma etapa específica de dentro do bloco, mantendo o rompimento total intocado.

**Decisão:**
- **Três gestos coexistem, sem mudança de schema**: formar (ADR-009, intocado), **estender** e **retirar membro**; "Desfazer bloco" total permanece exatamente como está.
- `POST /projetos/{id}/blocos/{chave}/etapas` (`BlocoEstender { etapa_ids: min 1 }`) estende bloco existente: as novas etapas **adotam o prazo/data do bloco** (copiados de um membro, redundância do ADR-009; sem re-perguntar ao usuário) e mantêm status individual. Validações: bloco/projeto inexistente (404), ids repetidos (422), etapa de outro projeto (404), etapa já em bloco — inclusive membro do próprio (409).
- `DELETE /projetos/{id}/blocos/{chave}/etapas/{etapa_id}` retira etapa específica: volta a ser avulsa mantendo prazo/data/status; **se restar 1 membro, o bloco inteiro dissolve** (invariante: bloco mínimo = 2). 404 para bloco/etapa não pertencente.
- **Kanban**: `CardBloco` vira droppable (`bloco-{chave}`) com realce; `aoSoltarLigacao` ramifica por prefixo do alvo (`card-` cria, `bloco-` estende). Blocos **não** ganham handle 🔗 (só avulsa→bloco; bloco→bloco fora de escopo). Botão `Unlink` por membro com `window.confirm` e toast específico quando a remoção dissolve o bloco.
- **Editor de criação**: merge de card avulso em item-bloco permitido (append em `membros`); na extensão o alvo mantém dias/data próprios.
- **`ModalBloco.jsx`** com prop retrocompatível `modo: 'criar' | 'estender'` — no modo estender o prazo/data são read-only ("a etapa adota o prazo e a data de início do bloco; o status continua individual").

**Justificativa:** a limitação era de gesto/extensão, não de modelo; reusar a chave compartilhada evita migração e mantém a semântica do ADR-009 (redundância de prazo/data, status individual). O invariante de bloco mínimo = 2 impede blocos degenerados de 1 etapa.

**Status:** implementado na Fase 8 (06/07/2026).

---

### ADR-012 — Exclusão de projetos e gestões: cascata deliberada e bloqueio de gestão com projetos (Fase 9)

**Contexto:** o piloto acumulou dados de teste e projetos cancelados sem forma de removê-los pela UI. A exclusão de projeto tensiona o ADR-002: apagar EtapaConsultor destrói o histórico de participação (dado da futura ficha SIEX).

**Decisão:**
- `DELETE /projetos/{id}` exclui em cascata (EtapaConsultor → Etapas → Projeto) via `cascade="all, delete-orphan"` nos relationships `Projeto.etapas` e `Etapa.consultores` — mudança só de ORM, **não** de schema de banco (fluxo ADR-001 não é acionado). 404 se inexistente; 204 sem corpo no sucesso.
- `DELETE /gestoes/{id}` é **bloqueado (409)** se a gestão tiver projetos ("Gestão possui N projeto(s); exclua-os primeiro") — default seguro contra perda em massa; gestão vazia exclui normalmente.
- **A perda do histórico SIEX é deliberada e aceitável no piloto** (a exclusão existe para dados de teste/projetos cancelados). Em produção (Fase 11), as rotas serão restritas a diretores/cargos com permissão de edição (`funcionarios.nivel_acesso` do Hub) e possivelmente trocadas por arquivamento.
- **Frontend**: botão de lixeira (`Trash2`, classe `btn-ghost-danger`) no card de gestão (galeria) e no rodapé do card de projeto (`KanbanFases`, com `stopPropagation`); confirmação forte via `window.confirm` explicitando o efeito; o 409 da gestão vira mensagem clara no toast.

**Justificativa:** cascata no ORM mantém o banco livre de órfãos sem trigger/migração; o bloqueio da gestão força exclusão consciente projeto a projeto em vez de um clique apagar um semestre inteiro.

**Status:** implementado na Fase 9 (06/07/2026).

---

### ADR-013 — Janela de plausibilidade de datas com fonte única no backend (Fase 10)

**Contexto:** o `<input type="date">` aceita qualquer ano digitado (ex. 05/12/8250) e o backend aceitava qualquer data válida — projetos nasciam com datas absurdas.

**Decisão:**
- **Regra com fonte única no backend**: `data_inicio` deve estar entre **01/01/(ano atual − 1)** e **31/12/(ano atual + 2)** — janela dinâmica baseada no ano corrente (em 2026: 2025–2028), cobrindo gestões passadas recentes e planejamento futuro razoável. `janela_datas_plausiveis()` + `validar_data_plausivel()` em `app/utils/calendario.py`, aplicados via `field_validator` do Pydantic em **todos** os pontos de entrada de data: `EtapaProjetoCriar`, `EtapaCriar` e `BlocoCriar` (`BlocoEstender` não carrega data) → 422 com mensagem em português; `None` passa (data opcional).
- **Frontend só pré-valida por UX**: `janelaDatas()`/`dataPlausivel()` em `datasUtils.js` espelham a regra; os inputs de data (`EtapasEditor`, `ModalBloco`) ganham `min`/`max` e o submit bloqueia com mensagem antes do POST (`FormularioProjetos`; no `ModalBloco` o CTA desabilita com aviso inline).
- **Exibição permanece DD/MM/AAAA** em todo lugar (`Intl.DateTimeFormat('pt-BR')`, padrão do repo).
- **Risco aceito**: janela fixa em código — se a empresa planejar mais de 2 anos à frente, ajustar as constantes no helper (decisão barata, registrada no código).

**Justificativa:** validar no schema Pydantic cobre qualquer cliente (UI, Swagger, integração futura) num ponto só; o espelho no frontend evita o round-trip para o caso comum de erro de digitação.

**Status:** implementado na Fase 10 (06/07/2026).

---

### ADR-014 — Edição pós-criação de etapas + cascata reativa de datas na criação (Fase 12)

**Contexto:** após os testes do piloto, o responsável pediu (1) que, ao preencher datas no formulário de criação, as datas de início se encadeiem pelos dias úteis de cada etapa e (2) poder **editar** etapas e blocos depois de criados (nome, dias úteis, data de início, ordem e consultores). Hoje não existe rota para alterar campos de etapa além do `status`, e não há cascata de datas.

**Decisão:**
- **Cascata reativa e encadeada** no editor de criação (correção explícita do gerente: não é só a 1ª etapa que dispara — **qualquer** alteração de dias úteis recomputa a própria data final e o início das etapas seguintes). Modelo: `início[0]` = âncora manual; para `k ≥ 1`, `início[k] = calcular_data_fim(início[k-1], dias[k-1])`; alterar `dias[j]` ou `início[0]` recomputa tudo à frente. Card sem `dias` quebra a cadeia dali para frente. Cada card do editor é uma unidade (bloco = 1 card). A aritmética de dias úteis **continua exclusiva do backend** (ADR-008): nova rota `POST /calendario/cascata` (`{ data_inicio, dias:[…] }` → `{ inicios:[…] }`) resolve a cadeia num round-trip.
- **Edição sem mudança de schema.** Schema novo `EtapaEditar` (nome, descrição, dias_uteis_esperados, data_inicio; com o validador de plausibilidade do ADR-013). `PATCH /etapas/{id}` aplica os campos enviados; **se a etapa é membro de bloco**, mudanças de `dias_uteis_esperados`/`data_inicio` propagam a **todos os membros** (redundância do ADR-009), enquanto `nome`/`descricao` permanecem individuais. `PUT /projetos/{id}/etapas/ordem` (lista completa de ids) reatribui `ordem = índice + 1` — cobre reordenar avulsas e membros de bloco. Consultores reusam as rotas existentes.
- **Edição disponível em mais de uma visão**: `ModalEditarEtapa.jsx` acionado por um botão ✏️ tanto no Kanban quanto na Tabela; o container `EtapasProjeto.jsx` concentra os handlers `editarEtapa`/`reordenar` (+ `recarregar()`).

**Justificativa:** reusar `calcular_data_fim` e a chave de bloco (ADR-008/009) entrega cascata e edição **sem migração de schema**; concentrar os handlers no container mantém o padrão do ADR-010 e evita divergência de estado entre as visões.

**Status:** planejado (06/07/2026) — Fase 12, ainda **não implementada**. Ver [../features/plano-fases-12-13.md](../features/plano-fases-12-13.md). Virar para "implementado" na execução.

---

### ADR-015 — Reintrodução de dependências informativas entre etapas + cronograma interativo (Fase 13)

**Contexto:** o responsável pediu um cronograma no estilo Notion — arrastar barras (muda início), redimensionar (muda a data final) e **ligar uma etapa a outra** registrando "Bloqueado por / Bloqueando". Isso reintroduz a dependência entre etapas que o **ADR-006 havia removido** (por YAGNI), o qual previa que o retorno seria "uma mudança de schema isolada".

**Decisão:**
- **Dependências são só informativas.** Ligar A "bloqueada por" B **grava e exibe** a relação (seta no cronograma, colunas "Bloqueado por"/"Bloqueando" na Tabela). **Nada é reagendado automaticamente** — as datas continuam manuais (decisão explícita do responsável). Reagendamento por dependência e detecção de ciclos **indiretos** ficam fora de escopo.
- **Coexistem com os blocos de entrega** (Fases 6–8, ADR-009), que permanecem intactos. São conceitos diferentes: bloco = entrega compartilhada (mesmo prazo/data); dependência = relação de precedência informativa. Uma etapa pode estar num bloco **e** ter dependências.
- **Nova tabela `EtapaDependencia`** (`etapa_id` = bloqueada, `bloqueada_por_id` = bloqueadora, `UniqueConstraint` no par, cascade delete). `EtapaResposta` ganha `bloqueada_por[]`/`bloqueando[]`. Rotas `POST`/`DELETE /etapas/{id}/dependencias` com validações de mesmo projeto, auto-referência, duplicata e **ciclo direto**. **Muda schema ⇒ apagar e recriar o `.db` + re-seed (ADR-001).**
- **Cronograma interativo** (`CronogramaEtapas.jsx`): mover/redimensionar via **pointer events nativos** chamando o `PATCH /etapas/{id}` da Fase 12; redimensionar converte a nova data final em `dias_uteis_esperados` por um **reverse-calendar novo** (`contar_dias_uteis` + `GET /calendario/dias-uteis`, inverso exato de `calcular_data_fim`). O **conector de dependência** reusa o padrão @dnd-kit do 🔗 (draggable → droppable), com semântica distinta do bloco. Bloco = barra única (arrastar/redimensionar propaga aos membros via o `PATCH`).

**Justificativa:** a reintrodução é exatamente a "mudança isolada" que o ADR-006 antecipou; mantê-la **informativa** entrega o valor pedido (visibilidade de bloqueios) sem a complexidade de um motor de reagendamento; reusar o `PATCH` da Fase 12 e a chave de bloco evita duplicar lógica de escrita.

**Status:** planejado (06/07/2026) — Fase 13, ainda **não implementada**, depende da Fase 12. Ver [../features/plano-fases-12-13.md](../features/plano-fases-12-13.md). Virar para "implementado" na execução.
