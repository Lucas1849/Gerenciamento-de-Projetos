# Plano de ação — Fases 21 e 22 (seed de professores via planilhas, galeria de projetos no lugar do Kanban de fases)

Registro do planejamento pedido pelo responsável em **09/07/2026**, na sequência das Fases 19–20 ([plano-fases-19-20.md](plano-fases-19-20.md)). Origem: dois pedidos numa mesma sessão — (1) a aba **Professores orientadores** nascer **já alimentada** (como a tabela de serviços), a partir de duas planilhas da área (`Controle Aplicação.xlsx` e `Pesquisa Projeto IES (respostas).xlsx`), cruzando a primeira com a coluna de interesses da segunda; (2) **retirar o Kanban de fases dos projetos** — com ~12 projetos a navegação em colunas fica ruim — substituindo-o por uma **galeria de cards** maiores, com a fase exibida como badge no canto superior direito do card e alterada internamente na aba Visão Geral do projeto.

> **Nenhuma das fases foi executada.** Os ADRs 023 e 024 estão pré-registrados com status "planejado" em [../arquitetura/decisoes.md](../arquitetura/decisoes.md). **O responsável respondeu as perguntas principais em 09/07/2026** (seedar os 72; pesquisa prevalece; interesse em orientar vira **coluna nova** — forma delegada; galeria com **3 cards por linha** no desktop) — respostas registradas na seção ao final. A pergunta de privacidade foi resolvida por verificação: **o repositório é público** (`Lucas1849/Gerenciamento-de-Projetos`), logo o dataset de professores fica em **arquivo local gitignorado**. **Seguem abertas** (não bloqueiam, têm default proposto): chips de filtro por fase (6) e faixa de cor no card (7). A execução só começa **mediante comando direto do responsável**.

| Fase | Entrega | Status |
|---|---|---|
| 21 | **Seed de professores orientadores**: `seed_professores.py` popula a tabela `Professor` com o cruzamento das duas planilhas da área | 📋 Planejada |
| 22 | **Galeria de projetos** substitui o Kanban de fases dentro da gestão; fase vira badge no card + select na aba Visão Geral | 📋 Planejada |

**As fases são independentes entre si** — podem ser executadas em qualquer ordem ou juntas. Atenção às dependências externas: a **21 mexe no schema** — além de depender das colunas da Fase 20 (`servico_interesse`, `contato`, `observacoes`), ela própria **adiciona a coluna `interesse_orientar`** em `Professor` (resposta do responsável em 09/07/2026) ⇒ **fluxo destrutivo ADR-001**. Como o wipe da Fase 20 **ainda está pendente na máquina do responsável**, o ideal é executar tudo junto: um único wipe do `.db` → boot (`create_all` materializa todas as colunas) → `python -m app.seed_catalogo` → `python -m app.seed_professores`. Se o wipe da 20 acontecer antes, a 21 exigirá um segundo wipe (aceitável — dados de teste). A 22 é **100% frontend** (nenhuma mudança de schema ou rota — o `PUT /projetos/{id}` usado para mover de fase já existe).

## Diagnóstico verificado no código e nas planilhas (09/07/2026)

### Planilhas (fornecidas pelo responsável, em `Downloads/`)

- **`Controle Aplicação.xlsx`, aba "Professores": 72 professores** com colunas `Nome` / `Contato` (e-mail institucional `@ufu.br` em todos) / `Alinhamento com projeto` (**27 preenchidos** com nomes de serviços, incluindo typos — ex.: "Mapemaneto de processos e plano operacional").
- **`Pesquisa Projeto IES (respostas).xlsx`: 33 respostas**, 28 colunas (Google Forms). A coluna-foco indicada pelo responsável é a 22: **"Com base nos seus interesses pessoais, quais tipos de projetos você teria interesse de participar em conjunto ?"** — **25 professores** responderam com interesses (todos com "interesse em orientar = Sim"); **8 responderam "Não"** ao interesse em orientar (coluna 22 vazia). Colunas auxiliares potencialmente relevantes: departamento (col 2), "já orientou projetos da Apoio?" (col 8), tempo disponível/semana (col 23), interesse em ministrar treinamentos e quais (cols 26–27).
- **Cruzamento (crosswalk) verificado: todas as 33 respostas da pesquisa mapeiam para a lista dos 72** — mas **~9 exigem resolução manual de nome** (grafias divergentes entre as duas planilhas: nomes abreviados vs completos, caixa alta, acentos ausentes, um typo com caractere espúrio, espaços à direita). O de-para nominal **não é transcrito aqui** (repo público — a tabela de equivalências vive no dataset gitignorado, ver 21c). **Decisão de abordagem: resolver o de-para manualmente uma única vez na execução e transcrever o dataset já resolvido — sem fuzzy matching em runtime** (dataset pequeno e estático; mesmo princípio do catálogo, ADR-005: transcrição validada, não inferência).

### Código

- **A infraestrutura da Fase 20 cobre quase tudo que a 21 precisa:** colunas `servico_interesse`/`contato`/`observacoes` em `Professor` (texto livre — ADR-022), aba `ProfessoresOrientadores.jsx` com tabela + edição em linha + exclusão com 409. Após as respostas de 09/07/2026, a 21 passou a incluir **uma coluna nova** (`interesse_orientar` — ver 21a); nenhuma rota nova, só o campo a mais nos POST/PUT existentes.
- **O padrão de seed já existe:** [`seed_catalogo.py`](../../backend/app/seed_catalogo.py) — módulo com dataset transcrito + docstring apontando a fonte, idempotente (pula por nome), rodado de `backend/` com `python -m app.seed_catalogo`. A Fase 21 replica o padrão em `seed_professores.py`.
- **Precedente de dado não-versionado:** `docs/arquitetura/dados/apoio-hub-columns.csv` é **gitignorado** (metadado interno). As planilhas dos professores contêm **dados pessoais** (nomes + e-mails + respostas de pesquisa, incluindo recusas) e **o repositório é público** (`Lucas1849/Gerenciamento-de-Projetos`, verificado em 09/07/2026) ⇒ **o dataset não pode ser commitado** — vive em arquivo local gitignorado (ver 21b), com um `.exemplo` commitado documentando o formato (mesmo padrão do `.env`/`.env.example` já usado no repo).
- **`KanbanFases.jsx` é o único consumidor do board de fases** — renderizado por `TelaGestao` (App.jsx). O card (`card-projeto-kanban`, identidade Fase 14/15: gradiente, faixa de fase, watermark, bloco do gerente, avatares, chip TAP, excluir) move projetos com botões ←/→ chamando `atualizarProjeto(id, { fase })` — **a rota de mover já existe e a 22 só muda onde ela é chamada**.
- **Cuidado com CSS compartilhado:** `.kanban-board`/`.kanban-column`/`.kanban-col-header`/`.kanban-ghost`/`.kanban-card` são usados também pelo **`KanbanEtapas`** (Kanban de etapas dentro do projeto, que **fica** — o pedido é só sobre o board de fases de projetos). Na 22, remover apenas o consumo, não as classes.
- **A galeria de gestões já tem o grid pronto:** `.card-grid` (`repeat(auto-fill, minmax(320px, 1fr))`, gap 24) — candidato natural para a galeria de projetos.
- **A aba Visão Geral (`PaginaProjeto.jsx`) já mostra a fase** como chip no card "Iniciação" (e no header do projeto) e já tem o padrão de mutação inline (`alternarTap` via checkbox + `atualizarProjeto`) — o select de fase entra ao lado sem arquitetura nova.

---

## Fase 21 — Seed de professores orientadores (ADR-023)

**Conceito:** a aba Professores orientadores nasce alimentada com o corpo docente real da FAGEN, no mesmo espírito do catálogo de serviços (ADR-005): **as planilhas são a fonte, o seed transcreve** — a UI continua permitindo editar/complementar depois (PUT da Fase 20). Preencher as colunas do projeto (`nome`, `email`, `servico_interesse`, `contato`, `observacoes`) **mais a coluna nova `interesse_orientar`** — o responsável pediu (09/07/2026) que o interesse ou não em orientar fique **indicado explicitamente**, com a forma delegada ao planejamento ("criando uma nova coluna ou sei lá"); coluna estruturada escolhida em vez de texto em observações (filtrável, exibível como chip, sem ambiguidade).

### 21a — Regras de mapeamento (planilhas → `Professor`)

| Coluna do projeto | Fonte | Regra |
|---|---|---|
| `nome` | Controle Aplicação · `Nome` | Nome completo canônico (a Controle tem a grafia oficial; a pesquisa tem apelidos/abreviações) |
| `email` | Controle Aplicação · `Contato` | E-mail institucional `@ufu.br` |
| `servico_interesse` | **Pesquisa · col 22** (foco indicado pelo responsável), fallback Controle · `Alinhamento com projeto` | Pesquisa **prevalece** quando existir (✅ confirmado em 09/07/2026); typos normalizados ("Mapemaneto" → "Mapeamento"), nomes de serviço na grafia do catálogo; interesses em texto livre longos mantidos verbatim (o campo é texto livre por decisão do ADR-022) |
| `interesse_orientar` | Pesquisa · col 21 ("Você tem interesse em orientar projetos da Apoio ?") | **Coluna NOVA** (Boolean, nullable): `true`/`false` conforme a resposta; `NULL` para os 39 sem resposta à pesquisa — ✅ pedida pelo responsável em 09/07/2026 (forma delegada) |
| `contato` | — | **Vazio** — nenhuma das planilhas tem telefone/WhatsApp; o campo evolui pela UI |
| `observacoes` | Pesquisa · cols 2, 8, 23, 26–27 | Fatos úteis e compactos, ex.: `Pesquisa IES 06/2026 — depto Finanças · 2h/semana · topa treinamento: valuation`; o interesse em orientar **não** vai aqui (tem coluna própria) |

- **Opiniões livres da pesquisa NÃO entram** (avaliações da Apoio, críticas, comentários pessoais) — são dado sensível e não servem à operação da tabela.
- **Escopo de linhas:** **todos os 72** (✅ confirmado pelo responsável em 09/07/2026) — a aba é o diretório canônico da área; quem não tem interesse registrado fica com `servico_interesse` vazio e `interesse_orientar = NULL`, complementado depois pela UI.
- **Coluna nova em tabela existente ⇒ fluxo destrutivo ADR-001** (o mesmo wipe pendente da Fase 20 cobre as duas, se executadas juntas). Na execução, atualizar a seção Professor de [modelo-dados.md](modelo-dados.md).

### 21b — Coluna `interesse_orientar` (backend + UI)

- **Backend:** `interesse_orientar = Column(Boolean, nullable=True)` em `Professor`; `ProfessorResposta`/`ProfessorCriar`/`ProfessorAtualizar` ganham o campo (opcional, default `None`) — nenhum endpoint novo, os POST/PUT da Fase 20 já são parciais.
- **UI (`ProfessoresOrientadores.jsx`):** coluna **"Interesse em orientar"** na tabela — chip `Sim` (tonal verde, padrão `chip-success`) / `Não` (tonal âmbar, `chip-warning`) / `—` (sem resposta); na edição em linha e no formulário de adição, select de três estados (Sim / Não / Sem resposta).
- Posição sugerida da coluna: entre "Serviço de interesse" e "E-mail" (é o segundo dado mais consultado ao escolher orientador).

### 21c — Script de seed (backend)

- **`backend/app/seed_professores.py`** no padrão do `seed_catalogo.py`: docstring com fonte e data da transcrição, crosswalk resolvido, **idempotente por `nome`** (pula existentes — rodar duas vezes não duplica), executado com `python -m app.seed_professores`.
- **Onde os dados vivem — decidido pela verificação de 09/07/2026 (repo público):** o dataset (nomes, e-mails, interesses, respostas) fica em **`backend/app/dados/professores_seed.json` gitignorado**; o repo versiona apenas o script (lógica de carga/normalização) e um **`professores_seed.exemplo.json`** com 1–2 linhas fictícias documentando o formato (padrão `.env`/`.env.example` já usado no projeto; precedente de dado local no `apoio-hub-columns.csv`). O seed falha com mensagem clara se o arquivo real não existir. **Distribuição do arquivo entre máquinas é fora do git** (OneDrive da área, como o pacote de handoff da Fase 14).
- **Ordem no fluxo ADR-001:** apagar `piloto_projetos.db` → subir o backend (`create_all` com as colunas da Fase 20 **e** a `interesse_orientar`) → `python -m app.seed_catalogo` → `python -m app.seed_professores`. Documentar a dupla de seeds no CLAUDE.md e no ADR-001 (nota).
- **Teste (`test_fase21.py`):** rodar o seed contra o banco de teste (com um dataset fixture pequeno, não o real) → contagem esperada, campos de um professor com pesquisa + um só com alinhamento + um sem nada; `interesse_orientar` correto nos três estados (`true`/`false`/`NULL`) e aceito no POST/PUT; idempotência (2ª rodada não duplica); professores seedados aparecem no `GET /professores` (select de orientador do `FormularioProjetos` herda de graça).

---

## Fase 22 — Galeria de projetos no lugar do Kanban de fases (ADR-024)

**Conceito:** dentro da gestão, os projetos deixam de viver em 5 colunas de fase e passam a uma **galeria de cards** (grid responsivo) — com ~12 projetos as colunas espremem os cards e forçam navegação horizontal; a galeria escala verticalmente. A fase **não sai do modelo** (`Projeto.fase` e enums intactos): vira **badge no canto superior direito do card** e é alterada **na aba Visão Geral do projeto**. O Kanban de **etapas** (dentro do projeto) não muda nada.

### 22a — Galeria (frontend)

- **`GaleriaProjetos.jsx` substitui `KanbanFases.jsx`** em `TelaGestao` (App.jsx). Grid próprio `.galeria-projetos` com alvo de **3 cards por linha no desktop** (✅ resposta do responsável em 09/07/2026 — o handoff da Fase 14 era a inspiração, mas o critério é a distribuição de caixas: 3 por linha, cards com respiro): `repeat(3, minmax(0, 1fr))` no desktop, **2 colunas** em viewport média e **1 no mobile** — breakpoints exatos ajustados na execução considerando a largura útil com a sidebar (full ≥1024 / rail 768–1023 / drawer <768), garantindo 3 colunas na tela típica de trabalho.
- **O card mantém a identidade Fase 14/15** (gradiente, watermark, bloco do gerente, avatares de consultores, chip de serviço, footer TAP + excluir) e **ganha o badge de fase no canto superior direito** — dot colorido + label, cores/títulos de `fases.js` (`--fase-*`). A faixa de fase (`.kanban-card-faixa`) pode permanecer como reforço de cor (pergunta 7).
- **Somem os botões ←/→** de mover fase (a mudança migra para a Visão Geral, 22b).
- **Sugestão estratégica — filtro por fase:** linha de chips acima do grid ("Todas · N" + um chip por fase com contagem, cores dos dots) filtrando os cards — preserva a leitura "quantos em cada fase" que o Kanban dava de graça, sem colunas (pergunta 6). Ordenação padrão: fase (ordem do funil kickoff → concluído) e nome dentro da fase.
- **"+ Novo projeto"** como card fantasma no grid (reuso do visual `.kanban-ghost`) além do botão do header que já existe; estado vazio da gestão sem projetos ganha empty-state no padrão das outras abas.

### 22b — Mudança de fase na Visão Geral (frontend)

- No card **"Iniciação"** da aba Visão Geral (`PaginaProjeto.jsx`), o chip estático de fase ganha ao lado um **select de fase** (options de `FASES`), chamando `atualizarProjeto(id, { fase })` com toast de sucesso/erro — mesma lógica do `moverProjeto` que hoje vive no `KanbanFases`, movida de lugar. O chip do header do projeto e o badge do card refletem a mudança (estado já flui por `aoAtualizarProjeto`).
- Nenhuma rota nova, nenhum schema: `PUT /projetos/{id}` já aceita `fase`.

### 22c — Limpeza

- `KanbanFases.jsx` removido; CSS exclusivo do board de fases removido **somente se não for consumido pelo `KanbanEtapas`** (`.kanban-board`/`.kanban-column`/`.kanban-col-header`/`.kanban-ghost`/`.kanban-card` são compartilhados — ficam).
- `fases.js` fica (badge, select e chips-filtro consomem `FASES`/`FASE_LABEL`).

---

## Perguntas ao responsável — respostas registradas em 09/07/2026

1. **(21) Privacidade dos dados no repositório:** ✅ resolvida por **verificação** (não precisou de resposta): o repositório é **público** (`Lucas1849/Gerenciamento-de-Projetos`) ⇒ dataset com dados pessoais **não pode ser commitado** — arquivo local gitignorado + `.exemplo` commitado (ver 21c). As planilhas cruas não são versionadas em nenhum cenário.
2. **(21) Escopo de linhas:** ✅ respondida — **"Seedar os 72."**
3. **(21) Conflito pesquisa × alinhamento** (quando o professor tem os dois e divergem — a pesquisa costuma ser mais ampla que o alinhamento da Controle): ✅ respondida — **"Pesquisa prevalece."**
4. **(21) Interesse em orientar:** ✅ respondida com delegação — o responsável quer o interesse (ou não) **indicado explicitamente**, "criando uma nova coluna ou sei lá"; decisão de planejamento: **coluna estruturada `interesse_orientar`** (Boolean nullable) com chip Sim/Não/— na tabela, em vez de texto em observações (ver 21b).
5. **(22) Referência de tamanho do card:** ✅ respondida — o handoff (Fase 14) era o que ele tinha em mente ao instruir, mas sem precisar do pacote: o critério é **3 projetos por linha** na galeria em desktop (pensando na distribuição de caixas HTML/CSS), cards maiores que os atuais de coluna.
6. **(22) Filtro por fase na galeria** (chips com contagem acima do grid): ⏳ **ABERTA** — não bloqueia; default proposto = **incluir** (sem ele, a única leitura agregada de fase é badge a badge). Se o responsável recusar, cai fora sem impacto no resto.
7. **(22) Faixa de cor no card:** ⏳ **ABERTA** — não bloqueia; default proposto = **manter** a faixa da Fase 14 como reforço de cor junto do badge (remover é um delete de linha se ele preferir).

## Fora de escopo (registrado)

- **UI de importação de planilha** (21): o seed é script transcrito, como o catálogo (ADR-005) — importação self-service não entra no piloto.
- **Sugestão automática de orientador** no `FormularioProjetos` (ordenar/destacar professores cujo `servico_interesse` casa com o serviço do projeto): boa evolução habilitada pela Fase 21 — vai para o [roadmap](roadmap.md), não entra na fase.
- **Drag-and-drop de fase na galeria** (22): mover fase é ação deliberada e pouco frequente — o select na Visão Geral basta; DnD voltaria a acoplar a galeria à mecânica que estamos removendo.
- **Telefone/WhatsApp dos professores** (21): nenhuma planilha tem — o campo `contato` nasce vazio e evolui pela UI.
- **Dashboard de professores** (contagem de orientações etc.): segue gated nos KPIs da diretoria (ADR-020/roadmap).

## Verificação por fase (roda na execução)

- **21:** fluxo ADR-001 completo (apagar `piloto_projetos.db` → boot → `seed_catalogo` → `seed_professores` — combinar o momento, já que o wipe da Fase 20 segue pendente e um único wipe cobre as duas); `pytest` (suíte + `test_fase21.py`); rodar o seed **duas vezes** e conferir que não duplica; **`git status` limpo** — o `professores_seed.json` real não pode aparecer como untracked sem estar no `.gitignore`; manual: aba Professores orientadores populada (conferir 3 amostras: um com pesquisa, um só com alinhamento, um vazio), chip "Interesse em orientar" nos três estados (Sim/Não/—), select de orientador do `FormularioProjetos` listando os seedados, editar/excluir um professor seedado funciona.
- **22:** `npm run lint`/`build`; manual: galeria renderizando todos os projetos da gestão com badge de fase correto, filtro por chips (se aprovado), abrir projeto → Visão Geral → mudar fase pelo select → voltar e conferir badge/posição no filtro; Kanban de **etapas** intocado; criar/excluir projeto pela galeria; viewport 375/768/1024px.

## Riscos registrados

1. **(21) Dados pessoais versionados:** o repo **é público** (verificado em 09/07/2026) — o risco vira acidente de execução: commitar o `professores_seed.json` real por engano. Mitigar criando a entrada no `.gitignore` **no mesmo commit** que o `.exemplo` e conferindo `git status` na verificação.
2. **(21) Duplicatas com cadastro manual:** a idempotência é por nome exato — professores já cadastrados manualmente com grafia diferente duplicariam. Mitigar rodando o seed logo após o wipe ADR-001 (banco limpo) e conferindo a contagem.
3. **(21) Crosswalk manual:** ~9 nomes resolvidos à mão — um erro de de-para atribui interesses ao professor errado. Mitigar com a tabela de equivalências registrada no **dataset gitignorado** (não no seed commitado — repo público) e conferência por amostragem na verificação.
4. **(22) Perda da visão agregada do Kanban:** sem colunas, "quantos projetos em cada fase" some — mitigado pelos chips-filtro com contagem (pergunta 6).
5. **(22) CSS compartilhado com o Kanban de etapas:** remover classes `.kanban-*` sem auditar o `KanbanEtapas` quebra a tela de etapas — a limpeza (22c) remove só consumo comprovadamente exclusivo.
6. **(22) Card maior × densidade:** com 12+ projetos, cards grandes demais viram scroll infinito — o minmax do grid deve equilibrar (3 colunas em desktop largo); validar na verificação com a gestão mais cheia.
