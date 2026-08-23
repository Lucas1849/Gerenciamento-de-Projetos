# Plano de ação — Fase 30 (refinos do gerador de calendário de kick-off)

Registro do pedido do responsável em **22/08/2026**, depois de usar a primeira versão do gerador entregue na Fase 28 ("ficou ótima, mas possui algumas modificações para ficar melhor ainda"). Origem dos insumos: dois PDFs reais de kick-off entregues junto do pedido — `Kick off - Brambilla.pdf` e `Cronograma - Denes e Edise.pdf`.

Contexto anterior: spec em [calendario-kickoff.md](calendario-kickoff.md), plano/entrega em [plano-fases-28-29.md](plano-fases-28-29.md), decisões em [ADR-031/032/033](../arquitetura/decisoes.md).

> **STATUS: PROPOSTA — NADA FOI EXECUTADO.** Nenhuma linha de código foi escrita; este documento é só o levantamento e a proposta, conforme pedido explícito ("não realize nenhum código, apenas documente a proposta de melhoria"). **Nenhuma fase começa sem comando direto do responsável.**
>
> ⚠️ **Ordem de execução: 28 → 30 → 29.** Esta fase vem **antes da Fase 29** (port para o Apoio Hub), e isso está registrado como **dependência**, não como preferência: os três refinos caem inteiros dentro de `calendarioKickoffTema.js`, que é justamente o contrato de portabilidade da 29. Portar primeiro seria transcrever para o Hub valores já sabidos errados e pagar o mesmo trabalho duas vezes, em duas linguagens de estilo (armadilha 2 do [plano-fases-25-27.md](plano-fases-25-27.md)). Ver "Dependência da Fase 30" e o passo **29d** em [plano-fases-28-29.md](plano-fases-28-29.md).

---

## 1. O pedido, em três itens

| # | Pedido (palavras do responsável) | Natureza |
|---|---|---|
| **M1** | "aumentar o tamanho da box que fica envolta da data de uma etapa ou feriado" | geometria |
| **M2** | "colocar uma distância em px padrão entre uma etapa ou outro na hora de gerar o calendário" | geometria |
| **M3** | "aumentar a quantidade de cores que serão possíveis de colocar em cada etapa, as cores que serão adicionadas estão em PDF" | paleta |

### A única ambiguidade — e como este documento a trata

"A box que fica em volta da **data de uma etapa ou feriado**" tem duas leituras possíveis:

- **(a) O chip da legenda** — o retângulo colorido da coluna NOTAS que contém o intervalo (`18/06 - 25/06`) da etapa, ou a data (`15/08`) do feriado. **É a leitura adotada aqui**, por dois motivos: é o único lugar onde uma data pertence *a uma etapa ou a um feriado* (na grade, o número do dia é do mês, não de ninguém); e esse chip **comprovadamente estoura hoje** — a conta está em §3.1, e o texto escapando da caixa colorida é exatamente o sintoma que se vê no material gerado.
- **(b) A célula pintada do dia**, na grade. Menos provável, mas **está integralmente especificada em §7** — se for essa a intenção, é só ativar aquela seção; o resto do plano não muda.

O mesmo vale para M2: a leitura adotada é o **espaçamento vertical entre entradas da legenda** (hoje elástico, ver §4); a variante "espaço entre etapas na grade" também está em §7.

**Confirmar antes de executar** — está na lista de decisões (§11).

---

## 2. Levantamento dos PDFs — método e o que dá para usar

Mesmo princípio da Fase 28 e do ADR-005: **valor transcrito da fonte, nunca estimado a olho**. Os dois PDFs foram lidos pelos objetos internos — streams de conteúdo descomprimidos, operadores de cor (`rg`), `BBox` dos Form XObjects e matriz de transformação (`cm`) para resolver tamanho renderizado.

### O que os dois PDFs confirmam sobre a geometria

`Cronograma - Denes e Edise.pdf` é do **mesmo template** já transcrito na Fase 28 (página 16:9, tabela com 7 colunas de dia + uma 8ª coluna mais larga de NOTAS). Convertendo da página dele (6000 × 3375) para a base do gerador (1440 × 810):

| Medida | Denes e Edise (convertido) | Template Midiática (já transcrito, em uso) |
|---|---|---|
| Tabela | 1284 × 529,5 | 1299 × 526 |
| Coluna de dia | 133,5 | 131,0 |
| Coluna NOTAS | 338,3 (**26,3%**) | 380,2 (**29,3%**) |
| Linha de cabeçalho | 55,5 | 56,8 |
| Linhas de semana | 75,8 – 80,3 (desiguais) | 76,9 (uniforme, por decisão) |

**Conclusão:** variação de montagem manual entre um kick-off e outro — exatamente o "achado 2" da Fase 28. **A geometria em uso continua valendo; estes PDFs entram como fonte de cor, não de medida.** No `Kick off - Brambilla.pdf` a grade e a legenda vivem dentro de grupos aninhados do Canva cuja resolução para o espaço da página não é confiável o bastante para transcrever — por isso dele só se extraiu a paleta.

### Cores encontradas (inventário completo, sem curadoria)

`Kick off - Brambilla.pdf` — `#1800AD`, `#B9CBCF`, `#0097B2`, `#373B37`, `#004AAD`, `#05345F`, `#8C52FF`, `#00BF63`, `#566869`, `#97826F`, `#FF3131`
`Cronograma - Denes e Edise.pdf` — `#FFBD59`, `#2B2B2B`, `#FF3E4A`, `#05FF8F`, `#004AAD`, `#FAFAFA`, `#CB69FF`

Classificação contra o que o gerador já usa:

| Hex | Situação |
|---|---|
| `#004AAD` | **reservado** — azul do cabeçalho da grade |
| `#FFBD59` | **reservado** — laranja de feriado |
| `#2B2B2B`, `#FAFAFA` | **reservado** — texto escuro e fundo da coluna NOTAS |
| `#8C52FF` | **já está** na paleta de etapas |
| `#1800AD`, `#0097B2`, `#00BF63`, `#05345F`, `#FF3131`, `#CB69FF`, `#05FF8F`, `#FF3E4A`, `#97826F`, `#566869`, `#373B37`, `#B9CBCF` | **12 candidatas novas** |

> 🔒 **Governança:** o repositório é **público** (mesma razão que manteve o dataset de professores fora dele na Fase 21). Os dois PDFs são material de cliente, com nome de cliente — **não devem ser commitados**. O que entra no repo é apenas o hex extraído, que não é dado sensível. Os arquivos ficam onde os demais insumos do template ficam (OneDrive da área).

---

## 3. M1 — a box em volta da data (chip da legenda)

### 3.1 Diagnóstico, com números

Estado atual em `frontend/src/components/calendarioKickoffTema.js` → `GEO.legenda`:

| Campo | Valor hoje |
|---|---|
| `chipLargura` | **118** |
| `chipAltura` | **30** |
| `corpoIntervalo` | **19** (transcrito do template) |
| raio | 6 |

O chip mais comprido que o gerador escreve é o intervalo de uma etapa: `18/06 - 25/06` — **13 caracteres**. Largura do texto:

- pela métrica que o **próprio componente** usa para estimar largura (`0,55 × corpo`, em `quebrarTexto`): 13 × 19 × 0,55 = **135,9 px**
- por um fator realista para dígitos em Inter **Bold** (≈ 0,60): 13 × 19 × 0,60 = **148,2 px**

O chip tem **118 px**. Ou seja: **o texto é 18 a 30 px mais largo que a caixa**. Como o texto é centralizado (`textAnchor="middle"`) e **não há `clipPath`**, ele escapa ~9 a 15 px de **cada lado** do retângulo colorido, caindo sobre o fundo `#FAFAFA` da coluna NOTAS. Não é percepção de tamanho — é estouro geométrico.

Entradas de feriado (`15/08`, 5 caracteres ≈ 52–57 px) cabem folgadas. Por isso o defeito aparece nas entradas de **etapa**, que são a maioria da legenda.

Na vertical: 19 pt de corpo dentro de 30 px de altura deixa ~11 px de folga total (5,5 px por lado) — apertado para o que o template mostra como uma "caixa" respirada.

### 3.2 O trade-off que M1 obriga a encarar

A legenda é uma linha só: `padding + chip + 12 + nome da etapa`. **Todo pixel que o chip ganha, o nome perde.** Com a coluna NOTAS a 29,3% (380,6 px), medindo quantos nomes do catálogo (60 etapas distintas) passariam a truncar em 2 linhas:

| NOTAS | col. de dia | `chipLargura` | `corpoNome` | largura p/ nome | chars em 2 linhas | nomes truncados (de 60) |
|---|---|---|---|---|---|---|
| 29,3% | 131,2 | 118 | 21 | 214,6 | 36 | **2** ← hoje |
| 29,3% | 131,2 | 150 | 21 | 182,6 | 30 | 10 |
| 29,3% | 131,2 | 150 | 20 | 182,6 | 32 | 7 |
| 29,3% | 131,2 | 172 | 21 | 160,6 | 26 | 15 |
| 32,0% | 126,2 | 150 | 21 | 217,7 | 36 | **2** |
| 32,0% | 126,2 | 172 | 21 | 195,7 | 32 | 7 |
| **34,0%** | **122,5** | **172** | **21** | **221,7** | **38** | **2** |
| 34,0% | 122,5 | 150 | 21 | 243,7 | 42 | 2 |

(Nomes do catálogo: mediana 22 caracteres; os dois que já truncam hoje são "Análise de Concorrentes e Vantagens Competitivas" (48) e "Previsibilidade e Escalabilidade da Receita" (43).)

### 3.3 Proposta

**Aumentar o chip e devolver a largura perdida alargando a coluna NOTAS** — que é onde todo o texto vive. As colunas de dia têm folga de sobra: guardam um número de 2 dígitos em 15 pt dentro de 131 px.

| Campo | Hoje | **Proposto** | Efeito |
|---|---|---|---|
| `GEO.notasFracao` | 0,293 | **0,34** | NOTAS 380,6 → 441,7; coluna de dia 131,2 → 122,5 (−6,6%) |
| `legenda.chipLargura` | 118 | **172** | +46%; folga de ~24 px sobre o texto (≈12 px por lado) |
| `legenda.chipAltura` | 30 | **36** | +20%; folga vertical 11 → 17 px |
| raio do chip | 6 | **8** | proporcional à caixa maior |
| `legenda.corpoIntervalo` | 19 | **19** (mantém) | é valor transcrito do template — não mexer |
| `legenda.corpoNome` | 21 | **21** (mantém) | idem |

**Resultado:** o chip cresce 46% em largura e 20% em altura, o texto passa a caber com folga real, e **o truncamento de nomes fica onde já está hoje (2 de 60)** — sem regressão.

**Variante conservadora**, se a diretoria preferir não se afastar do 29,3% transcrito: `notasFracao` 0,32 + `chipLargura` 150 → chip +27%, truncamento também em 2 de 60, coluna de dia perde só 5 px. Entrega menos "box", mas mexe menos no template. *(Decisão §11.2.)*

> **Registro honesto:** alargar NOTAS **é um afastamento deliberado do template transcrito**. É da mesma família do "achado 2" da Fase 28 (colunas uniformes em vez de reproduzir o desalinhamento manual): o gerador prioriza o material legível sobre a cópia fiel do arquivo do Canva. Mas é decisão de identidade — por isso está listada, não assumida.

---

## 4. M2 — distância padrão entre uma etapa e outra (legenda)

### 4.1 Diagnóstico: hoje não existe constante de espaçamento

Em `CalendarioKickoff.jsx`, no componente `Legenda`:

```
alturaEntrada = Math.min(46, (alturaTotal - pad) / entradas.length)
```

Duas consequências:

1. **O espaçamento não é um valor — é um resto.** O "gap" entre duas entradas é `46 − chipAltura(30) = 16 px`, um número que não está escrito em lugar nenhum do tema. Nada no arquivo de tema diz "espaçamento entre entradas".
2. **O espaçamento encolhe sozinho conforme a legenda cresce**, e o ritmo do material muda de mês para mês:

| Entradas no mês | Passo entre entradas | Gap real (passo − 30) |
|---|---|---|
| até 9 | 46,0 | 16,0 |
| 10 | 45,1 | 15,1 |
| 12 | 37,6 | 7,6 |
| 15 | 30,1 | **0,1** (chips encostados) |
| 16 ou mais | 28,2 | **negativo — chips se sobrepõem** |

(Base: altura útil da coluna NOTAS = 469,2 px = 6 linhas × 78,2.)

Ou seja: dois meses do mesmo projeto saem com ritmos visuais diferentes só porque um tem mais feriados — e a partir de 16 entradas o material sai quebrado, silenciosamente.

### 4.2 Proposta

**Tornar o espaçamento um token explícito do tema, fixo, e a altura da entrada função do conteúdo:**

| Campo | Hoje | **Proposto** |
|---|---|---|
| `legenda.alturaEntrada` | 46 (teto de uma fórmula elástica) | **removido** |
| `legenda.espacamentoEntradas` | — (não existe) | **14** — constante, nunca calculada |
| altura de cada entrada | fixa em 46 | `max(chipAltura, nLinhas × alturaLinha) + folga` — cresce só quando o nome ocupa 2 linhas |

Passo típico: 36 + 14 = **50 px** para nome de 1 linha; ~64 px para 2 linhas. Capacidade da coluna (433,2 px úteis): **~8 entradas de 1 linha**, ou **~6–7 com nomes de 2 linhas** — cobre o mês típico (3 a 6 entradas) com folga.

### 4.3 O que M2 obriga a decidir: política de estouro

O comportamento elástico de hoje é feio, mas existe por um motivo — nunca deixa a legenda transbordar. **Fixar o espaçamento exige dizer o que acontece quando não cabe.** Quatro opções:

| # | Política | Prós | Contras |
|---|---|---|---|
| **A** *(recomendada)* | **Dois presets fixos**: normal (chip 36 / gap 14) e compacto (chip 30 / gap 10), trocando de uma vez ao passar da capacidade | Continua sendo "distância padrão" nos dois modos; degradação previsível, um degrau só | Dois conjuntos de constantes para manter |
| B | Encolhimento contínuo com **piso** (nunca abaixo de chip + 6) | Mínima mudança sobre o código atual | Volta a ter ritmo variável — é o defeito que M2 pede para tirar |
| C | Segunda coluna dentro de NOTAS | Dobra a capacidade | 441,7 px não comportam dois chips de 172 + nome; inviável sem reduzir muito o chip |
| D | Página extra do mês só com a legenda | Nunca trunca nada | Slide a mais no deck do cliente sem calendário nenhum |

Em qualquer política escolhida, **avisar o gerente no painel do gerador** quando um mês entrar em modo compacto — ele decide se aceita ou se junta etapas em bloco. Nunca produzir slide quebrado em silêncio.

---

## 5. M3 — paleta ampliada

### 5.1 Por que 6 cores não bastam (o número que fecha o caso)

`montarItens` atribui cor por índice: `PALETA_ETAPAS[indice % PALETA_ETAPAS.length]`, com **6 cores**. O maior serviço do catálogo, **Plano de Marketing, tem 13 etapas**. Logo, num projeto desse serviço **a cor da etapa 1 se repete na 7 e na 13**. Se duas dessas caírem no mesmo mês, a legenda mostra **duas entradas diferentes com a cor idêntica** — no material que vai à frente do cliente. Não é preferência estética: é ambiguidade de leitura.

Contagem por serviço: Plano de Marketing 13 · Pesquisa de Mercado 10 · Plano de Comunicação 10 · Plano de Negócios 10 · Planejamento Estratégico 7 · Cliente Oculto 7 · Valuation 7 · Plano Operacional 6 · Mapeamento de Processos 6. **Sete dos nove serviços já estouram as 6 cores** (etapas customizadas aumentam ainda mais).

**Alvo mínimo: 13 cores. Proposta: 15**, com folga para etapas customizadas.

### 5.2 Curadoria — porque "adicionar as 12" produziria o mesmo defeito

Medindo a distância euclidiana em RGB entre pares de risco (< 90 = praticamente a mesma cor no slide):

| Par | Distância | Leitura |
|---|---|---|
| `#FF3131` × `#FF3E4A` | **28,2** | dois vermelhos idênticos — manter **um** |
| `#B4B4B4` × `#B9CBCF` | **35,8** | dois cinzas idênticos — manter **um** |
| `#00BF63` × `#2A965C` | 59,1 | dois verdes próximos — aceitável se nunca vizinhos no ciclo |
| `#8C52FF` × `#CB69FF` | 67,1 | roxo × orquídea |
| `#E2A9F1` × `#CB69FF` | 69,4 | lilás × orquídea |
| `#373B37` × `#566869` | 74,1 | dois cinzas escuros |
| `#004AAD` × `#1800AD` | **77,8** | ⚠️ candidata próxima do **azul do cabeçalho** |
| `#00BF63` × `#05FF8F` | 77,8 | verde × verde-neon |
| `#004AAD` × `#05345F` | **81,2** | ⚠️ idem |
| `#FF3E4A` × `#E8918C` | 108,5 | ⚠️ coral × **rosa fixo de termo aditivo** |

**Recomendação — 3 exclusões, com motivo:**

- ❌ `#FF3131` — duplicata de `#FF3E4A` (d = 28).
- ❌ `#B9CBCF` — duplicata de `#B4B4B4` (d = 36), que já está na paleta transcrita.
- ❌ `#05345F` — próxima do azul do cabeçalho (d = 81) **e** de `#1800AD` (d = 96). Entre os três azuis, `#1800AD` é o que mais se separa do cabeçalho por matiz.

Sobram **15 cores** (6 atuais + 9 novas). *Se o responsável preferir manter todas as 12*, a paleta vai a 18 e a consequência a aceitar é que alguns pares ficam indistinguíveis no slide — decisão dele, registrada em §11.3.

### 5.3 Ordem da paleta — não é detalhe

Como a cor é atribuída por índice, **etapas consecutivas recebem entradas consecutivas da paleta** — e etapas consecutivas são justamente as **vizinhas na grade**. Portanto a ordem precisa maximizar o contraste entre vizinhos.

A ordem atual falha nisso: a menor distância entre vizinhos do ciclo é **60,7** (`#B4B4B4` → `#C9E597`, cinza seguido de verde-claro). Otimizando a ordem do ciclo (maximizar a menor distância entre vizinhos), chega-se a **192,0** — mais de 3× melhor:

| # | Hex | Nome | Distância p/ a próxima |
|---|---|---|---|
| 1 | `#97826F` | taupe | 194,8 |
| 2 | `#05FF8F` | verde-neon | 323,3 |
| 3 | `#FF3E4A` | coral | 286,9 |
| 4 | `#00BF63` | verde | 197,7 |
| 5 | `#B4B4B4` | cinza | 214,2 |
| 6 | `#373B37` | grafite | 275,6 |
| 7 | `#E2A9F1` | lilás | 205,7 |
| 8 | `#566869` | cinza-esverdeado | 237,9 |
| 9 | `#FCFFB8` | amarelo-claro | 218,0 |
| 10 | `#8C52FF` | roxo | 202,0 |
| 11 | `#2A965C` | verde-escuro | 233,5 |
| 12 | `#CB69FF` | orquídea | 221,9 |
| 13 | `#0097B2` | ciano/petróleo | 217,3 |
| 14 | `#C9E597` | verde-claro | 290,3 |
| 15 | `#1800AD` | índigo | 192,0 (fecha o ciclo no #1) |

Cores reservadas seguem intocadas: `#004AAD` cabeçalho, `#FFBD59` feriado, `#E8918C` termo aditivo.

---

## 6. Consequência obrigatória de M3 — a função de cor do texto quebra

`textoSobre()` (em `calendarioKickoffTema.js`) escolhe preto ou branco por luminância simples, com corte em 0,6. **Com as cores novas, essa heurística erra em 6 das 12 candidatas** — verificado contra o contraste WCAG real:

| Hex | `textoSobre` escolhe | WCAG preto | WCAG branco | Deveria ser |
|---|---|---|---|---|
| `#00BF63` | BRANCO | 8,63 | **2,43** | escuro — branco **reprova até no mínimo de texto grande (3:1)** |
| `#CB69FF` | BRANCO | 7,00 | **3,00** | escuro — exatamente no limite |
| `#0097B2` | BRANCO | 6,07 | 3,46 | escuro |
| `#FF3E4A` | BRANCO | 6,04 | 3,48 | escuro |
| `#97826F` | BRANCO | 5,74 | 3,66 | escuro |
| `#FF3131` | BRANCO | 5,74 | 3,66 | escuro |

O caso de `#CB69FF` mostra a fragilidade: luminância **0,594** contra um corte de **0,6** — erra por 0,006. E o problema **já existe na paleta atual**: `#2A965C` (verde-escuro) recebe branco a 3,74 quando preto daria 5,62.

**Proposta:** trocar a heurística de luminância pelo **contraste WCAG real** — calcular a razão contra preto e contra branco e escolher a maior. É mudança contida na própria função, sem efeito em nenhum outro ponto do gerador, e resolve os 6 casos de uma vez.

---

## 7. Leitura alternativa (se M1/M2 forem sobre a grade, não sobre a legenda)

Ativar esta seção **apenas** se o responsável confirmar a leitura (b) de §1.

**Como está hoje**, em `CalendarioKickoff.jsx`, cada faixa pintada é:

```
x = célula.x + 1        largura = colDia − 2
y = célula.y + 1 + (rowH−2)·(k/n)        altura = (rowH−2)/n
```

Isto é: a cor preenche **a célula inteira menos 1 px de borda**, e o número do dia fica *por cima* da cor — não existe uma caixa própria em volta da data. Duas consequências:

- **Não há como "aumentar"** essa box: ela já é a célula toda. O pedido só faria sentido como *"dar à data uma caixa própria"* — que é o que o template do Canva faz (caixas individuais por dia, menores que a célula).
- **A separação é a mesma entre tudo:** os 2 px de recuo aparecem igualmente entre dois dias da *mesma* etapa e entre dois dias de etapas *diferentes*. Não existe distinção visual de onde uma etapa termina e a outra começa.

Proposta correspondente, caso seja essa a leitura:

| Item | Proposta |
|---|---|
| Caixa do dia | recuo de **6 px** na horizontal e **5 px** na vertical, com raio 6 — a data ganha uma caixa própria em vez de a cor sangrar até a linha da grade |
| Continuidade | dias consecutivos **da mesma etapa** ficam colados (recuo só nas pontas do intervalo), formando uma barra contínua |
| **Distância padrão entre etapas** | `espacamentoEtapas = 8 px` — aplicado **só na fronteira entre etapas diferentes**, nunca dentro da mesma etapa |
| Sobreposição | faixas divididas continuam como no ADR-031, com 2 px de respiro entre bandas |

---

## 8. Plano executável (30a → 30e)

Dividido em entregas avaliáveis separadamente, como as 28a–28e. **Todas as etapas são frontend — nenhuma toca o backend, o schema ou os testes de `pytest`.**

### 30a — Tokens de geometria da legenda

- `calendarioKickoffTema.js`: `GEO.notasFracao` 0,293 → **0,34** (ou 0,32 na variante conservadora — decisão §11.2); em `GEO.legenda`, `chipLargura` 118 → **172**, `chipAltura` 30 → **36**, raio 6 → **8**.
- `larguraColunaDia()` e `larguraColunaNotas()` já derivam de `notasFracao` — **não precisam mudar**, e é justamente por isso que a coluna alarga sem tocar no resto do SVG.
- `corpoIntervalo` (19) e `corpoNome` (21) **ficam como estão**: são valores transcritos do template.
- **Verificação:** um mês com uma etapa de nome curto e outra de nome longo — o texto do chip precisa mostrar folga visível dos dois lados, e nenhum nome pode passar a truncar que já não truncasse antes.

### 30b — Espaçamento como token + política de estouro

- Remover `GEO.legenda.alturaEntrada`; criar **`espacamentoEntradas: 14`**. No componente `Legenda`, a altura da entrada passa a ser função do conteúdo (`max(chipAltura, nLinhas × alturaLinha) + folga`) e o gap é sempre a constante — **fim do `Math.min` elástico**.
- Implementar a política de estouro aprovada (§11.4). Na recomendada (dois presets), a página escolhe `normal` ou `compacto` conforme a altura somada das entradas, e o painel do gerador **avisa** quando alguma página cair em `compacto` — o gerente decide se aceita ou se agrupa etapas em bloco.
- **Verificação:** projeto forçado com 10+ entradas num mês — sem sobreposição de chips, ritmo constante dentro de cada página, aviso presente.

### 30c — Paleta ampliada e reordenada

- `PALETA_ETAPAS` de 6 para **15**, na ordem de ciclo da §5.3. Cores reservadas (`#004AAD`, `#FFBD59`, `#E8918C`, `#2B2B2B`, `#FAFAFA`) intocadas.
- `GeradorCalendarioKickoff.jsx` **não muda de lógica** — a grade de amostras já usa `flexWrap`, então passa de 1 para 2 linhas sozinha. Conferir só se a barra lateral de 280 px continua confortável.
- `calendarioKickoffUtils.js` **não muda** — a atribuição por índice (`PALETA_ETAPAS[indice % length]`) continua idêntica.
- **Verificação:** um projeto de Plano de Marketing (13 etapas) precisa sair com 13 cores distintas, nenhuma repetida na mesma legenda; conferir na grade que etapas vizinhas não ficam parecidas.

### 30d — Contraste do texto por WCAG

- `textoSobre()` passa a calcular a razão de contraste contra preto e contra branco e devolver a maior. Mesma assinatura, mesmo ponto de uso único — a mudança é interna à função.
- **Verificação:** renderizar uma amostra de cada uma das 15 cores com o texto do chip e conferir que nenhuma combinação fica abaixo de 3:1; olhar especificamente `#00BF63`, `#CB69FF` e `#0097B2`, que são os casos que a heurística atual erra.

### 30e — Congelamento de cores e verificação final

- Se aprovado (§11.5): ao abrir o gerador sem config gravada, **gravar imediatamente as cores default calculadas**, congelando aquele projeto contra mudanças futuras de paleta. Usa o `salvarCalendarioConfig` que já existe.
- `npm run lint` e `npm run build`.
- **Passada visual no browser, no PNG rasterizado** — que é também a pendência **28e**, aberta desde a Fase 28 (a extensão do Chrome não conectou naquela execução, então ninguém chegou a ver o SVG renderizado). **Esta fase é a oportunidade de fechar as duas de uma vez**: gerar, exportar, abrir o PNG em tamanho real e comparar com um kick-off já apresentado.
- Gerar o **mesmo projeto antes e depois** da fase e confirmar que só a legenda e as cores mudaram — a grade, as datas pintadas e os feriados têm de sair idênticos.

**Ordem sugerida:** 30a e 30b mexem no mesmo par de arquivos e podem ir juntos; 30c e 30d são independentes das duas primeiras e podem ir em paralelo; 30e fecha.

---

## 9. Impacto da execução

### Arquivos

| Arquivo | O que muda |
|---|---|
| `frontend/src/components/calendarioKickoffTema.js` | `GEO.notasFracao`, `GEO.legenda.*` (chip, espaçamento), `PALETA_ETAPAS` (6 → 15, reordenada), `textoSobre()` (WCAG) |
| `frontend/src/components/CalendarioKickoff.jsx` | componente `Legenda` — altura por conteúdo + gap fixo; política de estouro |
| `frontend/src/components/GeradorCalendarioKickoff.jsx` | grade de amostras passa de 1 para **2 linhas** (15 amostras de 24 px + 6 px de gap numa barra lateral de 280 px cabem 8 por linha) |
| `frontend/src/components/calendarioKickoffUtils.js` | **nenhuma mudança** — a atribuição por índice continua idêntica |
| `frontend/src/components/calendarioKickoffExport.js` | **nenhuma mudança** — rasteriza o mesmo SVG |

### Backend: nenhuma mudança

- `CalendarioConfig.cores` já valida qualquer `#RGB`/`#RRGGBB` (`schemas.py`, `CalendarioConfigAtualizar._valida_hex`) — as cores novas persistem sem tocar em nada.
- **Sem migração e sem o fluxo destrutivo do ADR-001**: nenhuma coluna nova, nenhuma tabela nova.
- `test_fase28.py` (10 testes) continua valendo intacto. O frontend não tem harness de teste — a verificação é a **passada visual manual**, que é a mesma pendência **28e** ainda aberta desde a Fase 28.

### ADR

Propor **ADR-034 — "Paleta ampliada, espaçamento como token e contraste por WCAG no calendário de kick-off"**, como **revisão parcial do ADR-032** (a paleta e a geometria deixam de ser 1:1 com o template do Canva, e o motivo fica registrado). **Só é escrito em `decisoes.md` se e quando o responsável aprovar** — aquele arquivo é o registro de decisões tomadas, não de propostas.

---

## 10. Riscos e consequências registradas

1. **Regerar um calendário já apresentado muda as cores.** As cores default vêm de `PALETA_ETAPAS[indice % len]`; ampliar de 6 para 15 e reordenar **muda o default de todo projeto que nunca teve cor salva** (o gerente só grava quando clica numa amostra). Um kick-off já apresentado, se regerado, sai diferente do que o cliente viu.
   *Mitigação proposta:* ao abrir o gerador sem config gravada, **salvar imediatamente as cores calculadas** — a partir daí aquele projeto fica congelado, independentemente de mudanças futuras na paleta. É uma chamada a `salvarCalendarioConfig` que já existe. *(Decisão §11.5.)*
2. **Afastamento do template.** Alargar NOTAS e aumentar o chip tornam o gerado não mais pixel-idêntico ao material histórico do Canva. Consciente e reversível (são constantes num arquivo só), mas é decisão de identidade.
3. **Nomes compostos de bloco de entrega** (`"Etapa A + Etapa B"`, ADR-009) já são os que mais truncam, e continuam sendo o pior caso mesmo com NOTAS a 34%.
4. **Fase 29 (port para o Hub)** herda tudo isto — por isso a dependência 28 → 30 → 29 ficou registrada dos dois lados. O tema (`calendarioKickoffTema.js`) é o arquivo pensado para atravessar as duas stacks (ADR-032), então o custo extra do port é praticamente zero **desde que a paleta e sua ordem sejam transcritas 1:1**: a cor sai de `PALETA_ETAPAS[indice % length]`, e uma ordem diferente no Hub faz o mesmo projeto sair com cores diferentes nos dois lados. O passo **29d (paridade de tema e de cor)** existe para pegar exatamente isso.

---

## 11. Decisões a confirmar antes de qualquer execução

| # | Decisão | Recomendação |
|---|---|---|
| 1 | **Qual "box"?** Chip da legenda (§3) ou célula do dia na grade (§7)? | **Chip da legenda** — é onde existe estouro comprovado |
| 2 | Coluna NOTAS: manter 29,3% ou alargar? | **34%** (chip 172, truncamento igual ao de hoje). Variante conservadora: 32% + chip 150 |
| 3 | Paleta: **15 cores** (3 duplicatas excluídas) ou as **18** do inventário bruto? | **15** — 18 reintroduz o defeito de cores indistinguíveis |
| 4 | Política de estouro da legenda (§4.3) | **A — dois presets fixos** (normal / compacto), com aviso ao gerente |
| 5 | Congelar as cores do projeto no primeiro uso do gerador? | **Sim** — protege material já apresentado ao cliente |
| 6 | Escrever o **ADR-034** em `decisoes.md`? | Só após aprovação |

---

## Relacionados

- [calendario-kickoff.md](calendario-kickoff.md) — spec da feature, anatomia do modelo e valores transcritos do template
- [plano-fases-28-29.md](plano-fases-28-29.md) — plano e entrega da Fase 28; Fase 29 (port para o Hub) não iniciada
- [../arquitetura/decisoes.md](../arquitetura/decisoes.md) — ADR-031 (fronteira backend/frontend), ADR-032 (SVG único), ADR-033 (exportação)
- [catalogo-servicos.md](catalogo-servicos.md) — origem da contagem de etapas por serviço que dimensiona a paleta
- [roadmap.md](roadmap.md)
