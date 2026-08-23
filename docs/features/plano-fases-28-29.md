# Plano de ação — Fases 28 e 29 (calendário de kick-off automático: gerador no piloto; port para o Apoio Hub)

Registro do planejamento pedido pelo responsável em **21/08/2026**. Origem: automatizar a montagem do calendário mensal da apresentação de kick-off, hoje feita à mão no Canva pelo gerente — pintar dias úteis por etapa, legenda, feriados — a partir de dados que o sistema já possui. A especificação da feature, a anatomia do modelo aprovado e a **análise das possibilidades técnicas** (pedida antes de qualquer definição) estão em [calendario-kickoff.md](calendario-kickoff.md); as decisões de arquitetura são os **ADRs 031, 032 e 033** ([../arquitetura/decisoes.md](../arquitetura/decisoes.md)) — **031 e 032 aceitos em 21/08/2026, 033 aceito no essencial**.

> **STATUS: FASE 28 EXECUTADA em 21/08/2026** (branch `execucao-fase-28`) por comando direto do responsável. **Fase 29 (port para o Hub) segue não iniciada.**
>
> 🔁 **Refinos pedidos em 22/08/2026** depois do uso da primeira versão (box da data, espaçamento padrão entre etapas, paleta ampliada a partir de dois PDFs novos): plano em [plano-fase-30.md](plano-fase-30.md), com etapas 30a→30e — **nada executado**.
>
> **A ordem de execução passa a ser 28 → 30 → 29.** A Fase 30 mexe exatamente no arquivo que é o contrato de portabilidade desta fase (`calendarioKickoffTema.js`), então enquanto ela não fechar qualquer transcrição para o Hub nasce desatualizada — está registrado como **dependência** em "Dependência da Fase 30", e o critério de aceite do port virou o passo **29d (paridade de tema e de cor)**.
>
> 🔎 **Auditoria do Hub em 23/08/2026 — a Fase 29 encolheu.** Verificado por leitura de `main` no repo do Hub + teste ao vivo do ambiente publicado (GET sem autenticação, com o piloto local como oráculo): a **fonte de feriados já existe e está no ar**, com paridade **5/5** (municipais, móveis, nacional e o não-feriado Carnaval), e os **dados de etapa/termo aditivo já viajam** em `proj_get_projeto.php`. Restam: o endpoint de **listagem** de feriados (~15 linhas), a tabela `calendario_config` e o port de frontend com o gate. Detalhes e método em [../arquitetura/gaps-publicacao-hostgator.md](../arquitetura/gaps-publicacao-hostgator.md#atualização-de-23082026--auditoria-por-código--teste-do-ambiente-publicado).
>
> ✅ **Condição 1 resolvida (21/08/2026):** o responsável escolheu a **possibilidade A — componente SVG único** (ADR-032, aceito, junto do ADR-031).
>
> ✅ **Condição 2 resolvida (21/08/2026):** o responsável deu o comando direto para executar a Fase 28.
>
> **Decisões em aberto da spec resolvidas na aprovação (21/08/2026):** bloco de entrega na legenda → **nomes compostos** dos membros (decisão 6); dias com etapas sobrepostas → **faixa dividida** (decisão 7); persistência da estilização → **tabela aditiva `CalendarioConfig`** (decisão 8); entrada na UI → **botão na sub-view Calendário** da aba Etapas (decisão 10). Fonte (Questrial no mês/ano + Inter no resto) e azul `#004AAD` seguem as recomendações registradas (decisões 3 e 4 de diretoria).
>
> **O que foi construído:** rota `GET /calendario/feriados` (nomes PT-BR de mapa transcrito, dedup por data, guarda de plausibilidade); modelo aditivo `CalendarioConfig` + `GET`/`PUT /projetos/{id}/calendario-config`; tema único `calendarioKickoffTema.js` (geometria 1440×810, paleta, fontes, logo); `calendarioKickoffUtils.js` (montagem das páginas, pintura por dia útil, termo aditivo, bloco, sobreposição em faixa dividida); componente SVG `CalendarioKickoff.jsx` (preview = exportação); `calendarioKickoffExport.js` (rasterização 2×, fontes embutidas via Google Fonts, copiar/baixar, zip store-only próprio); overlay `GeradorCalendarioKickoff.jsx` na sub-view Calendário. Logo limpo adicionado em `frontend/public/marca-apoio.svg`. Testes: `test_fase28.py` (10, backend 91 no total). Verificação de lógica de montagem via harness (Jul–Set/2026 cruzando 31/08 municipal e 07/09 nacional, termo aditivo pintado à parte). **A rasterização/fidelidade visual final (28e) precisa do teste manual no browser** — a extensão do Chrome não estava conectada nesta execução.
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
| Fonte de feriados | `_calendario` Uberlandia (ADR-025) + rota nova | ✅ **já existe e está no ar** (`proj_calendario_lib.php`, paridade 5/5 verificada em 23/08/2026) — falta só o endpoint de listagem, ver 29a |
| Tema (geometria, paleta, contraste) | `calendarioKickoffTema.js` — **valores da Fase 30**, não os da 28 | Mesmos valores, transcritos 1:1 — ver 29d |

## As fases

| Ordem | Fase | Entrega | Onde | ADR |
|---|---|---|---|---|
| 1 ✅ | **28** | Gerador do calendário de kick-off: rota de feriados, preview SVG paginado por mês, estilização por etapa, copiar/baixar | Piloto | ADR-031, 032, 033 |
| 2 | **30** *(proposta, 22/08/2026)* | Refinos do gerador: box da data, espaçamento padrão, paleta 6 → 15 cores, contraste WCAG | Piloto | ADR-034 *(proposto)* |
| 3 | **29** | Port do gerador para o Apoio Hub, com gate `podeEditar` e fonte de feriados própria | Hub (PR de teste) | ADR-031 a 033 + 034 |

A Fase 28 divide-se em entregas incrementais (28a→28e) que podem ser avaliadas separadamente; a **29 depende da 28 inteira e, desde 22/08/2026, também da [Fase 30](plano-fase-30.md)** — ver "Dependência da Fase 30" na abertura da Fase 29.

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

**Conceito:** mesmo desenho da Fase 27 — branch + **PR de teste** no repo `ApoioHub` (produção publicada; sem merge sem aval). O componente SVG atravessa quase intacto (ADR-032); o trabalho real do port está nos quatro pontos abaixo.

### Dependência da Fase 30 (registrada em 22/08/2026)

O responsável usou a primeira versão do gerador e pediu três refinos — box da data, espaçamento padrão entre etapas e paleta ampliada — documentados em [plano-fase-30.md](plano-fase-30.md). **Isso muda a ordem de execução: 28 → 30 → 29.**

O motivo é concreto, não organizacional. As três mudanças da Fase 30 caem **inteiras** dentro do arquivo que é justamente o contrato de portabilidade desta fase (`calendarioKickoffTema.js`) e do componente `Legenda`. Portar antes significaria:

1. **transcrever para o Hub valores que já se sabe que estão errados** — um chip de 118 px onde o texto ocupa 136–148 px, um espaçamento elástico que sobrepõe chips a partir de 16 entradas e uma paleta de 6 cores para serviços de até 13 etapas;
2. **pagar o mesmo trabalho duas vezes**, em duas linguagens de estilo diferentes (CSS custom properties aqui, Tailwind lá — armadilha 2 do [plano-fases-25-27.md](plano-fases-25-27.md));
3. **criar divergência entre as stacks** no intervalo entre as duas correções — e paridade visual é exatamente o critério de aceite desta fase (29d).

Se por algum motivo o responsável quiser portar antes da Fase 30, isso é possível, mas passa a ser **decisão explícita** e o PR do Hub precisa registrar que carrega os três defeitos conhecidos, com o retrabalho previsto.

### 29a — Fonte de feriados no Hub — ✅ **já existe; falta só expor a lista** *(revisado em 23/08/2026)*

> **Esta etapa era descrita como "o maior trabalho do port". Não é — auditoria de 23/08/2026 desmentiu a premissa.** O registro completo está em [../arquitetura/gaps-publicacao-hostgator.md](../arquitetura/gaps-publicacao-hostgator.md#atualização-de-23082026--auditoria-por-código--teste-do-ambiente-publicado).

**O que se descobriu.** `api/proj_calendario_lib.php` está em **`main`** (portanto publicado) e transcreve o calendário inteiro do piloto: Páscoa por Meeus/Jones/Butcher, Sexta-feira Santa e Corpus Christi, os dois municipais de Uberlândia (15/08 e 31/08), convenção inclusiva (ADR-018) e o teto `PROJ_MAX_DIAS_UTEIS = 2000`. Ou seja, a **opção (2)** que este plano listava como alternativa **já foi implementada** — e está no ar.

Testado contra o ambiente publicado, com o piloto local como oráculo, **5 de 5 casos idênticos** (municipal 31/08, Corpus Christi, Sexta-feira Santa, nacional 07/09 e o não-feriado Carnaval, que é o caso que descarta coincidência).

**O que realmente falta:** o gerador precisa **enumerar** os feriados para saber quais células pintar, e não existe endpoint de listagem. Como `proj_feriados($ano)` já devolve o array pronto, o trabalho é um `proj_get_feriados.php` de ~15 linhas, espelhando `GET /calendario/feriados?ano=YYYY` do piloto:

- mesma forma de resposta: `{"ano": ..., "feriados": [{"data": "2026-08-31", "nome": "..."}]}`;
- **dedup por data** e **guarda de plausibilidade do ano** — `proj_janela_datas()` já existe na lib;
- **feriado de fim de semana viaja na resposta**, o frontend é quem não pinta (fronteira idêntica à do ADR-031).

⚠️ **A armadilha está nos nomes, não nas datas.** O Hub tem os nomes só como **comentário** no PHP, e eles divergem do piloto — que é a fonte que vai para a legenda do slide do cliente:

| Data | Piloto (correto) | Comentário no Hub |
|---|---|---|
| 07/09 | Independência **do Brasil** | Independência |
| 12/10 | **Nossa Senhora** Aparecida | N. Sra. Aparecida |
| 15/08 | Nossa Senhora da Abadia **(padroeira de Uberlândia)** | N. Sra. da Abadia (Uberlândia) |

Escrever o endpoint reaproveitando os comentários faria o **mesmo projeto gerar slides com textos diferentes** nas duas stacks. Transcrever de `NOMES_FERIADOS_PT` do piloto, não do PHP. (O piloto também lista **Páscoa 05/04**, que o Hub não tem — inofensivo, cai no domingo e nunca é pintado, mas o endpoint deve nascer sabendo disso.)

### 29b — Dados de etapas no Hub — ✅ **já viajam** *(verificado em 23/08/2026)*

- O gerador consome `data_inicio`, dias úteis/data final e **termo aditivo** por etapa. Este plano registrava os termos aditivos como "o candidato mais provável a lacuna" — **não são**: `api/proj_get_projeto.php` em `main` já devolve `data_fim_original`, `dias_aditivos` e `termos_aditivos[]`, e as Fases 17/19/13/12 estão todas portadas (tabela completa no [gaps doc](../arquitetura/gaps-publicacao-hostgator.md#o-que-a-auditoria-de-código-fechou)).
- Continua valendo a regra: **se faltar algum dado, a lacuna vira item explícito do PR** (ou pré-PR), nunca contornada com cálculo de datas no frontend — a fronteira do ADR-008 vale nas duas stacks.
- Único item de schema a criar no Hub: a tabela equivalente a **`calendario_config`** (persistência da estilização) — DDL pronto no [gaps doc](../arquitetura/gaps-publicacao-hostgator.md).

### 29c — UI, gate e entrega

- Moldura (formulário de estilização, botões, entrada na tela do projeto) **reescrita em Tailwind** com os tokens do Hub — não copiar CSS/JSX da moldura do piloto (armadilha 2 do plano 25–27). O SVG interno vai como está, com as cores via props.
- **Gate `podeEditar`** (`isAdminGlobal(user) || pertenceAArea(user, 7)`): o gerador é ação de gerente — mesmo padrão do seletor de fase (27b). Sem o gate, o controle aparece para quem não pode usá-lo.
  - ⚠️ **O PR da Fase 27 ainda não foi mergeado** (branch `feat/fase-27-meus-projetos-seletor-fase`, 4 arquivos, verificado em 23/08/2026): o "padrão de referência" existe em código, mas **não está em `main`**. Se a 29 for executada antes do merge, ou ela mergeia a 27 primeiro, ou reimplementa o gate — não herda de algo publicado.
- Persistência da estilização: tabela MySQL equivalente a `calendario_config` (`projeto_id` FK única + `cores` JSON/TEXT) + endpoints PHP com `proj_exigir_editor()`. **O validador de hex do Hub tem de aceitar exatamente o mesmo formato do piloto** (`#RGB`/`#RRGGBB`, em `schemas.CalendarioConfigAtualizar`) — um validador mais estreito lá rejeitaria silenciosamente cores válidas gravadas aqui.
- **Painel de amostras com as 15 cores da Fase 30**, não com um color picker livre: a restrição à paleta é o que mantém o material dentro da identidade, e vale nas duas stacks.
- **PR de teste** descrevendo a feature, apontando para este plano e com roteiro manual: gerar num projeto real com feriado municipal no intervalo, comparar com o piloto para o mesmo conjunto de etapas (paridade), copiar/baixar/colar no Canva, testar com usuário sem `podeEditar` (não vê o gerador).

### 29d — Paridade de tema e de cor (critério de aceite do port)

O que atravessa a fronteira das duas stacks é o **tema**, não o CSS: `calendarioKickoffTema.js` foi escrito sem custom properties justamente para isso (ADR-032). Este passo é a checagem de que ele chegou inteiro do outro lado — **com os valores pós-Fase 30**, não os da 28.

**Contrato portável — transcrever 1:1, nunca "adaptar ao gosto do Hub":**

| Item | O que tem de bater |
|---|---|
| Geometria da página | base 1440×810, tabela 1299, cabeçalho 56,8, 6 linhas de semana |
| `notasFracao` | valor aprovado na Fase 30 (0,34 na recomendação; 0,32 na variante) — define também a largura da coluna de dia, que é derivada |
| Chip da legenda | `chipLargura`, `chipAltura`, raio e `espacamentoEntradas` conforme a Fase 30 |
| Paleta de etapas | as **15 cores na mesma ordem de ciclo** — ver [plano-fase-30.md §5.3](plano-fase-30.md) |
| Cores reservadas | `#004AAD` cabeçalho, `#FFBD59` feriado, `#E8918C` termo aditivo, `#2B2B2B` texto, `#FAFAFA` fundo NOTAS |
| Cor do texto no chip | razão de contraste **WCAG** (maior entre preto e branco), não luminância com corte — senão o Hub erra nas mesmas 6 cores que a Fase 30 corrigiu |
| Fontes | Questrial no mês/ano, Inter no resto (Klein Text é comercial — vale nas duas stacks) |
| **Nomes dos feriados** | transcritos de `NOMES_FERIADOS_PT` do piloto, **não** dos comentários do PHP do Hub — divergem hoje (ver 29a) e esse texto vai para a legenda do slide |

> ⚠️ **A ordem da paleta é parte do contrato, não estética.** A cor sai de `PALETA_ETAPAS[indice % length]`: uma ordem diferente no Hub faz **o mesmo projeto sair com cores diferentes** nas duas stacks. Reordenar de um lado só é bug de paridade.

**Roteiro de verificação:** pegar **um mesmo projeto real** com etapas idênticas nas duas stacks e gerar o mesmo mês dos dois lados —

1. as células pintadas têm de ser **exatamente as mesmas** (é o que valida 29a e 29b juntos: feriados e datas);
2. as cores atribuídas por etapa têm de ser **as mesmas** (valida a paleta e a ordem);
3. a legenda tem de ter **as mesmas entradas, na mesma ordem**, com o texto do chip **dentro** da caixa colorida nos dois lados;
4. as **entradas de feriado** têm de trazer o mesmo texto nos dois lados ("Feriado - Independência do Brasil", não "Feriado - Independência") — é o erro mais provável do endpoint novo da 29a;
5. exportar o PNG dos dois e comparar lado a lado — divergência visual aqui é bug de transcrição do tema, não "diferença de navegador".

**Cuidado com projeto que já tem cor gravada:** se a Fase 30 adotar o congelamento de cores (decisão §11.5 do plano 30), um projeto antigo carrega cores salvas e o teste de paridade tem de comparar **contra o que está gravado**, não contra o default da paleta — senão a divergência aparente é do congelamento, não do port.

---

## Fora de escopo (registrado)

- **Exportação PPTX / integração com API do Canva** — possibilidade E da spec; evolução futura sobre a mesma base, não desta entrega.
- **Recesso/férias da UFU no calendário** — segue no [roadmap](roadmap.md) (levantamento com a diretoria); quando entrar no `_calendario` (padrão ADR-025), o gerador herda sem mudança.
- **Editar etapas de dentro do gerador** — o gerador **lê** o projeto; mudar datas/dias/nomes continua nos lugares existentes (editor, modal, cronograma). Um atalho de navegação é aceitável; edição embutida, não.
- **Renderização no servidor** — rejeitada no ADR-031, não é fallback silencioso: se algum dia parecer necessária, é revisão de ADR.
- **Multi-município / template de calendário configurável** — o modelo é o da Apoio (Uberlândia, template do kick-off); generalização sem pedido é custo sem cliente.

## Riscos registrados

1. **Fidelidade tipográfica — confirmado em 21/08/2026, não é mais hipótese.** O template usa **duas** fontes: `Questrial` (Google Fonts, OFL — embutir é livre) no mês/ano, e **`Klein Text` (comercial)** no cabeçalho dos dias, nos números e na legenda. Embutir o Klein Text numa aplicação web **extrapola a licença do Canva**. Consequência real: esses elementos **não sairão idênticos** ao template, salvo se a empresa licenciar a fonte. Mitigação adotada: `Inter` (já no app, OFL) no lugar do Klein Text, mantendo `Questrial` no elemento mais visível; a diferença cai em textos de 14–20 pt. **É decisão consciente da diretoria, registrada — não um acidente de execução.**
2. ~~**Anos com poucos ou nenhum feriado transcrito no Hub (29a).**~~ **Risco eliminado — a premissa era falsa** (auditoria de 23/08/2026). O Hub **calcula** os feriados por ano, como o piloto (`proj_feriados($ano)` deriva os móveis da Páscoa e monta os fixos), então **não há seed anual** e não existe "ano não seedado".
   **O risco real que sobra é outro:** os **nomes** dos feriados divergem entre as stacks (só existem como comentário no PHP do Hub) — e é esse texto que aparece na legenda do slide do cliente. Mitigação: transcrever de `NOMES_FERIADOS_PT` do piloto ao escrever o endpoint (29a) e conferir no roteiro da 29d.
3. **Casos que o modelo do Canva não previu** (blocos, sobreposição, projeto de 10+ meses). As regras de pintura estão especificadas com decisões em aberto na spec — **resolver na aprovação, não improvisar na execução**.
4. **Clipboard indisponível** (HTTP sem TLS, navegador antigo, aba fora de foco): o Copiar falha por plataforma, não por bug. Mitigação: toast explicando + o Baixar como caminho sempre disponível.
5. ~~**Drift entre preview e exportação se a possibilidade A for trocada.**~~ **Resolvido em 21/08/2026** — a possibilidade A foi escolhida e o plano assume "o preview é a exportação" (mesmo SVG). Trocar de possibilidade agora exige revisar os ADRs 031/032 **e** as etapas 28b/28d.
6. **Escopo de estilização crescendo** ("e se der para mudar a fonte? e o layout?"). A v1 é cor por etapa — o resto está explicitamente fora ou em decisão em aberto. Segurar na aprovação, não na execução.
7. **Divergência de paleta entre as stacks (novo, 22/08/2026).** A cor default de cada etapa é posicional (`PALETA_ETAPAS[indice % length]`). Qualquer diferença de **conteúdo ou de ordem** da paleta entre piloto e Hub faz o mesmo projeto sair com cores diferentes nos dois lados — e ninguém percebe até alguém comparar dois slides. Duas frentes de mitigação: a Fase 30 acontecer **antes** do port (para haver uma única paleta a transcrever) e o teste de paridade da 29d comparar cor a cor, não só "está bonito".
8. **Fase 30 mexe no mesmo arquivo que é o contrato do port.** `calendarioKickoffTema.js` e o componente `Legenda` são simultaneamente o alvo dos refinos e a peça que atravessa para o Hub. Enquanto a Fase 30 não fechar, **qualquer transcrição feita para o Hub nasce desatualizada** — motivo pelo qual a ordem 28 → 30 → 29 está registrada como dependência, e não como preferência.
