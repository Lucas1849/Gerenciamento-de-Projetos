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
