# Calendário de kick-off — geração automática

Especificação base da feature pedida pelo responsável em **21/08/2026**: automatizar a criação do calendário mensal usado na apresentação de kick-off ao cliente, hoje montado **à mão no Canva**, mês a mês, pelo gerente do projeto. A referência visual é o modelo real usado nas apresentações (quatro imagens de exemplo — Junho a Setembro/2026 — fornecidas pelo responsável na abertura desta especificação).

> **STATUS: FASE 28 EXECUTADA (21/08/2026).** O gerador (possibilidade A, componente SVG único) foi construído no piloto por comando direto do responsável — ver o resumo do que foi entregue em [plano-fases-28-29.md](plano-fases-28-29.md). Este documento segue como fonte da anatomia do modelo, dos valores transcritos e das decisões resolvidas. A **Fase 29 (port para o Hub)** continua não iniciada.
>
> **DECISÃO DE 21/08/2026 — a escolha do responsável é a possibilidade A (componente SVG único).** Os ADRs 031 e 032 estão **aceitos e implementados**; a análise das possibilidades abaixo fica preservada como registro do que foi comparado e por quê. As decisões em aberto de produto (bloco, sobreposição, persistência, UX) foram resolvidas na aprovação — ver "Decisões em aberto".

## O problema hoje

A cada kick-off, o gerente monta no Canva um calendário por mês do projeto: pinta célula por célula os dias úteis de cada etapa, escreve a legenda com os intervalos, marca feriados. É trabalho manual, repetitivo e sujeito a erro exatamente no material que **vai para a frente do cliente** — e o sistema **já sabe tudo** o que o calendário mostra: nomes das etapas, `data_inicio`, dias úteis esperados, data final derivada (ADR-008/016/018), dias aditivos de termo (ADR-019) e feriados nacionais + municipais de Uberlândia (ADR-025).

## Anatomia do modelo aprovado (transcrita das imagens de referência)

Uma imagem por mês, paisagem (proporção ≈ 16:9, compatível com o slide do Canva), composta por:

| Elemento | Descrição no modelo |
|---|---|
| **Cabeçalho** | Nome do mês em caixa alta espaçada no canto superior **esquerdo**; ano em destaque ao **centro**; logo **Apoio Consultoria** no canto superior **direito** |
| **Grade** | 8 colunas: `DOM SEG TER QUA QUI SEX SAB` + coluna **NOTAS** (mais larga — medida depois em **29,3%** da tabela) à direita; linha de cabeçalho em **azul institucional** com rótulos brancos em caixa alta espaçada |
| **Células de dia** | Fundo branco, número do dia em itálico alinhado à direita; semanas em linhas; células vazias antes/depois do mês ficam em branco |
| **Pintura das etapas** | Cada etapa pinta **apenas os seus dias úteis** com a sua cor — fins de semana ficam brancos mesmo no meio de uma etapa; a etapa seguinte começa na célula do dia útil seguinte |
| **Feriados** | Pintados em **laranja**, com entrada própria na legenda ("Feriado - Independência do Brasil") — não contam como dia útil de nenhuma etapa |
| **Legenda (NOTAS)** | Um bloco por etapa visível no mês: chip retangular na cor da etapa com o intervalo ("18/06 - 24/06") + nome da etapa em negrito ao lado; feriados idem |
| **Etapas multi-mês** | Aparecem na legenda de **todos** os meses que tocam, sempre com o intervalo completo (ex.: "24/07 - 13/08 Análise dos Intangíveis" listada em Julho e em Agosto) |
| **Paleta observada** | Verde-claro, verde-escuro, lilás, roxo, cinza e amarelo-claro para etapas; laranja reservado a feriados |

**Cores e fonte exatas são levantamento, não inferência** (princípio do ADR-005). **Feito em 21/08/2026**: os PDFs reais do template foram fornecidos e todos os valores — geometria, tipografia e paleta — estão transcritos em [Valores extraídos do template](#valores-extraídos-do-template-transcritos-em-21082026). A tabela acima descreve o modelo como ele se apresenta; os números medidos prevalecem sobre qualquer estimativa desta seção.

## Dados de origem — o que já existe e o que falta

O calendário é uma **projeção visual de dados que o modelo já entrega**. Mapa completo:

| Elemento do calendário | Fonte | Situação |
|---|---|---|
| Nome de cada etapa | `Etapa.nome` (`EtapaResposta`) | ✅ existe |
| Intervalo pintado da etapa | `data_inicio` → `data_fim` **derivada** (ADR-008/016/018, convenção inclusiva) | ✅ existe, viaja na resposta |
| Dias úteis vs. não úteis | Fonte única `app/utils/calendario.py` (calendário `Uberlandia`, ADR-025) | ⚠️ o backend sabe; o frontend **não tem como saber quais dias pintar** — hoje nenhuma rota lista os feriados de um período |
| Termo aditivo | `data_fim_original` → `data_fim` efetiva; `dias_aditivos`, `termos_aditivos[]` (ADR-019) | ✅ existe — os dias além do original entram no calendário **rotulados só como "Termo aditivo"** (decisão do responsável no pedido) |
| Mês/ano de cada página | Derivado do intervalo total do projeto (primeiro `data_inicio` → última `data_fim`) | ✅ derivável no frontend |
| Logo Apoio Consultoria | Asset em `frontend/public/` (como o `mono-light.png` da Fase 14) | ✅ SVG recebido em 21/08/2026 e já limpo (ver ressalvas) |
| Fonte tipográfica do modelo | Template do Canva | ✅ **Questrial** (livre) + **Klein Text** (comercial — exige substituição) |
| Recesso/férias da UFU | — | ❌ segue no [roadmap](roadmap.md); quando entrar no `_calendario` (padrão ADR-025), o gerador herda automaticamente |

**A única adição de backend necessária é uma rota de leitura de feriados** — proposta: `GET /calendario/feriados?ano=2026` devolvendo `[{data, nome}]` a partir de `_calendario.holidays(ano)`, com o ano validado contra a janela de plausibilidade da Fase 10 (guarda anti-abuso, espírito do hardening de 12/07/2026). Isso **não fere o ADR-008**: as datas de início/fim continuam vindo exclusivamente do backend; o frontend só decide **quais células pintar** (dia de semana + não-feriado), que é lógica de exibição — a math de dias úteis não é replicada.

### Três tratamentos obrigatórios sobre a saída crua do workalendar

Verificado contra `_calendario.holidays(2026)` em 21/08/2026, na revisão do plano. A lista crua tem 14 entradas e **cada um dos problemas abaixo produziria um defeito visível no material do cliente**:

1. **Datas duplicadas.** `21/04/2026` aparece **duas vezes** — "Aniversário de Minas Gerais" e "Tiradentes' Day" (o feriado estadual coincide com o nacional). Pintar e legendar o mesmo dia duas vezes é defeito garantido. ⇒ **a rota deduplica por data**, unindo os nomes ou elegendo um.
2. **Nomes em inglês.** O workalendar devolve os feriados nacionais em inglês: `New year`, `Labour Day`, **`Independence Day`**, `Our Lady of Aparecida`, `All Souls' Day`, `Republic Day`, `Christmas Day`, `Tiradentes' Day`. Só os que a Fase 23 acrescentou estão em português. Repassar o rótulo cru colocaria **"Feriado - Independence Day"** no slide do cliente — enquanto o template real diz *"Feriado - Independência do Brasil"*. ⇒ **a rota devolve nomes em PT-BR**, de um mapa transcrito (padrão ADR-005), nunca o rótulo da biblioteca. O mapa é fonte única e o port para o Hub (Fase 29) tem de bater com ele.
3. **Feriados em fim de semana não se pintam.** Em 2026, três caem fora da semana útil: `05/04` (dom), `15/08` (**sáb** — Nossa Senhora da Abadia) e `15/11` (dom). O template confirma a regra: na página de Agosto, **31/08 (segunda) está laranja com legenda, e 15/08 (sábado) está branco**. Pintar um sábado de laranja e somar uma linha de legenda seria ruído sobre um dia que não afeta prazo nenhum. ⇒ **a rota devolve todos** (é dado); **o frontend só pinta e legenda os que caem em dia de semana** (é exibição) — divisão coerente com a fronteira do ADR-031.

Nenhum dos 14 feriados de 2026 é "falso" (todos têm `is_working_day == False`), então não há risco de pintar dia útil por engano.

## Insumos a fornecer pelo responsável

> ✅ **ENTREGUES em 21/08/2026.** O responsável enviou o logo vetorizado e **dois PDFs reais** do kick-off da Midiática (1 e 3 páginas). Os valores foram extraídos dos arquivos e estão transcritos em [Valores extraídos do template](#valores-extraídos-do-template-transcritos-em-21082026) — nenhum número abaixo é estimado. Esta seção fica como registro do que foi pedido e por quê.

Levantamento pedido em 21/08/2026, quando a possibilidade A foi escolhida. São os itens que **não estão no código nem nos dados** — vivem no template do Canva e na identidade visual da empresa. Princípio ADR-005: **transcrever de fonte oficial, nunca inferir de memória**.

**Nenhum destes itens bloqueia o início da implementação.** O componente SVG é escrito com os valores **parametrizados** (cores, fonte e logo entram por props/constantes num único arquivo de tema), começando com uma paleta amostrada das imagens de referência, as fontes que o app já usa e um placeholder de logo. A troca pelos valores reais é uma edição de um arquivo. O que os insumos bloqueiam é o **aceite visual final** (28e) — o momento em que o calendário gerado precisa ser indistinguível do modelo do Canva.

### 1. Logo da Apoio Consultoria *(o único item que o projeto realmente não tem)*

- **O que é:** o arquivo da marca — **símbolo + a palavra "APOIO CONSULTORIA"**, na versão **azul-marinho** (a que aparece no canto superior direito do modelo), com **fundo transparente**.
- **Por que o que existe não serve:** `frontend/public/mono-light.png` (Fase 14) é **só o símbolo "A"**, em branco-acinzentado, feito para marca d'água sobre fundo escuro — sobre o fundo branco do calendário ficaria invisível, e sem o texto da marca.
- **Formatos, em ordem de preferência:**
  1. **`.svg`** — ideal: é vetor, entra dentro do SVG do calendário e fica nítido em qualquer escala de exportação;
  2. **`.png` com fundo transparente**, largura **≥ 600 px** — funciona bem (o logo ocupa ~180 px no calendário; 600 px cobre a exportação em 3×);
  3. `.pdf`, `.ai` ou `.eps` do kit de identidade — dá para extrair o vetor daqui.
- **Onde costuma estar:** o kit de identidade da área (mesma OneDrive do pacote de handoff da Fase 14) ou com quem cuida do design/marketing. No Canva, dá para isolar o logo num design em branco e baixar como PNG com fundo transparente (recurso Pro).

### 2. Cores exatas (hex)

- **O que é:** os valores hexadecimais usados no template — **azul do cabeçalho** da grade, o **laranja de feriado**, e as **cores das etapas** (no modelo aparecem verde-claro, verde-escuro, lilás, roxo, cinza e amarelo-claro). Se houver cinza de linha de grade, também.
- **Como obter no Canva:** clicar na célula/elemento colorido → o quadradinho de cor na barra superior abre o seletor, que mostra o hex.
- **Alternativa aceitável:** amostro as cores das quatro imagens de referência que você já enviou. Fica muito próximo, mas compressão de imagem pode deslocar um ou dois tons — o hex do Canva é o valor certo.

### 3. Fonte tipográfica

- **O que é:** o **nome** da fonte do template (a do "J u n h o" / "2026" no topo e a dos textos da coluna NOTAS — pode ser a mesma em pesos diferentes).
- **Como obter no Canva:** clicar no texto → o nome da fonte aparece na barra de ferramentas superior.
- **Por que o nome não basta sozinho:** para o SVG exportar com a fonte certa, o arquivo dela precisa ser **embutido** (woff2 em data-URI). Se for uma fonte do Google Fonts, resolvo direto; se for exclusiva do Canva, a licença normalmente **não permite** embutir — nesse caso a saída é a fonte livre mais próxima.
- **Fallback já disponível:** `Inter` e `Plus Jakarta Sans`, que o app já carrega — visualmente próximas para este tipo de layout.

### 4. Uma página real exportada *(opcional — mas é o atalho que mais resolve)*

Este é o item que a pergunta *"a imagem alta é o download de uma página de exemplo?"* estava tateando: **é uma coisa diferente do logo**. O logo é o arquivo da marca (item 1); isto aqui é uma **página do calendário exportada do Canva**, e serve para **medir as proporções** com precisão — largura relativa da coluna NOTAS, altura das linhas, tamanhos de fonte, margens.

- **Melhor formato: PDF** (Canva → Compartilhar → Baixar → PDF). Um PDF de uma página carrega, de uma vez só: as **proporções exatas**, a **fonte embutida** e, com sorte, o **logo em vetor** — ou seja, encosta nos itens 1, 2 e 3 num único arquivo.
- PNG na maior resolução disponível também serve para as proporções (só não traz fonte nem vetor).

### Resumo do que enviar

| # | Item | Situação | Se faltar |
|---|---|---|---|
| 1 | **Logo** completo, azul, fundo transparente (SVG > PNG ≥600px > PDF/AI/EPS) | ✅ recebido em SVG | Placeholder no lugar; troca depois |
| 2 | **Hex** do azul, do laranja e das cores de etapa | ✅ extraídos dos PDFs | Amostro das imagens de referência |
| 3 | **Nome da fonte** do template | ✅ extraído dos PDFs | `Inter` / `Plus Jakarta Sans` já disponíveis |
| 4 | **Uma página em PDF** exportada do Canva | ✅ dois PDFs recebidos | Meço pelas imagens já enviadas |

## Valores extraídos do template (transcritos em 21/08/2026)

Fonte: os dois PDFs do kick-off da **Midiática** enviados pelo responsável (1 página = Junho; 3 páginas = meses seguintes), lidos diretamente dos objetos do PDF — geometria com a matriz de transformação aplicada, cores dos operadores `rg`, tipografia dos operadores `Tf`/`Tm`. **Não são medições visuais nem estimativas.**

### Página e grade

| Medida | Valor |
|---|---|
| Página | **1440 × 810** pt — 16:9 exato |
| Tabela (retângulo azul) | x **35,9** → **1334,9** (largura **1299**), topo **167,3** → base **693,3** |
| Faixa de cabeçalho (mês/ano/logo) | do topo da página até y **167,3** |
| Colunas de dia | **131,0** cada (7 colunas) — **10,1%** da largura da tabela |
| Coluna NOTAS | **380,2** — **29,3%** da largura da tabela |
| Linha de cabeçalho (DOM…SAB) | altura **56,8** |
| Linhas de semana | altura **76,9** (6 linhas) |

### Tipografia

| Elemento | Fonte | Corpo | Alinhamento |
|---|---|---|---|
| Nome do mês | **Questrial-Regular** | **80 pt** | esquerda, x ≈ 24 (baseline y ≈ 116) |
| Ano | **Questrial-Regular** | **80 pt** | x ≈ 753 (baseline y ≈ 122) |
| Cabeçalho DOM/SEG/… | **KleinText-Bold** | **15,9 pt** | centralizado, caixa alta, entreletras larga, branco |
| Número do dia | **KleinText-Italic** | **14,5 pt** | à direita, ~25 pt de recuo da borda |
| Intervalo na legenda ("18/06 - 24/06") | **KleinText-Bold** | **19 pt** | dentro do chip colorido |
| Nome da etapa na legenda | **KleinText-Bold** | **20,8 pt** | à direita do chip |

### Paleta

| Uso | Hex |
|---|---|
| Azul do cabeçalho da grade | `#004AAD` |
| Verde-claro (etapa) | `#C9E597` |
| Verde-escuro (etapa) | `#2A965C` |
| Lilás (etapa) | `#E2A9F1` |
| Roxo (etapa) | `#8C52FF` |
| Cinza (etapa) | `#B4B4B4` |
| Amarelo-claro (etapa) | `#FCFFB8` |
| **Laranja — reservado a feriado** | `#FFBD59` |
| Texto escuro | `#2B2B2B` |
| Fundo da coluna NOTAS | `#FAFAFA` |
| Células de dia | `#FFFFFF` |

### Três achados que mudam a execução

**1. A fonte principal é livre; as secundárias não são.** O texto mais visível do calendário — nome do mês e ano, em 80 pt — usa **Questrial**, que é do **Google Fonts (licença SIL OFL)** e pode ser embutida no SVG sem problema. Já o **Klein Text** (cabeçalho dos dias, números, legenda) é uma **família comercial**, disponível dentro do Canva sob a licença do próprio Canva — que cobre usar em designs lá, **não** redistribuir o arquivo da fonte embutido numa aplicação web. É exatamente o risco 1 do plano, agora concreto.
- **Recomendação:** manter **Questrial** no mês/ano (fidelidade total no elemento que mais salta aos olhos) e substituir o Klein Text por **Inter**, que o app já carrega e é OFL. Os elementos afetados são pequenos (rótulos de 15 pt, números de 14 pt) e o Inter é neutro o bastante para a diferença não aparecer no slide. **Decisão do responsável/diretoria** — a alternativa é a empresa licenciar o Klein Text para uso web.

**2. O template tem imperfeições de montagem manual — e o gerador não deve copiá-las.** As colunas deveriam ser todas de 131,0, mas **QUI está com 139,2 e SEX com 122,8**: alguém arrastou a divisória em algum momento (a soma das duas dá exatamente 262 = 2 × 131). As alturas de linha também variam no rodapé da grade (76,9 nas primeiras, depois 78,1 e 81,0), e o nome do mês começa em x ≈ 24 enquanto a tabela começa em 35,9. **O gerador usa colunas e linhas uniformes e alinha o mês à tabela** — é literalmente o tipo de defeito que a automação existe para eliminar. Registrado aqui para que ninguém depois "corrija" o gerador para reproduzir o desalinhamento.

**3. O azul do calendário não é o azul da marca.** O cabeçalho da grade usa `#004AAD` (um azul padrão do Canva), enquanto o logo da Apoio é `#03345F` (marinho bem mais escuro). São cores diferentes, não variação de exportação.
- **Proposta:** manter `#004AAD` na v1 — é o que os clientes já viram e o que torna o gerado indistinguível do material atual. Unificar com o azul da marca é **decisão de identidade da diretoria**, não de execução; fica registrada como pergunta em aberto.

### Sobre o arquivo do logo

O SVG recebido (`Logo Apoio Consultoria Vetorizada.svg`) é utilizável, com três ressalvas registradas:

- **Procedência — resolvido em 21/08/2026:** os metadados C2PA declaram que o arquivo foi composto no editor da **Recraft AI**, e o responsável confirmou o motivo: **não existe vetor oficial da marca**; ele mesmo vetorizou porque não havia nenhum. Portanto **este arquivo é a versão vetorial canônica disponível**, e não um substituto provisório — o gerador usa ele sem ressalva. Se a diretoria um dia produzir um vetor oficial, trocar é substituir um arquivo em `frontend/public/`.
- **Não vinha transparente:** trazia um retângulo branco cobrindo os 1920 × 1080 inteiros, e o desenho ocupava só 72% dessa moldura. Já foi removido, com o `viewBox` recalculado para a caixa real do desenho — proporção final **2,043 : 1**, arquivo de 32,4 KB → **19,9 KB** (46 paths preservados, metadados C2PA descartados).
- **Tem 11 formas brancas internas** (vazados do símbolo). Sobre o fundo branco do calendário elas funcionam como devem; sobre qualquer fundo colorido apareceriam como manchas brancas. **Só usar este arquivo sobre fundo claro** — o que é o caso aqui.

A versão limpa foi **adicionada ao repositório em `frontend/public/marca-apoio.svg`** na execução da Fase 28 (21/08/2026); o gerador a consome via `LOGO_URL` no tema.

## As possibilidades de geração (análise pedida antes de qualquer definição)

O responsável pediu para ver as alternativas antes de fechar qualquer decisão. São cinco caminhos reais; a recomendação e o porquê vêm ao final.

### Possibilidade A — Componente SVG próprio: o preview É a exportação *(**ESCOLHIDA** — 21/08/2026)*

Construir o calendário como um **componente React que renderiza SVG** (`<CalendarioKickoff>`): a grade, os textos, as cores e o logo são elementos SVG posicionados por código, com dimensões fixas por página (ex.: 1140×640 de base). O preview na tela renderiza esse SVG diretamente; a exportação **serializa o mesmo SVG** e o rasteriza num `<canvas>` em 2×/3× (`drawImage` + `toBlob('image/png')`).

- **Prós:** determinístico — o que se vê é *pixel a pixel* o que se exporta, porque é o **mesmo** SVG (satisfaz "bem renderizado e sem falhas" por construção, não por sorte); resolução de exportação livre (2×, 3×) sem perda; **zero dependência nova** de renderização; um calendário é uma grade rígida — o caso ideal de SVG; o componente porta para o Hub quase sem reescrita (SVG puro com cores via props, não Tailwind nem custom properties — ver enquadramento de duas stacks abaixo).
- **Contras:** layout é feito "na mão" (posições calculadas), sem o layout automático do CSS — quebra de linha de texto na coluna NOTAS precisa de um helper próprio de medida/quebra; a fonte precisa ser embutida no SVG como `@font-face` com data-URI (woff2 em base64) para a rasterização enxergá-la — resolvido uma vez, mas precisa ser feito certo.

### Possibilidade B — Captura de DOM (biblioteca `html-to-image` ou similar)

Renderizar o calendário como HTML/CSS comum (o preview) e, na exportação, usar uma biblioteca que serializa o DOM num SVG `foreignObject` e rasteriza.

- **Prós:** o preview usa CSS normal (flex/grid, quebra de texto grátis); menos código de layout.
- **Contras:** **fidelidade por aproximação** — essas bibliotecas têm falhas conhecidas com sombras, fontes externas, imagens e certos recursos de CSS; o resultado pode divergir entre navegadores; é uma **dependência nova** (decisão de dependência, como registrado no roadmap para libs de gráfico); a exportação em alta resolução depende de truques de escala. Para material que vai ao cliente, "quase sempre sai certo" é o risco errado.

### Possibilidade C — Desenho direto em Canvas 2D

Desenhar o calendário imperativamente com a API Canvas (`fillRect`, `fillText`).

- **Prós:** controle total; exporta nativamente.
- **Contras:** o **preview e a exportação viram dois códigos** (ou o preview vira uma imagem estática não-inspecionável); texto (medida, quebra, espaçamento) é o pior caso da API; manutenção pior que SVG sem nenhum ganho — o SVG rasteriza no mesmo canvas no final. Dominada pela possibilidade A em todos os critérios.

### Possibilidade D — Renderização no servidor *(rejeitada — e o motivo importa)*

Uma rota no backend gera o PNG (headless Chromium/Playwright, ou desenho com Pillow).

- **Contras decisivos:** é exatamente o que a definição de carga proíbe — cada render de projeto (4–6 meses × PNG 2×) custaria CPU/RAM **do servidor** (Chromium headless: centenas de MB por instância, segundos de cold start); e o destino final é o **Apoio Hub em hospedagem compartilhada Hostgator (PHP)**, onde **não existe** como rodar um navegador headless nem um processo persistente — a possibilidade morre no port, que é o alvo real. Pillow/GD evitariam o Chromium, mas duplicariam todo o layout fora do preview (drift garantido entre o que o gerente vê e o que baixa).
- **Único pró:** resultado independente do navegador do gerente — que as possibilidades A/C já dão na prática, pois SVG/Canvas rasterizam de forma estável nos navegadores atuais.

### Possibilidade E — Exportar direto para a apresentação (PPTX / API do Canva) *(roadmap, não agora)*

Gerar um `.pptx` com um slide por mês (o Canva importa PPTX), ou integrar com a API do Canva Connect para inserir as imagens no deck.

- **Avaliação:** resolve a última milha (nem copiar nem baixar), mas adiciona uma superfície inteira (geração de PPTX ou OAuth + app aprovado no Canva) para poupar um arrastar-de-arquivos. Fica **registrada como evolução futura** sobre a base das possibilidades A–C — a imagem PNG continua sendo o insumo em qualquer caso.

### Comparativo

| Critério (das definições do responsável) | A — SVG próprio | B — Captura DOM | C — Canvas 2D | D — Servidor |
|---|---|---|---|---|
| Fácil de usar (1 clique) | ✅ | ✅ | ✅ | ✅ |
| Segue o modelo do kick-off | ✅ | ✅ | ✅ | ✅ |
| "Bem renderizado, sem falhas" | ✅ por construção | ⚠️ por aproximação | ✅ mas caro | ✅ |
| Não pesa o Hub / escala 49→70 membros | ✅ zero servidor | ✅ zero servidor | ✅ zero servidor | ❌ é o servidor |
| Dependência nova | Nenhuma | 1 lib | Nenhuma | Infra inteira |
| Preview = exportação garantido | ✅ mesmo SVG | ⚠️ | ❌ dois códigos | ❌ |
| Custo de port para o Hub (PHP/Tailwind) | Baixo (SVG porta) | Médio | Médio | Inviável |

**Recomendação: Possibilidade A** — é a única que garante "sem falhas" por construção, com zero dependência e zero carga de servidor, ao custo (real, assumido) de escrever o layout à mão uma vez.

> **Escolhida pelo responsável em 21/08/2026.** ADR-031 (renderizar no navegador) e ADR-032 (SVG único = preview e exportação) passam a **aceitos**; as possibilidades B, C, D e E ficam registradas como alternativas descartadas — reabri-las exige revisão de ADR, não decisão de execução.

## Exportação: copiar e baixar — com uma limitação honesta

Os dois botões pedidos, e o que é tecnicamente possível em cada um:

- **Copiar** — `navigator.clipboard.write()` com `ClipboardItem` `image/png`. Funciona nos navegadores atuais (exige HTTPS/localhost, gesto do usuário e aba em foco). **Limitação real, sem contorno:** a área de transferência do sistema e a API só comportam **uma imagem por cópia** — não existe "copiar 4 meses de uma vez e colar 4 vezes". É exatamente a dúvida que o responsável levantou, e a resposta honesta é: **o copiar é por mês** (um botão em cada página do preview). Uma colagem única com todos os meses numa imagem só foi considerada e rejeitada: o deck precisa de uma imagem **por slide**.
- **Baixar** — dois modos: **por mês** (PNG individual, nome previsível tipo `calendario-{projeto}-2026-06.png`) e **"Baixar todos" (.zip)** com todas as páginas. Para vários meses, o fluxo que de fato resolve a colagem múltipla no Canva é este: baixar o zip e **arrastar os arquivos de uma vez** para o painel de uploads do Canva (que aceita multi-arquivo) — o clipboard não faz isso, o gerenciador de arquivos faz.
- **O zip sem dependência:** PNG já é comprimido, então o zip pode ser **store-only** (sem compressão) — um escritor de ~80 linhas (cabeçalhos locais + diretório central + CRC32), sem lib. Alternativa aceitável se a execução mostrar que não vale a pena: uma micro-dependência (`client-zip`, ~2.5 KB). Decisão de execução, registrada no ADR-033.

## Carga e escala — a dúvida levantada, respondida com números

A preocupação do responsável: 49 membros ativos (podendo chegar a 70), gerentes disparando renderizações — isso pesa o Hub?

**Com renderização no navegador (possibilidades A/B/C): o custo de servidor é zero por construção.** A rasterização acontece na máquina do gerente; um projeto de 4–6 meses exporta em menos de um segundo no cliente (cada página ~50–150 ms de `toBlob`). O que o servidor serve é o que **já serve hoje** (o `GET` de etapas do projeto) mais a rota de feriados — uma lista estática por ano, de ~1 KB, cacheável à vontade (o conteúdo só muda por decreto). 70 membros, ou 700, não mudam nada nesse desenho: não há endpoint quente novo. A possibilidade D é a única em que a pergunta teria resposta ruim — e é por isso que ela está rejeitada, não oculta.

## UX proposta (interpretação a confirmar com o responsável)

O pedido menciona "aba calendário" (interação/estilização) e "aba formulário" (pré-visualização). Interpretação proposta — **confirmar antes da execução**:

- A sub-view **Calendário** da aba Etapas (`EtapasProjeto.jsx` → pill `calendario`) ganha um botão **"Gerar calendário de kick-off"**, que abre o **gerador**: um painel de **formulário/estilização** (cor por etapa via paleta, opções) ao lado do **preview paginado** por mês — o preview reage a cada ajuste, que é a "pré-visualização de como o calendário está ficando" do pedido.
- O preview renderiza em **tema claro** (fundo branco, como o material do cliente) mesmo dentro do app escuro — o calendário é um artefato de apresentação, não uma tela do sistema.
- Cada página do preview tem **Copiar**; o gerador tem **Baixar este mês** e **Baixar todos (.zip)**.
- **Quem usa:** gerentes. No piloto isso não é restringível (sem auth — como tudo); no Hub o gerador segue o mesmo gate `podeEditar` do ADR-030. A feature **não depende de identidade** (é dado + exibição), então, pelo próprio ADR-028, ela **nasce completa no piloto** — diferente da Fase 25.

### Estilização: o que o gerente controla

- **Cor de cada etapa** (paleta default transcrita do template; override por etapa).
- Registrado para avaliar na execução, sem compromisso: ocultar/renomear entrada da legenda; intervalo de meses exibido.
- **Persistência da estilização:** três opções, decisão em aberto — (1) tabela aditiva `CalendarioConfig` por projeto (JSON de cores/opções; `create_all` materializa, sem fluxo destrutivo ADR-001; sobrevive a trocas de máquina e porta para o Hub) — *recomendada*; (2) `localStorage` (zero backend, mas por navegador); (3) não persistir (re-estilizar a cada uso). O termo aditivo torna a re-geração um caso comum — perder a estilização a cada geração pesa contra a opção 3.

### Regras de pintura (casos que o modelo do Canva não cobre)

- **Bloco de entrega** (ADR-009): os membros compartilham o mesmo intervalo — pintar o intervalo **uma vez**, com **uma** entrada de legenda para o bloco (proposta: nome composto dos membros ou "Bloco N"; decisão em aberto).
- **Etapas sobrepostas** (possíveis desde as Fases 12/13): o modelo assume sequência. Proposta: célula com **faixa dividida** (duas bandas de cor); alternativa: prioridade pela ordem, com aviso no gerador. Decisão em aberto.
- **Termo aditivo:** os dias entre `data_fim_original` e `data_fim` efetiva pintam numa cor própria fixa com legenda **"Termo aditivo"** (decisão do responsável no pedido: não repetir o nome da etapa, rotular só como termo aditivo).

## Decisões em aberto (para o responsável / diretoria)

1. ~~**Escolher a possibilidade de geração**~~ — **RESOLVIDO em 21/08/2026: possibilidade A** (componente SVG único). ADRs 031 e 032 aceitos.
2. ~~**Reunir os insumos do template**~~ — **RESOLVIDO em 21/08/2026**: logo em SVG + dois PDFs reais entregues; geometria, tipografia e paleta transcritas em [Valores extraídos do template](#valores-extraídos-do-template-transcritos-em-21082026).
3. **Substituição do Klein Text** (fonte comercial usada em cabeçalho, números e legenda) — recomendação: **Inter**, mantendo **Questrial** no mês/ano. Alternativa: licenciar Klein Text para web. **Decisão da diretoria.**
4. **Azul do cabeçalho:** manter o `#004AAD` do template (recomendado, fidelidade ao material atual) ou unificar com o marinho da marca `#03345F`. **Decisão de identidade.**
5. ~~Confirmar se existe **vetor oficial do logo**~~ — **RESOLVIDO em 21/08/2026: não existe.** O responsável vetorizou a marca justamente por não haver nenhuma versão vetorial oficial; o arquivo entregue passa a ser a referência vetorial da marca para esta feature.
6. ~~Representação do **bloco de entrega** na legenda~~ — **RESOLVIDO (Fase 28, 21/08/2026): nomes compostos** dos membros (uma entrada por bloco, rótulo "Bloco N: nome1 + nome2").
7. ~~Pintura de **dias com etapas sobrepostas**~~ — **RESOLVIDO (Fase 28): faixa dividida** (bandas horizontais de cor, uma por etapa que ocupa o dia).
8. ~~**Persistência da estilização**~~ — **RESOLVIDO (Fase 28): tabela aditiva `CalendarioConfig`** (`projeto_id` FK única, `cores` JSON), `GET`/`PUT /projetos/{id}/calendario-config`, `create_all` sem fluxo destrutivo.
9. ~~**Proporção/tamanho da exportação**~~ — **RESOLVIDO pelos PDFs**: a base é a do próprio template, **1440 × 810** (16:9 exato). Exportar em **2× = 2880 × 1620** cobre o slide com folga.
10. ~~Confirmar a **interpretação da UX**~~ — **RESOLVIDO (Fase 28): botão "Gerar calendário de kick-off" na sub-view Calendário** da aba Etapas, abrindo o gerador (estilização + preview paginado).

## Relacionados

- Plano executável: [plano-fases-28-29.md](plano-fases-28-29.md) (Fases 28 no piloto, 29 no Hub)
- ADRs propostos: 031 (onde renderizar), 032 (como renderizar), 033 (exportação) em [../arquitetura/decisoes.md](../arquitetura/decisoes.md)
- Fonte única de dias úteis/feriados: ADR-008/016/018/025; termo aditivo: ADR-019
- Item de origem no [roadmap](roadmap.md) ("Calendário estilizado automático") — promovido a especificação por este documento; **recesso da UFU continua pendente lá**
- Enquadramento de duas stacks: ADR-028 e [duas armadilhas de port](plano-fases-25-27.md)
