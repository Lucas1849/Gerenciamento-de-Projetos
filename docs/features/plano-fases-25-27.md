# Plano de ação — Fases 25, 26 e 27 (visão "Meus projetos"; seletor de fase no card; port para o Apoio Hub)

Registro do planejamento pedido pelo responsável em **08/08/2026**, na sequência das Fases 23 e 24 ([plano-fases-23-24.md](plano-fases-23-24.md)). Origem: dois pedidos na mesma mensagem, ambos sobre a **galeria de projetos** entregue na Fase 22 (ADR-024):

1. **Alternância de visualização** — um botão no **canto superior direito** que troca entre "apenas os meus projetos" e "todos os projetos", com **padrão em "meus"**. Motivação declarada pelo responsável: *"melhorar a visualização e tirar a poluição"* — é **filtro de conforto, não controle de acesso**.
2. **Mudar a situação do projeto mais facilmente** — hoje a fase só muda dentro do projeto, na aba Visão Geral. A ideia do responsável: um **dropdown no próprio card**, mostrando a situação atual e permitindo trocá-la ali.

> **STATUS (atualizado em 23/08/2026):**
>
> - **Fases 25 e 26 — EXECUTADAS** no piloto em 08/08/2026 e mergeadas no `master` (PRs #29 e #31).
> - **Fase 27 — EXECUTADA como PR de teste, ainda NÃO MERGEADA.** Auditoria de 23/08/2026 no repo do Hub: commit `c02c6ca` ("feat: Fase 27 — filtro 'Meus projetos' e seletor de fase no card") existe na branch `feat/fase-27-meus-projetos-seletor-fase`, pushed para o origin, **mas não é ancestral de `main`** — logo o seletor de fase e o filtro "Meus projetos" **não estão no ar**. Escopo do PR pendente: **4 arquivos, 262 inserções** — `SeletorFase.jsx` (novo), `GaleriaProjetos.jsx`, `VisaoGeral.jsx` e `src/pages/Projetos.jsx`.
>
> ⚠️ **Armadilha registrada:** o working tree do repo do Hub fica nessa branch. **Ver o arquivo no diretório não significa que está publicado** — conferir sempre com `git cat-file -e main:<arquivo>`. Esse erro já foi cometido uma vez nesta documentação.
>
> O texto original desta seção era *"PLANEJADO — NADA EXECUTADO"*; ficou desatualizado por duas semanas. Detalhes da auditoria em [../arquitetura/gaps-publicacao-hostgator.md](../arquitetura/gaps-publicacao-hostgator.md#fase-27-está-em-pr-de-teste-não-publicada).

## O enquadramento que define este plano: duas stacks

Decisão do responsável em 08/08/2026, e a diferença mais importante em relação a todas as fases anteriores: **este plano se divide entre dois repositórios**.

| | **Piloto** (`empresa-projetos`) | **Stack principal** (`ApoioHub`) |
|---|---|---|
| Papel | **Ambiente de testes** — a documentação chega aqui primeiro | Produção publicada (Hostgator) |
| Stack | FastAPI + SQLite + React (Vite, CSS custom properties) | PHP + MySQL + React (Vite, Tailwind) |
| Autenticação | **Não existe** — `USUARIO_DEMO` é decorativo | **Real** — `AuthContext` + `nivel_acesso` + cargos por área |
| Nesta entrega | Fase 25 (**só o botão e o layout**) + Fase 26 (seletor de fase, completo) | Fase 27 — as duas features **funcionando**, via PR de teste |

O motivo é direto: a feature 1 depende de saber **quem é "eu"**, e isso o piloto não tem. Em vez de inventar um usuário falso no piloto, a intenção fica **documentada** aqui, o **layout** é validado aqui, e o **funcionamento** nasce onde já existe login de verdade. O ADR-028 registra essa divisão como decisão de arquitetura, porque ela vale para toda feature futura que dependa de identidade.

## As três fases

| Fase | Entrega | Onde | ADR |
|---|---|---|---|
| 25 | Botão **"Meus projetos / Todos"** — layout nos dois estados, sem filtrar | Piloto | ADR-028, ADR-029 |
| 26 | **Seletor de fase no card** da galeria, unificado com a Visão Geral | Piloto | ADR-030 |
| 27 | **Port das duas features** para o Apoio Hub, funcionando | Hub (PR de teste) | ADR-028 a ADR-030 |

**Nenhuma das três mexe em schema.** Não há fluxo destrutivo ADR-001 em nenhuma stack, e — verificado no código das duas — **nenhuma rota nova é necessária**: tudo que as features precisam já viaja nas respostas existentes. As Fases 25 e 26 são independentes entre si; a 27 depende das duas (é o port delas).

## Diagnóstico verificado no código (08/08/2026)

### O piloto não sabe quem é o usuário

`USUARIO_DEMO = { nome: 'Lucas', streak: '0 semanas' }` (`frontend/src/App.jsx`) é um card decorativo da sidebar, como os itens `aria-disabled` do menu — réplica visual do Hub, sem nada por trás. Não há sessão, token, nem noção de usuário atual em lugar nenhum do piloto. A autenticação real é a **Fase 11**, travada externamente no acesso ao banco do Hub ([plano-fases-7-11.md](plano-fases-7-11.md), [../arquitetura/integracao-apoio-hub.md](../arquitetura/integracao-apoio-hub.md)).

⇒ **"Meus projetos" é irrealizável no piloto sem inventar um usuário.** Daí a Fase 25 entregar só o botão e o layout.

### O cargo, no piloto, é texto livre

`Trabalhador.cargo` é `Column(String)` e o formulário (`FormularioColaborador.jsx`) é um `<input type="text">` com placeholder *"Ex: Assessor de Projetos"*. Não há enum, não há área, não há vínculo com nada. Qualquer regra que ramifique por cargo no piloto dependeria de comparar strings digitadas à mão — e normalizar isso seria mudança de schema, acionando o fluxo destrutivo do ADR-001.

⇒ É a razão técnica por trás da regra escolhida (união, sem interpretar cargo — ADR-029), e o motivo pelo qual a paridade de cargos/permissões entre piloto e produção virou **item de roadmap** ([roadmap.md](roadmap.md)), a pedido do responsável.

### O Hub já tem identidade e permissão prontas

- **Identidade:** `src/contexts/AuthContext.jsx` mantém `user` no `localStorage` (`apoiohub_user`) e o re-busca de `get_perfil_dados.php` no mount. O id do usuário logado é `user.plataforma_hub_funcionarios.id`.
- **Permissão:** `src/utils/permissions.js` é a fonte única — `isAdminGlobal(user)` (níveis `gg`, `presidencia`, `diretor executivo`) e `pertenceAArea(user, areaId)`. Em `src/pages/Projetos.jsx`: `const podeEditar = isAdminGlobal(user) || pertenceAArea(user, AREA_PROJETOS)`, propagado como prop para toda a árvore do módulo.
- **Espelho no backend:** `api/proj_auth_lib.php` implementa exatamente a mesma regra (`PROJ_AREA_PROJETOS = 7`), e **todo endpoint de escrita chama `proj_exigir_editor()`**. A leitura é deliberadamente liberada — *"read-only para toda a empresa"*, no comentário do próprio arquivo.

⇒ A feature 1 tem identidade pronta; a feature 2 tem o gate de permissão pronto.

### Os dados do filtro já viajam — nas duas stacks

| Insumo da regra | Piloto | Hub |
|---|---|---|
| Sou gerente? | `gerente_id` em `ProjetoListaResposta` | `p.*` em `proj_get_projetos.php` |
| Sou diretor? | `diretor_id` idem | `p.*` idem |
| Sou consultor ativo? | `equipe[]` — `equipe_derivada()` usa `consultores_ativos()` | `equipe[]` — query com `ec.data_saida IS NULL` |

⇒ **Feature 1 é 100% frontend nas duas stacks.** Nenhum `GET` novo, nenhum parâmetro novo, nenhuma query nova.

### A fase já é editável — só está escondida

- **Piloto:** `PUT /projetos/{id}` aceita `{fase}` (`ProjetoAtualizar`) e devolve a forma da listagem com a equipe embutida — feito justamente para poder ser escrito de volta no estado da galeria. A UI que o usa é o `<select>` "Mover para a fase" na aba Visão Geral (`PaginaProjeto.jsx`), colocado lá pela Fase 22.
- **Hub:** `api/proj_editar_projeto.php` aceita `{id, fase, solicitante_id}`, valida contra a lista de fases e exige editor. A UI é o `Select` de fase em `VisaoGeral.jsx`, já condicionado a `podeEditar`.

⇒ **Feature 2 também é 100% frontend nas duas stacks.** O trabalho é só de interface.

### Duas divergências entre as stacks — armadilhas de port

1. **Os valores de fase são diferentes.** Hub (com hífen, iguais aos ENUMs do MySQL): `kick-off`, `em-andamento`, `finalizacao`, `ajustes`, `concluido`. Piloto: `kickoff`, `andamento`, `finalizacao`, `ajustes`, `concluido`. **Copiar `fases.js` de um repo para o outro quebra as duas pontas** — cada stack tem o seu, e cada um é a fonte única do seu lado.
2. **O estilo é incompatível.** O piloto usa as custom properties do `App.css` (`--color-brand`, `--sp-*`, `.chip`, `.badge-fase`); o Hub usa Tailwind com tokens próprios (`accent-600`, `surface`, `hairline`, `rounded-card`). **O port é reescrita visual**, não cópia de JSX.
3. **A navegação difere.** O piloto tem dois níveis (galeria de gestões → galeria de projetos da gestão, `TelaGestao` em `App.jsx`); o Hub resolve numa tela só, com um **`<select>` de gestão** acima da galeria (`Projetos.jsx`). O "canto superior direito" é, portanto, um lugar diferente em cada stack — detalhado em 25a e 27a.

## Decisões tomadas na conversa de aprovação (08/08/2026)

| Pergunta | Decisão do responsável |
|---|---|
| Como o piloto sabe quem é "eu"? | **Não sabe, e não vai fingir.** Piloto recebe botão + layout; funcionamento vai para a stack principal via PR de teste |
| Regra de "meus projetos" | **União** — gerente **ou** diretor **ou** consultor ativo. Sem interpretar cargo |
| "Todos" é livre ou restrito? | **Livre para todos** — é anti-poluição, não permissão |
| Onde o botão aparece? | **Só na galeria da gestão** — as contagens dos cards de gestão continuam somando todos os projetos |
| Comportamento no piloto | **Alterna de estado sem filtrar**, para os dois visuais serem avaliáveis |
| Pauta futura levantada pelo responsável | Aproximar o ambiente de testes do tratamento real de **cargos e permissões** de produção → registrado no [roadmap](roadmap.md), não é fase deste plano |

---

## Fase 25 — Botão "Meus projetos / Todos": layout no piloto, regra documentada (ADR-028, ADR-029)

**Conceito:** o piloto ganha o **controle** e o **lugar** da feature, nos dois estados visuais, para o responsável aprovar a interface antes do port. O **filtro não roda** — não há usuário atual para alimentá-lo. A regra que ele executará no Hub fica especificada aqui (25c) e implementada na Fase 27.

### 25a — O controle e onde ele fica
- **Lugar:** header da galeria de projetos de uma gestão — em `TelaGestao` (`frontend/src/App.jsx`), dentro do `.page-header`, **à direita**, ao lado do botão "+ Novo Projeto". É literalmente o "canto superior direito" do pedido, e o único lugar do piloto onde a lista de projetos aparece.
- **Forma:** um **segmented control** de dois segmentos — `Meus projetos` | `Todos` — e não dois botões soltos nem um checkbox: o padrão precisa comunicar "estou vendo um recorte", não "existe um filtro aplicado em algum lugar". Ícone `User` / `Users` (lucide, já é a dependência de ícones) reforçando a leitura.
- **Estilo:** reaproveitar os tokens existentes. O visual mais próximo já pronto é o dos **chips de filtro por fase** (`.filtro-fase` / `.filtro-fase.ativo`, Fase 22) logo abaixo, no mesmo grid — o segmented control deve conversar com eles sem competir. Sem cor nova, sem token novo.
- **Estado inicial:** `Meus projetos` selecionado, conforme o pedido ("por padrão da feature a visualização é apenas para os projetos os quais faço parte").
- **Responsivo:** abaixo de 640px o header já empilha; o controle acompanha, ocupando a largura e mantendo os dois segmentos lado a lado.

### 25b — Comportamento no piloto: alterna, não filtra
- O clique **troca o segmento ativo** (estado local `useState`, como o `filtroFase` da Fase 22) para que os dois visuais sejam avaliáveis, mas **a lista de projetos não muda** — não há identidade para filtrar.
- A ausência de filtro precisa ser **visível e explicada**, nunca silenciosa (senão parece bug): dica textual discreta quando "Meus projetos" está ativo, no estilo *"No piloto o filtro não roda: depende do usuário logado do Apoio Hub."*, mais `title`/`aria-description` no controle.
- **Comentário obrigatório no código**, apontando para este plano e para o ADR-028 — mesmo tratamento que a sidebar decorativa (`ITENS_MENU_HUB`) e o `USUARIO_DEMO` já recebem: quem ler o arquivo depois precisa saber em uma linha que é maquete deliberada, não código pela metade.
- **Escopo negativo explícito:** nada de `localStorage`, nada de seletor de identidade, nada de "usuário fixo no código". Foi decidido contra — o piloto não ganha um conceito de usuário nesta fase.

### 25c — A regra de "meus projetos" (especificada aqui, executada na Fase 27)
Um projeto é **meu** quando qualquer uma destas for verdadeira para o usuário logado (id `u`):

```
projeto.gerente_id === u            // sou o gerente
projeto.diretor_id === u            // sou o diretor responsável
projeto.equipe.some(c => c.id === u) // sou consultor ATIVO de alguma etapa
```

- **União, sem ramificar por cargo.** O pedido descreve dois casos ("quem não é da área vê os projetos de que faz parte" / "quem é da área vê também os que gerencia") e a união cobre os dois naturalmente: quem não é da área de Projetos só aparece como consultor; quem é aparece também como gerente/diretor. Nenhuma consulta a cargo é necessária — o que é decisivo no piloto, onde cargo é texto livre.
- **"Consultor ativo" quer dizer `data_saida IS NULL`** — é o que as duas stacks já devolvem em `equipe[]`. Consequência aceita na aprovação: **quem saiu de uma etapa deixa de ver aquele projeto em "Meus"**; para reencontrá-lo, alterna para "Todos".
- **O filtro não esconde nada de ninguém.** "Todos" fica disponível para qualquer pessoa (decisão do responsável) e a leitura da API é liberada nas duas stacks. Isto **não é** controle de acesso — está registrado no ADR-029 para que ninguém depois confunda o botão com permissão.

### 25d — Contagens e estados vazios
- Os **chips de filtro por fase** (Fase 22) contam sobre a lista visível. Quando o filtro passar a valer (Fase 27), eles precisam contar **dentro do recorte ativo** — "Todas · 4" com "Meus" ligado significa 4 projetos meus. Contar o total geral ali seria mentir. No piloto (25) nada muda, porque nada filtra.
- **Estado vazio próprio:** quando "Meus projetos" não devolver nada, não cair no empty state genérico "Nenhum projeto nesta gestão" (que sugere gestão vazia) — mostrar algo como *"Você não participa de nenhum projeto desta gestão"* com um atalho para "Todos". Especificado aqui, implementado na 27.
- **Contagens dos cards de gestão continuam totais** — decisão do responsável ("só na galeria da gestão"). O subtítulo "N projeto(s) nesta gestão" do header, idem.

### 25e — Verificação
- `npm run lint` e `npm run build`.
- Conferência visual nos dois estados e nos três breakpoints (≥1024px, 768–1023px, <768px), incluindo a convivência com os chips de fase.
- **Sem teste automatizado**: a fase não tem lógica — é layout inerte. Os testes da regra nascem com a implementação real (Fase 27).

---

## Fase 26 — Seletor de fase no card da galeria (ADR-030)

**Conceito:** o badge de fase do card deixa de ser só rótulo e vira **controle**. Clicar abre um menu com as cinco fases; escolher move o projeto. É a feature 2 completa e funcional **no piloto** — ela não depende de identidade, então não há razão para adiá-la.

### 26a — Componente `SeletorFase.jsx`
- **Um componente, dois consumidores.** O mesmo controle serve o card da galeria e a aba Visão Geral, substituindo o `<select>` "Mover para a fase" de `PaginaProjeto.jsx`. Duas UIs para a mesma ação, driftando com o tempo, é exatamente o que se evita aqui.
- **Popover próprio, não `<select>` nativo.** O nativo não renderiza os dots coloridos das fases e ignora o design system — depois das Fases 14 e 15 (identidade visual), destoaria. O custo é ter de implementar o que o nativo dá de graça, e por isso o comportamento fica especificado: fecha com `Esc` e com clique fora, navega com setas, `Enter`/`Espaço` seleciona, `role="menu"` + `aria-expanded`, foco volta ao gatilho ao fechar. **Se o custo do popover se mostrar alto na execução, o fallback é o `<select>` nativo estilizado** — decisão de execução, registrada no ADR-030.
- **Variantes:** `badge` (compacta, para o card) e `campo` (com rótulo, para a Visão Geral) — mesma lógica, mesmo menu.
- **Fase atual sempre visível no gatilho** (dot + título), que é o pedido literal: *"um dropdown onde fica mostrando a situação do projeto no card"*.

### 26b — Integração no card da galeria
- O `<span className="badge-fase">` de `GaleriaProjetos.jsx` vira o gatilho do seletor, no mesmo canto superior direito do card, preservando a faixa de cor da fase (`.kanban-card-faixa`, Fase 14).
- **`stopPropagation` obrigatório** no gatilho e no menu: o card inteiro é clicável e abre o projeto. Sem isso, todo clique no seletor navega para fora. É o detalhe mais fácil de errar desta fase.
- **Atualização otimista com rollback:** aplica a fase na hora, chama `PUT /projetos/{id}`, e em caso de erro volta ao valor anterior com `toast.error`. Sucesso → `toast.success` no padrão que `mudarFase` já usa hoje.
- **Estado:** reintroduzir em `useDados` um `atualizarProjetoLocal(projetoAtualizado)` — removido na Fase 22 justamente porque a galeria deixara de mutar projetos. Agora ela volta a mutar, então a função volta com ela. A alternativa (`aoRecarregar()`, que refaz as cinco chamadas do `useDados`) é pesada e pisca a tela inteira para uma mudança de um campo.

### 26c — Unificação na página do projeto
- Trocar o `<select>` da Visão Geral (`PaginaProjeto.jsx`) pelo `SeletorFase` na variante `campo`, mantendo o `mudarFase` existente como handler. O chip de fase do header do projeto continua **só leitura** — dois controles para a mesma coisa na mesma tela seria confuso.

### 26d — Verificação
- **Manual, no browser:** mudar a fase pelo card e ver o badge, a faixa de cor e os contadores dos chips acompanharem; conferir que o card **não** abre o projeto ao usar o menu; voltar para a galeria e confirmar que a fase persistiu; forçar erro (backend desligado) e ver o rollback; percorrer o menu só pelo teclado.
- `npm run lint` / `npm run build`.
- **Backend intocado** ⇒ a suíte `pytest` existente (81 testes) segue cobrindo o `PUT /projetos/{id}`; a fase não adiciona teste de backend.

---

## Fase 27 — Port das duas features para o Apoio Hub (PR de teste)

**Conceito:** é aqui que o responsável **vê as duas features funcionando**. O repositório é `ApoioHub` (`src/components/projetos/`, `src/pages/Projetos.jsx`), a entrega é um **PR de teste** — não um push direto em `main`, porque é produção publicada.

### 27a — "Meus projetos" funcional
- **Identidade:** `const { user } = useAuth();` → `const meuId = user?.plataforma_hub_funcionarios?.id;`, no mesmo lugar onde `Projetos.jsx` já calcula `podeEditar`.
- **Filtro:** a regra de 25c, aplicada sobre a lista já carregada. `proj_get_projetos.php` devolve `gerente_id`, `diretor_id` e `equipe[]` (só ativos) — **nenhuma alteração de PHP, SQL ou schema**.
- **Lugar do botão:** a linha do seletor de gestão (`flex items-center gap-3 flex-wrap`, em `Projetos.jsx`), empurrado para a direita — o Hub não tem a galeria de gestões em tela separada, então este é o "canto superior direito" equivalente. Estilo Tailwind coerente com os chips de filtro de fase de `GaleriaProjetos.jsx` (`rounded-full`, `bg-accent-600/20`, `ring-accent-500/30` para o ativo).
- **Padrão "Meus"**, alternância livre para todos, contagens dos chips de fase dentro do recorte, empty state próprio (25d).
- **Sem `meuId` (sessão expirada, dado incompleto):** cair para "Todos" e não renderizar o controle — nunca mostrar uma lista vazia sem explicação.

### 27b — Seletor de fase funcional
- Mesma estrutura da Fase 26, **reescrita em Tailwind** com os tokens do Hub — não copiar JSX nem CSS do piloto.
- **Gate de permissão, obrigatório:** o seletor só é interativo com **`podeEditar`** (`isAdminGlobal(user) || pertenceAArea(user, 7)`), porque `proj_editar_projeto.php` chama `proj_exigir_editor()` e devolveria *"Sem permissão para editar projetos."*. Para o resto da empresa o badge continua **exatamente como é hoje** — rótulo estático. Mesmo padrão que `podeEditar` já aplica ao botão de excluir e ao card fantasma.
- **Chamada:** `editarProjeto(id, { fase })` (`src/components/projetos/api.js`), que já injeta o `solicitante_id`. Valores de fase **com hífen** (`kick-off`, `em-andamento`) — ver a armadilha registrada no diagnóstico.
- **Fase 26c também vale aqui:** unificar com o `Select` de fase de `VisaoGeral.jsx`, que já é condicionado a `podeEditar`.

### 27c — Entrega e verificação
- **Branch + PR no repo `ApoioHub`**, descrevendo as duas features, apontando para este plano e listando o roteiro de teste manual. Sem merge sem o aval do responsável.
- **Roteiro manual:** entrar com um usuário **da área de Projetos** (vê o seletor de fase, filtro funciona) e com um **de fora da área** (badge estático, filtro funciona, "Todos" acessível); conferir que um projeto onde se é **só consultor** aparece em "Meus"; mudar a fase e confirmar a persistência após recarregar; conferir que quem não pode editar não consegue disparar a edição por nenhum caminho.
- **Sem suíte automatizada no Hub** — o repositório não tem testes de frontend; a verificação é manual e está descrita no PR.

---

## Fora de escopo (registrado)

- **Autenticação no piloto** — é a Fase 11, travada no acesso ao banco do Hub. Esta entrega não a antecipa nem parcialmente: nada de usuário simulado, seletor de identidade ou membro fixo no código (recusado explicitamente em 08/08/2026).
- **Cargos e permissões normalizados no piloto** — pauta levantada pelo responsável na aprovação e registrada no [roadmap](roadmap.md). Mexe em schema (`Trabalhador.cargo` virar enum/área) ⇒ fluxo destrutivo ADR-001. Não é fase deste plano.
- **Restringir a visão "Todos" por cargo** — recusado: o botão é anti-poluição. Restrição real de leitura seria mudança de produto nas duas stacks (hoje a leitura é liberada por decisão) e só faria sentido com auth.
- **O botão nos demais níveis de navegação** — o responsável escolheu "só na galeria da gestão". Filtrar as gestões da tela inicial (esconder as em que não tenho projeto) ficou de fora por poder sumir com uma gestão inteira do campo de visão.
- **Persistir a preferência do botão** (localStorage/perfil) — o padrão "Meus" a cada visita basta; persistir vira decisão de UX própria, avaliável depois de usar.
- **Reordenação/arrasto de fase na galeria** — mudar fase arrastando o card foi o que a Fase 22 removeu ao aposentar o `KanbanFases`. O seletor é a alternativa; o Kanban de fases **não volta** (ADR-024 continua valendo nesse ponto).
- **Filtro por outros critérios** (serviço, gerente, TAP) — só a alternância pedida. A galeria já tem os chips de fase; empilhar filtros sem pedido é poluir exatamente o que a feature quer limpar.

## Riscos registrados

1. **(25) Botão que não faz nada vira bug percebido.** Um controle que alterna sem efeito é indistinguível de um quebrado. Mitigar com a dica textual visível (25b) e comentário no código; e tratar a Fase 27 como parte da mesma entrega, não como "depois".
2. **(26) O card pula ao mudar de fase.** A galeria ordena pelo funil (kickoff → concluído), então mover um projeto o reposiciona sob o cursor. É consequência correta da ordenação, mas surpreende. Avaliar na execução um destaque breve no card movido; **não** desligar a ordenação por causa disso.
3. **(26) Clique do menu abrindo o projeto.** O card inteiro é clicável — sem `stopPropagation` no gatilho e no menu, todo uso do seletor navega para fora. Verificar explicitamente no roteiro manual.
4. **(27) Divergência de valores de fase entre as stacks.** `kick-off` × `kickoff`: copiar `fases.js` entre repositórios quebra em silêncio (a fase simplesmente não bate e o badge cai no fallback). Cada stack mantém o seu.
5. **(27) Seletor de fase visível para quem não pode editar.** Sem o gate `podeEditar`, o usuário vê o controle, tenta usar e recebe erro de permissão — pior que não ter o controle. O gate não é detalhe de acabamento.
6. **(25c/27a) Quem saiu da etapa perde o projeto em "Meus".** Consequência direta de `data_saida IS NULL`, aceita na aprovação. Se incomodar no uso real, a alternativa (incluir histórico) está registrada e é uma linha de código — mas muda o significado de "meus".
7. **(geral) As duas stacks driftando.** Este plano faz o piloto e o Hub receberem a mesma feature em momentos diferentes, com o piloto tendo só a maquete da feature 1. O risco de "o piloto não representa mais a produção" é real e já estava crescendo (ver [../arquitetura/gaps-publicacao-hostgator.md](../arquitetura/gaps-publicacao-hostgator.md)) — é o que a pauta de paridade no roadmap endereça.
