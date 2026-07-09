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

**Status:** implementado (06/07/2026) — Fase 12 executada sob comando direto do responsável. Ver [../features/plano-fases-12-13.md](../features/plano-fases-12-13.md).

---

### ADR-015 — Reintrodução de dependências informativas entre etapas + cronograma interativo (Fase 13)

**Contexto:** o responsável pediu um cronograma no estilo Notion — arrastar barras (muda início), redimensionar (muda a data final) e **ligar uma etapa a outra** registrando "Bloqueado por / Bloqueando". Isso reintroduz a dependência entre etapas que o **ADR-006 havia removido** (por YAGNI), o qual previa que o retorno seria "uma mudança de schema isolada".

**Decisão:**
- **Dependências são só informativas.** Ligar A "bloqueada por" B **grava e exibe** a relação (seta no cronograma, colunas "Bloqueado por"/"Bloqueando" na Tabela). **Nada é reagendado automaticamente** — as datas continuam manuais (decisão explícita do responsável). Reagendamento por dependência e detecção de ciclos **indiretos** ficam fora de escopo.
- **Coexistem com os blocos de entrega** (Fases 6–8, ADR-009), que permanecem intactos. São conceitos diferentes: bloco = entrega compartilhada (mesmo prazo/data); dependência = relação de precedência informativa. Uma etapa pode estar num bloco **e** ter dependências.
- **Nova tabela `EtapaDependencia`** (`etapa_id` = bloqueada, `bloqueada_por_id` = bloqueadora, `UniqueConstraint` no par, cascade delete). `EtapaResposta` ganha `bloqueada_por[]`/`bloqueando[]`. Rotas `POST`/`DELETE /etapas/{id}/dependencias` com validações de mesmo projeto, auto-referência, duplicata e **ciclo direto**. **Muda schema ⇒ apagar e recriar o `.db` + re-seed (ADR-001).**
- **Cronograma interativo** (`CronogramaEtapas.jsx`): mover/redimensionar via **pointer events nativos** chamando o `PATCH /etapas/{id}` da Fase 12; redimensionar converte a nova data final em `dias_uteis_esperados` por um **reverse-calendar novo** (`contar_dias_uteis` + `GET /calendario/dias-uteis`, inverso exato de `calcular_data_fim`). O **conector de dependência** reusa o padrão @dnd-kit do 🔗 (draggable → droppable), com semântica distinta do bloco. Bloco = barra única (arrastar/redimensionar propaga aos membros via o `PATCH`).

**Justificativa:** a reintrodução é exatamente a "mudança isolada" que o ADR-006 antecipou; mantê-la **informativa** entrega o valor pedido (visibilidade de bloqueios) sem a complexidade de um motor de reagendamento; reusar o `PATCH` da Fase 12 e a chave de bloco evita duplicar lógica de escrita.

**Ajustes na execução (06/07/2026):**
- **Schema aditivo, sem dropar o `.db`.** A Fase 13 só *adiciona* a tabela `etapa_dependencias` — nenhuma coluna de tabela existente muda. Então `Base.metadata.create_all()` a materializa no próximo boot **sem perda de dados**; o fluxo destrutivo do ADR-001 (apagar o `.db` + re-seed) fica registrado como conservador, mas não foi necessário desta vez. Basta reiniciar o backend.
- **Conector de dependência por pointer events nativos, não @dnd-kit.** No cronograma, mover e redimensionar a barra já usam pointer events nativos; colocar o conector em @dnd-kit na mesma barra conflitaria com esses gestos. O conector 🔗 usa o mesmo mecanismo de pointer nativo (arrasta do handle → `elementFromPoint` acha a barra-alvo no drop), mantendo a semântica distinta do bloco (risco #6 do plano). O cascade das dependências é ORM `delete-orphan` nos dois sentidos em `Etapa` (apagar a etapa/projeto apaga os vínculos).

**Status:** implementado (06/07/2026) — Fase 13 executada sob comando direto do responsável, após a validação da Fase 12. Ver [../features/plano-fases-12-13.md](../features/plano-fases-12-13.md).

---

### ADR-016 — Redesign de identidade visual da área de Projetos, sem impacto de comportamento (Fase 14)

**Contexto:** o cliente aprovou um pacote de handoff de design ("Redesign de identidade visual do projeto") que substitui controles hoje com cara de "padrão do HTML" (checkbox, lixeira, chip de membro) e enriquece o botão primário, os cards do Kanban e o cronograma, mantendo o roxo do design system e trazendo o monograma da Apoio como detalhe de marca. A combinação aprovada é: botão `1c`, chip de remover `2b`, lixeira `3c`, checkbox `4a`, cronograma `5d`, cards `6a`/`6b`.

**Decisão:**
- **Redesign puramente visual/CSS.** Não toca backend, schema, modelo de dados nem lógica de comportamento — o toggle do TAP, o drag/resize/dependência do cronograma (ADR-015), a remoção de membro e as regras de negócio **permanecem intactos**; só a aparência muda. Consequentemente o fluxo destrutivo do `.db` (ADR-001) **não é acionado**.
- **Aditivo ao design system existente, não substituto.** Os tokens do `App.css` (cores de marca, `--fase-*`, raios, sombras, easings) e as fontes (Inter + Plus Jakarta Sans, já via Google Fonts) já batem quase 1:1 com a proposta; a fase refina 7 componentes e adiciona a marca d'água.
- **Monograma:** usar o `mono-light.png` do pacote de handoff (decisão do responsável — sem SVG oficial nesta fase), como utilitário `.marca-dagua` decorativo (`pointer-events:none`) reusado no botão `1c`, nos cards e no cronograma. O navy da logo **não** vira cor de UI.
- **Controles nativos substituídos preservando semântica:** o checkbox `4a` e a lixeira `3c` mantêm `input`/`<label>` real e os handlers (`onChange`/`checked`, `window.confirm`) — a troca é só de aparência/animação. O botão `1c` é aplicado na classe global `.btn-primary`, propagando a todos os CTAs de uma vez.
- **Cronograma `5d` é restyling sobre a engine viva da Fase 13:** o refino visual (linha 64px, barra 46px, progresso, linha "HOJE", seta com glow, bloco em hexágono, marca d'água) não pode alterar as medições por `%`/rects que o drag/resize/setas usam.

**Justificativa:** como os tokens já estão alinhados, tratar o redesign como camada visual aditiva entrega a identidade aprovada sem risco de regressão de dados ou de lógica; concentrar o botão na classe global e reusar os handlers existentes garante consistência sem duplicar comportamento.

**Status:** implementado (08/07/2026) — Fase 14 executada sob comando direto do responsável. Nota de implementação: o `mono-light.png` foi ingerido em `frontend/public/` e as marcas d'água são aplicadas por `background-position` com offset negativo (recorte natural na borda, **sem** `overflow:hidden`, que cortaria o handle 🔗 arrastável dos cards); a linha "HOJE" é uma borda-gradiente na célula do dia atual, sem overlay medido. Ver [../features/plano-fase-14.md](../features/plano-fase-14.md).

---

### ADR-017 — Refinos de design pós-Fase 14: ícones de prazo/data, bloco em barras individuais no cronograma e correção de estrutura do card de projeto (Fase 15)

**Contexto:** após a Fase 14, o responsável avaliou mockups ("Claude Design") e aprovou três ajustes (09/07/2026): (1) trocar os emoji `⏳`/`📅` de prazo e data por ícones SVG da marca; (2) no cronograma, deixar de colapsar um bloco de entrega numa barra única e mostrar **cada etapa-membro como barra individual**, com um **indicador de "entrega conjunta"** abaixo; (3) **corrigir a estrutura de espaçamento** do card de projeto, que hoje fica espremido — mantendo o card atual, **sem redesenhá-lo**.

**Decisão:**
- **Refino visual/CSS + renderização no frontend, sem impacto de comportamento.** Não toca backend, schema, modelo nem dados persistidos; o fluxo destrutivo do `.db` (ADR-001) **não é acionado**.
- **Ícones (15a):** dois SVG inline no traço da marca (cronômetro = prazo/duração; calendário-período = intervalo de datas), com `stroke="currentColor"` para herdar a cor da linha (prazo `--color-brand-glow`, data `--color-text-secondary`). Substituem `⏳`/`📅` em `KanbanEtapas.jsx` (card de etapa e de bloco) e `ModalBloco.jsx`. Opção aprovada: A + A.
- **Cronograma (15b):** o bloco deixa de ser 1 barra e vira **N barras-membro** (uma por etapa) + um **indicador de grupo** (colchete tracejado roxo + chip "Bloco N · entrega conjunta" com hexágono/cadeado SVG) posicionado pelo intervalo compartilhado. É **puramente de renderização** — o bloco no backend continua a **chave compartilhada com datas redundantes (ADR-009)** e a **propagação do `PATCH` (Fase 12)** mantém as barras-irmãs alinhadas ao arrastar/redimensionar qualquer membro. Como membros compartilham data, as barras ocupam o **mesmo intervalo** — a leitura vem do rótulo + indicador. O guard de setas passa a suprimir dependências **internas ao mesmo bloco** por `grupoBloco` (antes era `deKey === paraKey`).
- **Card de projeto (15c):** **não é redesign.** Mantém todos os elementos de hoje (faixa, título, chip de serviço, bloco do gerente, consultores, TAP, Excluir, setas ← →) e conserta a **estrutura de espaçamento**: ritmo vertical consistente (substituindo os `marginBottom` inline ad-hoc), `white-space: nowrap` **escopado** nos chips do card (o `.chip` global não muda) para o serviço e o TAP não quebrarem em 2 linhas, footer TAP+Excluir sem se espremer, e chip de serviço na própria linha sob o título.

**Justificativa:** tratar tudo como camada de renderização/CSS sobre o modelo existente entrega os três ajustes sem risco de regressão de dados ou de lógica; no cronograma, reusar a propagação de bloco da Fase 12 evita qualquer mudança de backend para exibir os membros individualmente; no card, escopar o `white-space` evita efeito colateral nos chips de outras telas.

**Status:** implementado (09/07/2026) — Fase 15 executada sob comando direto do responsável, na ordem 15a → 15c → 15b. Nota de implementação: os ícones vivem em `frontend/src/components/Icones.jsx` (`IconePrazo`, `IconeData`, `IconeHexagono`, `IconeCadeado`); no cronograma, a montagem de `items` emite um item por etapa-membro (`grupoBloco` marca o grupo) e uma linha-indicadora `.crono-grupo` é inserida após o último membro; a propagação ao arrastar qualquer membro foi verificada no browser (as barras-irmãs e o indicador acompanham). Ver [../features/plano-fase-15.md](../features/plano-fase-15.md).

---

### ADR-018 — Convenção inclusiva de dias úteis (o dia de início conta) + data final editável via reverse-calendar (Fase 16)

**Contexto:** o responsável reportou que a data final derivada sai errada para a operação real: início 23/02/2026 + 5 dias úteis deveria entregar em 27/02 (23, 24, 25, 26, 27), mas o sistema devolve 02/03 porque `calcular_data_fim` (Fase 5/ADR-008) usa `add_working_days`, que **não conta o dia de início**. Além disso, o gerente precisa poder ajustar a **data final** diretamente na edição da etapa — o calendário só cobre feriados nacionais, e um feriado municipal (ex.: Uberlândia) torna o prazo derivado irreal.

**Decisão:**
- **Convenção inclusiva única em todo o sistema:** o dia de início conta como dia útil 1 (se cair em fds/feriado, o dia 1 é o primeiro dia útil seguinte). `calcular_data_fim` e `contar_dias_uteis` mudam **juntos**, mantendo a inversão exata (ida-e-volta testada, mesmo rigor do ADR-015). A cascata passa a encadear com `próximo início = primeiro dia útil após a data final` — os inícios encadeados **resultam idênticos aos atuais**; só a data final exibida encurta um dia útil. **Não é ajuste de saída ("−1 dia"):** a definição de *quais dias contam* muda na fonte única, e cada dia útil passa a pertencer a exatamente **uma** etapa na cascata (hoje o dia de entrega de uma etapa coincide com o dia "de início não contado" da seguinte) — consistência exigida pelo responsável para os relatórios.
- **Sem migração:** `data_fim` nunca é persistida (sempre derivada) — os `dias_uteis_esperados` armazenados continuam válidos e o fluxo destrutivo do `.db` (ADR-001) não é acionado.
- **Data final editável como açúcar de UI, preservando o ADR-008:** o campo novo no `ModalEditarEtapa` converte a data desejada em `dias_uteis_esperados` via `GET /calendario/dias-uteis` e envia **só os dias** no `PATCH` existente (em bloco, a propagação ADR-009 segue automática). A data final continua derivada e o backend não ganha rota nem campo novo. Editar a data final é **correção de planejamento** — distinta da formalização de atraso (Termo Aditivo, ADR-019).

**Justificativa:** alinhar a convenção à contagem real da empresa corrige todas as superfícies de uma vez (a matemática é exclusiva do backend, ADR-008); converter data→dias no reverse-calendar já existente dá a válvula de escape para feriados municipais sem quebrar a fonte única de verdade nem persistir datas derivadas.

**Status:** planejado — convenção inclusiva **confirmada pelo responsável em 09/07/2026** ("contar 23/02 como 1º dia da demanda é justamente a proposta"); Fase 16 não iniciada (fases só começam sob comando direto do responsável). Ver [../features/plano-fases-16-18.md](../features/plano-fases-16-18.md).

---

### ADR-019 — Termo Aditivo como registro formal imutável por etapa, alimentando dashboards de atraso (Fase 17)

**Contexto:** o responsável precisa formalizar quando uma etapa vai precisar de **mais dias do que o esperado** (mudando a entrega final) e quer que essa formalização alimente dashboards de atraso da área. Editar os dias da etapa diretamente destruiria o histórico (o "esperado" original se perderia) — não haveria dado de atraso para medir.

**Decisão:**
- **Nova tabela `TermoAditivo`** (`etapa_id`, `dias_adicionais > 0`, `motivo` obrigatório, `criado_em`, `documento_url` opcional), **puramente aditiva** — `create_all` materializa sem dropar o `.db` (mesmo fluxo brando do ADR-015). Cascata ORM com a etapa (padrão ADR-012).
- **O compromisso original fica intacto:** `dias_uteis_esperados` não muda ao lançar termo. A derivação passa a ser `data_fim = calcular_data_fim(data_inicio, dias_esperados + Σ dias_adicionais)`; `EtapaResposta` expõe `data_fim` (efetiva), `data_fim_original` (sem termos) e `termos_aditivos[]` — a diferença é a métrica de atraso dos dashboards.
- **Trava pela formalização (decidido pelo responsável em 09/07/2026):** dias e motivo nunca se editam. Enquanto o termo **não tem documento anexado**, pode ser excluído (rascunho/erro de lançamento); ao anexar o **link do documento formal do termo** (`documento_url` — o doc gerado para o cliente), o registro **trava**: DELETE passa a devolver 409. Formalização via formulário mínimo (dias + motivo + documento opcional) com prévia do efeito na entrega.
- **Bloco de entrega (decidido pelo responsável em 09/07/2026): o termo é do bloco, não de um membro.** Atraso de etapa interna se resolve realocando dias úteis entre as etapas do bloco (Fase 12/ADR-018); o termo só existe quando o bloco inteiro atrasa. Botão no card/modal do bloco (membros sem termo individual); gravação na etapa de referência (`membros[0]`) com a data efetiva derivada do **Σ de termos de todos os membros** (robustez); desfazer o bloco mantém o termo na etapa em que foi gravado (edge aceito no piloto, com aviso no confirm).

**Justificativa:** separar compromisso (dias esperados) de extensão formalizada (termo) é o que torna o atraso mensurável; reusar a derivação única de datas (ADR-008/018) faz Kanban, tabela, Gantt e calendário refletirem a data efetiva sem código novo de exibição.

**Status:** planejado — Fase 17 não iniciada (fases só começam sob comando direto do responsável). Ver [../features/plano-fases-16-18.md](../features/plano-fases-16-18.md).

---

### ADR-020 — Abas na tela da gestão (Projetos / Documentos / Dashboards), documentos como links e dashboard derivado sem lib nova (Fase 18)

**Contexto:** o responsável pediu um menu horizontal na tela da gestão, no padrão das abas já existentes na página do projeto, com três abas: Projetos (o Kanban atual), Documentos importantes e Dashboards — este último consumindo os dados de atraso formalizados pelo Termo Aditivo (ADR-019).

**Decisão:**
- **Shell de abas** em `TelaGestao` reusando `.tabs-container`/`.tab` (visual da `PaginaProjeto`), estado local não persistido (coerente com ADR-010). O Kanban de fases permanece intocado como aba default.
- **Documentos = links nomeados para o Drive (formato confirmado pelo responsável em 09/07/2026, replicando a página de documentos que a gestão mantém no Notion):** nova tabela aditiva `Documento` (`gestao_id`, `nome`, `url`, `criado_em`) com CRUD leve, **sem vínculo com projeto** (evolução futura se pedida). O piloto não tem storage de arquivos e a informação continua concentrada no Drive; upload real fica no roadmap (integração Hub).
- **Dashboards gated na diretoria (09/07/2026):** os KPIs **ainda não foram levantados** — a aba entra como placeholder no shell (18a) e a execução do dashboard (18c) espera a definição com a diretoria. Proposta-base registrada como pauta: rota agregadora `GET /gestoes/{id}/dashboard` (projetos por fase, etapas por status, termos/dias aditivos por projeto e serviço), com o "atraso" **formalizado** (termos) — o modelo não tem data real de conclusão; se a diretoria quiser atraso observado, é schema novo registrado como evolução. **Sem biblioteca de gráficos** — barras/KPIs em CSS/SVG com os tokens existentes.

**Justificativa:** o padrão de abas já resolvido evita navegação nova (sem router, ADR do frontend); links cobrem a necessidade real de "documentos importantes" sem infra de arquivos; a rota agregadora evita N chamadas e o dashboard nasce do único dado de atraso confiável que o modelo tem (termos aditivos), sem prometer métricas que os dados não sustentam.

**Status:** planejado — Fase 18 não iniciada (fases só começam sob comando direto do responsável; ordem 16 → 17 → 18). Ver [../features/plano-fases-16-18.md](../features/plano-fases-16-18.md).
