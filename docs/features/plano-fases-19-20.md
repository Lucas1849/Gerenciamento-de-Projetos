# Plano de ação — Fases 19 e 20 (links de entregas e demandas por etapa, aba Professores orientadores)

Registro do planejamento pedido pelo responsável em **09/07/2026**, na sequência das Fases 16–18 ([plano-fases-16-18.md](plano-fases-16-18.md)). Origem: dois pedidos numa mesma sessão — (1) os **gerentes** poderem anexar os **links das entregas e demandas** dentro de cada etapa dos seus projetos; (2) uma aba de **Professores orientadores** na galeria de gestões, ao lado de "Documentos importantes" — basicamente uma tabela com nome, serviço mais apropriado/de interesse do professor, contato e observações.

> **Ambas as fases foram executadas em 09/07/2026, sob comando direto do responsável.** Os ADRs 021 e 022 estão com status "implementado" em [../arquitetura/decisoes.md](../arquitetura/decisoes.md). As **perguntas do planejamento foram todas respondidas pelo responsável em 09/07/2026** — respostas registradas ao final. A Fase 11 (go-live/Hub) segue **gated no acesso externo**. Atenção pós-merge: a Fase 20 aciona o **fluxo destrutivo ADR-001** — apagar `piloto_projetos.db`, reiniciar o backend e rodar `python -m app.seed_catalogo`.

| Fase | Entrega | Status |
|---|---|---|
| 19 | **Links de entregas e demandas por etapa**: o gerente anexa links nomeados (Drive etc.) a cada etapa do projeto | ✅ Executada (09/07/2026) |
| 20 | Aba **Professores orientadores** na galeria de gestões (tabela: nome, serviço de interesse, contato, observações) | ✅ Executada (09/07/2026) |

**As fases são independentes** — nenhuma depende da outra; podem ser executadas em qualquer ordem ou juntas. Atenção: a **20 mexe em colunas de tabela existente (`Professor`) ⇒ aciona o fluxo destrutivo do ADR-001** (apagar o `.db` + re-seed do catálogo), diferente das adições puras de tabela das Fases 13/17/18/19.

## Diagnóstico verificado no código (09/07/2026)

- **Etapa não tem nenhum conceito de anexo/link.** O único link por etapa hoje é o `documento_url` do `TermoAditivo` (ADR-019) — específico da formalização de atraso, com trava de exclusão. Links de entregas/demandas são coisa distinta: utilitários do dia a dia, sem trava.
- **A validação de URL já existe e é compartilhada:** [`schemas.validar_url_http`](../../backend/app/schemas.py) (esquema http/https → 422), usada pelo `Documento` (Fase 18) e pelo `documento_url` do termo (Fase 17). A Fase 19 reusa.
- **`EtapaResposta` já carrega listas aninhadas** (`termos_aditivos[]`, `bloqueada_por[]`/`bloqueando[]`) — ganhar `links[]` segue o padrão sem mudança de arquitetura.
- **`Professor` é mínimo:** só `nome` + `email` nullable ([`banco_de_dados.py`](../../backend/app/models/banco_de_dados.py)); rotas só `POST`/`GET /professores` — **não há PUT nem DELETE**. `Projeto.professor_orientador_id` é FK nullable para ele.
- **Adicionar colunas em tabela existente NÃO é coberto pelo `create_all`** — ele só materializa tabelas novas. Colunas novas em `Professor` ⇒ **fluxo ADR-001**: apagar `piloto_projetos.db`, reiniciar, re-rodar `python -m app.seed_catalogo`. Os dados de teste do piloto se perdem — combinar o momento com o responsável.
- **O shell de abas da galeria já existe** (Fase 18/ADR-020): `TelaGaleriaGestoes` em [`App.jsx`](../../frontend/src/App.jsx) com `abaAtiva` local ('gestoes' | 'documentos') e o padrão `.tabs-container`/`.tab`. Acrescentar uma terceira aba é trivial.
- **O cadastro de professores hoje vive na tela Membros** (`FormularioProfessor.jsx` + grid de cards em `TelaMembros`), documentado como **scaffolding temporário de teste** desde a Fase 1. A aba nova é candidata natural a lugar canônico dos professores.
- **Não há autenticação no piloto** — a regra pretendida (registrada em 09/07/2026: **gerentes e o diretor** anexam) não tem como ser imposta por permissão; qualquer usuário do piloto anexa. O gating real por papel fica para a integração Hub (`nivel_acesso` em `plataforma_hub_funcionarios`, ver [integracao-apoio-hub.md](../arquitetura/integracao-apoio-hub.md)) — registrado em fora de escopo.

---

## Fase 19 — Links de entregas e demandas por etapa (ADR-021)

**Conceito:** cada etapa acumula links nomeados (documentos de entrega, demandas recebidas, materiais de apoio no Drive) que o gerente anexa e remove livremente. É o terceiro tipo de link do sistema — distinto do `documento_url` do termo aditivo (formalização, com trava — ADR-019) e dos Documentos importantes da área (nível galeria — ADR-020). Microcopy e posicionamento precisam deixar os três inconfundíveis.

### 19a — Modelo e rotas (backend; schema **aditivo**)

- **Nova tabela `EtapaLink`** (`etapa_links`):

  | Campo | Tipo | Observação |
  |---|---|---|
  | id | int | PK |
  | etapa_id | int | FK → Etapa, cascade ORM `delete-orphan` (padrão ADR-012) |
  | tipo | str | `entrega` \| `demanda` — ✅ confirmado em 09/07/2026: o gerente classifica ao anexar; chips visuais distintos |
  | nome | str | obrigatório — rótulo humano do link |
  | url | str | obrigatório, `validar_url_http` → 422 |
  | criado_em | datetime | carimbo do registro |

  **Tabela puramente aditiva ⇒ `create_all` materializa no próximo boot sem dropar o `.db`** (mesmo fluxo brando das Fases 13/17/18).
- **Links são da etapa individual, mesmo em bloco** (✅ decidido pelo responsável em 09/07/2026: "link em blocos são individuais, por etapa"): cada membro do bloco tem suas próprias demandas e sua própria entrega dentro da entrega conjunta. Nada da lógica de bloco (chave compartilhada, propagação) toca os links.
- **Rotas** (`routes/etapas.py`, padrão dos termos aditivos): `POST /etapas/{id}/links` (404 etapa inexistente; 422 nome vazio, tipo inválido ou URL não-http); `DELETE /etapas/{id}/links/{link_id}` (404) — **exclusão livre, sem trava**: link é utilitário, não formalização (contraste deliberado com o 409 do termo). Sem edição — para corrigir, exclui e recria (padrão dos Documentos, Fase 18).
- **`EtapaResposta` ganha `links[]`** (`id`, `tipo`, `nome`, `url`, `criado_em`) — Kanban, tabela e modais recebem os dados sem rota nova de leitura.
- **Testes** (`test_fase19.py`): criar/listar/excluir; 404/422; URL inválida; links não propagam entre membros de bloco; cascade ao excluir etapa/projeto.

### 19b — UI de anexos na etapa (frontend)

- **`api.js`**: `criarEtapaLink(etapaId, dados)`, `excluirEtapaLink(etapaId, linkId)`.
- **Ponto de entrada principal:** seção **"Entregas e demandas"** no `ModalEditarEtapa.jsx` (separada dos campos de datas e da seção de termos, reforçando a distinção): lista dos links (ícone por tipo + nome clicável abrindo em nova aba + lixeira `3c`) e formulário inline mínimo (tipo, nome, URL) com `useToast`. Em bloco, a seção aparece **por membro** (o modal de bloco já lista membros — cada um com seus links).
- **Sinalização no card do Kanban:** chip discreto com contagem (ícone `Paperclip`/`Link2` + "N link(s)") quando a etapa tem links — clicar abre o modal de edição na seção de links. Sem lista completa no card (o card já carrega prazo, equipe, badge de termo).
- **Tabela (`TabelaEtapas.jsx`):** coluna "Links" com a mesma contagem/chips compactos.
- Diferenciar visualmente `entrega` × `demanda` (cores tonais distintas nos chips — distinção confirmada em 09/07/2026).

---

## Fase 20 — Aba Professores orientadores na galeria de gestões (ADR-022)

**Conceito:** os professores orientadores são um recurso **da área** (como os Documentos importantes — ADR-020): uma tabela de consulta com nome, serviço mais apropriado/de interesse, contato e observações, numa aba própria da galeria de gestões. Passa a ser o lugar canônico de cadastro/consulta de professores (hoje espalhado no scaffolding da tela Membros).

### 20a — Colunas novas em `Professor` e rotas (backend; **fluxo destrutivo ADR-001**)

- **`Professor` ganha colunas:**

  | Campo | Tipo | Observação |
  |---|---|---|
  | servico_interesse | str? | **texto livre** — ✅ decidido pelo responsável em 09/07/2026 (não é FK ao catálogo; o interesse do professor pode não mapear para a cartela) |
  | contato | str? | texto livre (telefone/WhatsApp/e-mail alternativo); `email` existente permanece — ✅ confirmado em 09/07/2026 (a tabela mostra os dois) |
  | observacoes | str? | texto livre |

  **Coluna nova em tabela existente ⇒ `create_all` NÃO aplica — fluxo destrutivo ADR-001** (apagar `piloto_projetos.db`, reiniciar, `python -m app.seed_catalogo`). Único ponto da dupla de fases que perde os dados de teste do piloto — **combinar o momento da execução com o responsável**.
- **Rotas novas** (`routes/professores.py`): `PUT /professores/{id}` (atualização — contato e observações evoluem com o tempo, diferente do padrão exclui-e-recria dos documentos; ✅ confirmado em 09/07/2026); `DELETE /professores/{id}` com **409 se o professor estiver vinculado a algum projeto** (`professor_orientador_id` — mesmo padrão do 409 de gestão com projetos, ADR-012); 404 nos dois. `POST` existente ganha os campos novos (todos opcionais).
- **`ProfessorResposta` enriquecida:** campos novos (`servico_interesse`, `contato`, `observacoes`) — sem join nenhum: serviço de interesse é texto livre.
- **Atualizar [modelo-dados.md](modelo-dados.md)** (seção Professor) na execução — o doc é fonte de verdade do schema e hoje registra só `nome`/`email`.
- **Testes** (`test_fase20.py`): CRUD completo (incluindo PUT parcial); 409 com projeto vinculado; DELETE livre sem vínculo; 404 em id inexistente.

### 20b — Aba e tabela (frontend)

- **Terceira aba em `TelaGaleriaGestoes`** (App.jsx), ao lado de Documentos importantes: **Gestões / Documentos importantes / Professores orientadores** (`abaAtiva === 'professores'`, mesmo padrão `.tabs-container`/`.tab`, estado local não persistido — ADR-010).
- **`ProfessoresOrientadores.jsx`** (padrão do `DocumentosImportantes.jsx`): **tabela** (pedido explícito do responsável) com colunas **Nome / Serviço de interesse / Contato / Observações / ações**; formulário inline "+ Adicionar professor" (`.form-*`, `useToast`) com campo de **texto livre** para o serviço de interesse (decisão de 09/07/2026); ações por linha: editar (✏️ `Pencil`, abre a linha em modo edição ou modal mínimo — decidir na execução pelo mais simples) e lixeira `3c` com confirm — exclusão bloqueada com aviso claro quando o backend devolver 409 (professor orientando projeto).
- **`api.js`**: `atualizarProfessor(id, dados)`, `excluirProfessor(id)`; `criarProfessor` ganha os campos novos.
- **Tela Membros:** remover o `FormularioProfessor` e o grid de professores de `TelaMembros` — a aba vira o lugar canônico (✅ confirmado pelo responsável em 09/07/2026); Membros fica só com os colaboradores. O `FormularioProjetos` continua lendo `GET /professores` para o select de orientador — inalterado.
- Responsividade da tabela: scroll horizontal em viewport estreito (mesmo tratamento da `TabelaEtapas`).

---

## Perguntas ao responsável — respostas registradas em 09/07/2026

1. **(19a) Distinção entrega × demanda:** ✅ **classificar** — o campo `tipo` fica com os dois valores (`entrega` | `demanda`), o gerente escolhe ao anexar e cada tipo ganha chip visual distinto.
2. **(19a) Links em bloco de entrega:** ✅ decidido — "link em blocos são **individuais, por etapa**": cada membro com os seus; nenhum link de nível bloco.
3. **(20a) Serviço de interesse:** ✅ decidido — **texto livre** (a proposta de FK ao catálogo foi recusada): o campo é `servico_interesse` (String, nullable), sem dropdown; o interesse do professor pode não mapear para a cartela.
4. **(20a) Contato:** ✅ confirmado — manter `email` + adicionar `contato` livre; a tabela mostra os dois.
5. **(20b) Cadastro em Membros:** ✅ confirmado — "pode retirar o cadastro de professores da aba de membros": o formulário/grid sai de `TelaMembros`, a aba nova vira canônica.
6. **(20a) Edição de professor:** ✅ confirmado — `PUT /professores/{id}` entra (exceção justificada ao padrão exclui-e-recria dos Documentos: professor vinculado a projeto não pode ser excluído).
7. **(19, registro adicional do responsável) Quem anexa:** a regra pretendida é **gerentes e o diretor** anexarem links. Sem autenticação no piloto isso não é impositível (qualquer usuário anexa) — fica registrado como regra para o gating por `nivel_acesso` na integração Hub (fora de escopo).

## Fora de escopo (registrado)

- **Upload/armazenamento de arquivos** (19): links apenas, informação concentrada no Drive — mesmo princípio do ADR-020; upload real fica no roadmap (integração Hub).
- **Permissão por papel** (regra pretendida, registrada em 09/07/2026: **gerentes e o diretor** anexam): não há autenticação no piloto — qualquer usuário anexa. Gating real por `nivel_acesso` fica para a integração Hub ([roadmap.md](roadmap.md)).
- **Vincular professor a gestão ou a serviço múltiplo:** professores são da área (como documentos); um único campo livre de serviço de interesse basta no piloto — múltiplos interesses cabem no próprio campo ou em observações.
- **Status/disponibilidade do professor** (ex.: "orientando 2 projetos", "indisponível no semestre"): a contagem de projetos por professor é derivável e pode virar coluna calculada em evolução futura; não entra agora.
- **Migração de dados na Fase 20:** sem Alembic (ADR-001), os professores cadastrados no piloto se perdem com o `.db` — aceito (dados de teste).

## Verificação por fase (roda na execução)

- **19:** reiniciar backend (tabela `etapa_links` aditiva via `create_all`); `pytest test_fase19.py` + suíte inteira verde; `npm run lint`/`build`; manual: anexar links de entrega e demanda numa etapa avulsa e num membro de bloco (chip com contagem no card, coluna na tabela, links abrindo em nova aba), excluir link, conferir que membros de bloco não compartilham links; viewport 375/768/1024px.
- **20:** **apagar `piloto_projetos.db`**, reiniciar backend, `python -m app.seed_catalogo` (fluxo ADR-001 — combinar antes); `pytest test_fase20.py` + suíte inteira; manual: navegar as três abas da galeria (Gestões e Documentos intocadas), CRUD completo de professor na aba nova (incluindo editar contato/observações), tentar excluir professor vinculado a projeto (aviso do 409), select de orientador no `FormularioProjetos` funcionando, tela Membros sem o formulário de professor; viewport 375/768/1024px.

## Riscos registrados

1. **(20a) Fluxo destrutivo ADR-001:** primeira fase desde a 10 a exigir apagar o `.db` — os dados de teste (gestões, projetos, etapas, termos, documentos) se perdem. Mitigar combinando o momento com o responsável e avisando na entrega.
2. **(19) Três conceitos de "link" no sistema:** link de etapa (19), `documento_url` do termo (17) e Documento da área (18). Mitigar com rótulos/microcopy distintos e seções separadas no modal (o termo já tem seção própria).
3. **(19a) `EtapaResposta` crescendo:** termos + dependências + links na mesma resposta aninhada. Aceitável no piloto (volumes pequenos); se pesar, paginar/separar rotas de leitura é evolução isolada.
4. **(20b) Exclusão de professor vinculado:** o 409 precisa de mensagem clara na UI ("professor orienta o(s) projeto(s) X") — sem ela o usuário não entende por que a lixeira falha.
5. **(19b) Poluição do card do Kanban:** o card já tem prazo, equipe, badge de termo e botões — o chip de links deve ser o menor elemento possível (contagem, sem lista).
