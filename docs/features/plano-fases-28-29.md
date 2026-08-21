# Plano de ação — Fases 28 e 29 (calendário de kick-off automático: gerador no piloto; port para o Apoio Hub)

Registro do planejamento pedido pelo responsável em **21/08/2026**. Origem: automatizar a montagem do calendário mensal da apresentação de kick-off, hoje feita à mão no Canva pelo gerente — pintar dias úteis por etapa, legenda, feriados — a partir de dados que o sistema já possui. A especificação da feature, a anatomia do modelo aprovado e a **análise das possibilidades técnicas** (pedida antes de qualquer definição) estão em [calendario-kickoff.md](calendario-kickoff.md); as decisões de arquitetura são os **ADRs 031, 032 e 033** ([../arquitetura/decisoes.md](../arquitetura/decisoes.md)) — **031 e 032 aceitos em 21/08/2026, 033 aceito no essencial**.

> **STATUS: PLANEJADO — NADA EXECUTADO.**
>
> ✅ **Condição 1 resolvida (21/08/2026):** o responsável escolheu a **possibilidade A — componente SVG único** (ADR-032, agora aceito, junto do ADR-031). O plano abaixo já era escrito sobre essa escolha e vale como está.
>
> ⏳ **Condição 2 pendente:** o **comando direto do responsável** para começar (regra permanente do projeto).
>
> ✅ **Insumos entregues (21/08/2026).** O responsável enviou o **logo vetorizado** e **dois PDFs reais** do kick-off da Midiática. Geometria (1440×810, colunas de 131, NOTAS a 29,3%), tipografia (Questrial 80pt no mês/ano; Klein Text no resto) e paleta (`#004AAD`, `#C9E597`, `#2A965C`, `#E2A9F1`, `#8C52FF`, `#B4B4B4`, `#FCFFB8`, `#FFBD59`) estão **transcritas de fonte oficial** em [calendario-kickoff.md → Valores extraídos](calendario-kickoff.md#valores-extraídos-do-template-transcritos-em-21082026). A implementação **não começa mais com placeholders** — começa com os números reais.
>
> ⚠️ **Duas pendências de decisão surgidas do levantamento**, ambas registradas nas decisões em aberto da spec: (1) **Klein Text é fonte comercial** e não pode ser embutida — recomendação é substituir por `Inter` mantendo `Questrial` no mês/ano; (2) o **azul do template (`#004AAD`) não é o azul da marca (`#03345F`)** — recomendação é manter o do template. Nenhuma das duas impede começar: ambas são valores no arquivo de tema.

## Enquadramento nas duas stacks (ADR-028)

Diferente da alternância "Meus projetos" (Fase 25), esta feature **não depende de identidade** — é dado + exibição. Pelo próprio ADR-028, ela **nasce completa e funcional no piloto** (como a Fase 26), e o port para o Hub vem depois, com o gate de permissão que só existe lá:

| | **Piloto** (`empresa-projetos`) | **Stack principal** (`ApoioHub`) |
|---|---|---|
| Nesta entrega | **Fase 28** — gerador completo e funcional | **Fase 29** — port via PR de teste |
| Quem acessa o gerador | Todos (sem auth, como tudo no piloto) | Gate **`podeEditar`** (padrão ADR-030) |
| Fonte de feriados | `_calendario` Uberlandia (ADR-025) + rota nova | **Não existe** — ver 29a, é o maior trabalho do port |

## As duas fases

| Fase | Entrega | Onde | ADR |
|---|---|---|---|
| 28 | Gerador do calendário de kick-off: rota de feriados, preview SVG paginado por mês, estilização por etapa, copiar/baixar | Piloto | ADR-031, 032, 033 |
| 29 | Port do gerador para o Apoio Hub, com gate `podeEditar` e fonte de feriados própria | Hub (PR de teste) | ADR-031 a 033 |

A Fase 28 divide-se em entregas incrementais (28a→28e) que podem ser avaliadas separadamente; a 29 depende da 28 inteira.

---

## Fase 28 — Gerador no piloto (ADRs 031–033)

### 28a — Rota `GET /calendario/feriados` (backend, única adição de servidor)

- Em `backend/app/routes/calendario.py`: `GET /calendario/feriados?ano=YYYY` → `{"ano": ..., "feriados": [{"data": "2026-08-31", "nome": "Aniversário de Uberlândia"}, ...]}`, a partir de `_calendario.holidays(ano)` (o calendário `Uberlandia` do ADR-025 é a fonte única — nada de segunda lista).
- **Três tratamentos obrigatórios sobre a saída crua** (verificados em 21/08/2026 contra `holidays(2026)`; evidência na [spec](calendario-kickoff.md#três-tratamentos-obrigatórios-sobre-a-saída-crua-do-workalendar)):
  1. **Deduplicar por data** — `21/04/2026` volta duas vezes ("Aniversário de Minas Gerais" + "Tiradentes' Day"), o que pintaria e legendaria o mesmo dia em dobro;
  2. **Nomes em PT-BR, de um mapa transcrito** (padrão ADR-005) — o workalendar devolve os nacionais em inglês (`Independence Day`, `Christmas Day`…) e o rótulo cru iria direto para o slide do cliente. O mapa é fonte única; a Fase 29 tem de bater com ele;
  3. **Feriado em fim de semana não é pintado** — a rota devolve todos (é dado), o frontend só pinta/legenda os que caem em dia de semana (é exibição). O template confirma: 31/08 (seg) laranja, 15/08 (sáb) branco.
- **Guarda de plausibilidade:** `ano` restrito à janela da Fase 10 (`janela_datas_plausiveis()`) → 422 em português fora dela. Espírito do hardening de 12/07/2026: rota de leitura barata, mas sem parâmetro aberto.
- **Fronteira ADR-008 (registrada no ADR-031):** o frontend usa a lista só para decidir **quais células pintar**; datas de início/fim continuam vindo do backend. Nenhuma math de dias úteis é replicada.
- Testes: feriados nacionais + os quatro municipais no ano corrente; ano fora da janela → 422; formato da resposta; **sem datas repetidas**; **nenhum nome em inglês** (regressão do mapa PT-BR). (`test_fase28.py`)

### 28b — Montagem dos meses + componente `CalendarioKickoff` (preview)

- **Novo `calendarioKickoffUtils.js`:** dado o array de `EtapaResposta` + feriados do(s) ano(s), produz as **páginas** — uma por mês entre o primeiro `data_inicio` e a última `data_fim` efetiva do projeto — com, por página: células do mês (número, dia da semana), segmentos pintados (etapa × células de dias úteis dentro do intervalo `data_inicio→data_fim`), entradas de legenda (etapa + intervalo completo, repetida em cada mês tocado, como no modelo), feriados do mês (célula + legenda "Feriado - {nome}").
  - **Termo aditivo:** células entre `data_fim_original` e `data_fim` pintam na cor fixa de termo, legenda **"Termo aditivo"** com o intervalo — sem repetir o nome da etapa (decisão do responsável no pedido). Dados já viajam em `EtapaResposta` (`data_fim_original`, `dias_aditivos` — ADR-019).
  - **Bloco de entrega** (ADR-009): intervalo compartilhado pinta **uma vez**, **uma** entrada de legenda (rótulo conforme decisão em aberto da spec — resolver na aprovação).
  - **Sobreposição de etapas** (possível desde as Fases 12/13): célula com faixa dividida ou prioridade+aviso — decisão em aberto da spec; implementar a escolhida.
  - Reusar `datasUtils.js` (grade UTC/ISO já existe — `gradeCalendario`); **não** duplicar aritmética de grade.
- **Novo `CalendarioKickoff.jsx`:** componente **SVG** de uma página (ADR-032) — cabeçalho (mês à esquerda, ano ao centro, logo à direita), grade de 8 colunas (DOM…SAB + NOTAS), células pintadas, legenda. **Dimensão base 1440×810** e todas as medidas conforme os [valores extraídos](calendario-kickoff.md#valores-extraídos-do-template-transcritos-em-21082026); **cores/fonte via props** — sem custom properties dentro do SVG (é o que faz o componente portar para o Hub, ADR-032).
  - **Colunas e linhas uniformes**, corrigindo as imperfeições manuais do template (QUI/SEX com larguras trocadas, rodapé com alturas diferentes) — achado 2 dos valores extraídos. Não reproduzir o desalinhamento.
  - **Fundo claro sempre** — artefato de apresentação, independe do tema escuro do app.
  - **Fonte embutida** via `@font-face` data-URI (woff2 base64) dentro do SVG; helper próprio de quebra de linha para os textos da coluna NOTAS. **Questrial** (OFL, do Google Fonts) entra embutida sem impedimento; **Klein Text não pode ser embutida** (comercial) ⇒ usar `Inter`, já presente no app, salvo decisão contrária da diretoria.
  - **Assets parametrizados num único arquivo de tema** (ex.: `calendarioKickoffTema.js`): paleta de etapas, azul do cabeçalho, laranja de feriado, cor de termo aditivo, família tipográfica e caminho do logo. É o que permite **começar com placeholders** e trocar pelos valores oficiais numa edição só — sem caçar literais espalhados pelo SVG. O logo entra em `frontend/public/` (SVG inline ou PNG transparente em data-URI na exportação).
- **Preview no gerador:** páginas renderizadas uma abaixo da outra (scroll) ou paginadas — decidir na execução pelo mais legível com 4–6 meses.

### 28c — O gerador na UI + estilização

- **Entrada:** botão "Gerar calendário de kick-off" na sub-view **Calendário** da aba Etapas (`EtapasProjeto.jsx`, pill `calendario`) — interpretação registrada na spec, **confirmar com o responsável na aprovação**. O gerador abre como tela/overlay dentro do projeto com o painel de estilização ao lado do preview (a "aba formulário" do pedido).
- **Estilização (v1 deliberadamente enxuta):** cor por etapa (paleta default do template + override via seletor de cores da paleta — não um color picker livre, para o material continuar dentro da identidade), cor de termo aditivo e feriado **fixas**. Mais controles (ocultar/renomear legenda, intervalo de meses) só se o uso pedir — registrado na spec, fora da v1.
- **Persistência da estilização** — conforme decisão em aberto da spec; se aprovada a recomendação (tabela aditiva): modelo `CalendarioConfig` (`projeto_id` FK única, `cores` JSON) em `banco_de_dados.py` — **puramente aditiva, `create_all` materializa sem fluxo destrutivo ADR-001** (mesmo caso das Fases 13/17/19) — com `GET`/`PUT /projetos/{id}/calendario-config` e testes correspondentes.
- Sem identidade envolvida: no piloto qualquer pessoa usa o gerador (como toda escrita hoje); a restrição a gerentes é assunto do Hub (29c).

### 28d — Exportação: copiar e baixar (ADR-033)

- **Exportar página:** serializar o SVG da página (mesmo componente do preview), rasterizar em `<canvas>` **2×** (1440×810 → **2880×1620**) → `toBlob('image/png')`.
- **Copiar (por mês):** botão em cada página — `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`; toast de sucesso/erro (padrão `useToast`). A limitação de 1 imagem por cópia fica visível na UI (dica curta), não escondida.
- **Baixar:** por mês (`calendario-{projeto}-{ano}-{mes}.png`) e **"Baixar todos (.zip)"** — escritor zip **store-only próprio** (~80 linhas: local file headers + central directory + CRC32; PNG já é comprimido); fallback registrado no ADR-033: `client-zip` se o próprio custar mais que o ganho (decisão de execução, como o fallback do ADR-030).
- **Roteiro Canva documentado na UI** (dica no gerador): para vários meses, baixar o zip e arrastar os PNGs de uma vez no painel de uploads do Canva — é a resposta real ao "copiar mês a mês" levantado no pedido.

### 28e — Verificação

- `pytest` (rota de feriados + config se aprovada); `npm run lint` / `npm run build`.
- **Manual, no browser (piloto):** projeto real de 4+ meses cruzando feriado nacional e municipal (ex.: 07/09 e 31/08) → conferir célula a célula contra o cálculo do backend (a data final exibida no Kanban/tabela é o oráculo); termo aditivo aplicado → dias extras pintados como "Termo aditivo"; bloco de entrega → uma entrada de legenda; copiar e colar no Canva; baixar zip e conferir os PNGs (nitidez no slide, fonte correta); estilizar cores e re-gerar após mudar uma etapa (persistência, se aprovada).
- **Comparação lado a lado com as imagens de referência** do modelo (Junho–Setembro/2026) — é o critério de aceite visual: o gerado deve ser reconhecível como "o calendário da Apoio".

---

## Fase 29 — Port para o Apoio Hub (PR de teste)

**Conceito:** mesmo desenho da Fase 27 — branch + **PR de teste** no repo `ApoioHub` (produção publicada; sem merge sem aval). O componente SVG atravessa quase intacto (ADR-032); o trabalho real do port está nos três pontos abaixo.

### 29a — Fonte de feriados no Hub (o maior trabalho do port)

- O Hub é PHP + MySQL — **não tem workalendar**. Opções a decidir na execução: (1) tabela `proj_feriados` (ano, data, nome) **seedada por transcrição** do mesmo Decreto Municipal + feriados nacionais (padrão ADR-005/025 — fonte oficial, auditável), servida por um `proj_get_feriados.php`; (2) função PHP calculando móveis (Páscoa → Sexta-feira Santa, Corpus Christi) + fixos. A opção 1 é mais simples e mais auditável; exige seed anual (registrar como rotina).
- **Verificação de paridade obrigatória:** os feriados servidos pelo Hub devem bater 1:1 com os do piloto para o mesmo ano — qualquer divergência é bug de transcrição.

### 29b — Dados de etapas no Hub

- **Checar contra [../arquitetura/gaps-publicacao-hostgator.md](../arquitetura/gaps-publicacao-hostgator.md) antes de começar:** o gerador consome `data_inicio`, dias úteis/data final e **termo aditivo** por etapa. O módulo de projetos do Hub é um port fino do piloto — confirmar o que já viaja nas respostas de `proj_get_*` e o que falta (termos aditivos são o candidato mais provável a lacuna). **Se faltar dado, a lacuna vira item explícito do PR** (ou pré-PR), nunca contornada com cálculo de datas no frontend — a fronteira do ADR-008 vale nas duas stacks.

### 29c — UI, gate e entrega

- Moldura (formulário de estilização, botões, entrada na tela do projeto) **reescrita em Tailwind** com os tokens do Hub — não copiar CSS/JSX da moldura do piloto (armadilha 2 do plano 25–27). O SVG interno vai como está, com as cores via props.
- **Gate `podeEditar`** (`isAdminGlobal(user) || pertenceAArea(user, 7)`): o gerador é ação de gerente — mesmo padrão do seletor de fase (27b). Sem o gate, o controle aparece para quem não pode usá-lo.
- Persistência da estilização (se aprovada em 28c): tabela MySQL equivalente + endpoints PHP com `proj_exigir_editor()`.
- **PR de teste** descrevendo a feature, apontando para este plano e com roteiro manual: gerar num projeto real com feriado municipal no intervalo, comparar com o piloto para o mesmo conjunto de etapas (paridade), copiar/baixar/colar no Canva, testar com usuário sem `podeEditar` (não vê o gerador).

---

## Fora de escopo (registrado)

- **Exportação PPTX / integração com API do Canva** — possibilidade E da spec; evolução futura sobre a mesma base, não desta entrega.
- **Recesso/férias da UFU no calendário** — segue no [roadmap](roadmap.md) (levantamento com a diretoria); quando entrar no `_calendario` (padrão ADR-025), o gerador herda sem mudança.
- **Editar etapas de dentro do gerador** — o gerador **lê** o projeto; mudar datas/dias/nomes continua nos lugares existentes (editor, modal, cronograma). Um atalho de navegação é aceitável; edição embutida, não.
- **Renderização no servidor** — rejeitada no ADR-031, não é fallback silencioso: se algum dia parecer necessária, é revisão de ADR.
- **Multi-município / template de calendário configurável** — o modelo é o da Apoio (Uberlândia, template do kick-off); generalização sem pedido é custo sem cliente.

## Riscos registrados

1. **Fidelidade tipográfica — confirmado em 21/08/2026, não é mais hipótese.** O template usa **duas** fontes: `Questrial` (Google Fonts, OFL — embutir é livre) no mês/ano, e **`Klein Text` (comercial)** no cabeçalho dos dias, nos números e na legenda. Embutir o Klein Text numa aplicação web **extrapola a licença do Canva**. Consequência real: esses elementos **não sairão idênticos** ao template, salvo se a empresa licenciar a fonte. Mitigação adotada: `Inter` (já no app, OFL) no lugar do Klein Text, mantendo `Questrial` no elemento mais visível; a diferença cai em textos de 14–20 pt. **É decisão consciente da diretoria, registrada — não um acidente de execução.**
2. **Anos com poucos ou nenhum feriado transcrito no Hub (29a).** O piloto calcula; o Hub dependerá de seed anual por transcrição. Um ano não seedado silencia os feriados — o calendário sai errado sem avisar. Mitigação: paridade 1:1 verificada no PR + rotina anual registrada.
3. **Casos que o modelo do Canva não previu** (blocos, sobreposição, projeto de 10+ meses). As regras de pintura estão especificadas com decisões em aberto na spec — **resolver na aprovação, não improvisar na execução**.
4. **Clipboard indisponível** (HTTP sem TLS, navegador antigo, aba fora de foco): o Copiar falha por plataforma, não por bug. Mitigação: toast explicando + o Baixar como caminho sempre disponível.
5. ~~**Drift entre preview e exportação se a possibilidade A for trocada.**~~ **Resolvido em 21/08/2026** — a possibilidade A foi escolhida e o plano assume "o preview é a exportação" (mesmo SVG). Trocar de possibilidade agora exige revisar os ADRs 031/032 **e** as etapas 28b/28d.
6. **Escopo de estilização crescendo** ("e se der para mudar a fonte? e o layout?"). A v1 é cor por etapa — o resto está explicitamente fora ou em decisão em aberto. Segurar na aprovação, não na execução.
