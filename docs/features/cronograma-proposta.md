# Slide "Cronograma de Execução" da proposta — anatomia transcrita

**Status: implementada na Fase 32 (16/10/2026).** As seis decisões da seção 6 (D1–D6) foram
resolvidas no ADR-036 ([decisoes.md](../arquitetura/decisoes.md)) e aplicadas em
`cronogramaPropostaTema.js`/`cronogramaPropostaUtils.js`/`CronogramaProposta.jsx`. Este documento
permanece como registro da anatomia medida do PDF original.

Fonte: `Proposta Espaço da Mente.pdf`, entregue em **15/10/2026**. Página única, **1440 × 810 pt** —
a mesma base do gerador de calendário de kick-off (ADR-032), o que faz os dois compartilharem
geometria, exportação e raciocínio.

**Método (ADR-005): valor transcrito, nunca estimado a olho.** Todas as medidas abaixo saem do fluxo
de conteúdo do PDF — matrizes `cm`/`Tm` compostas até o espaço da página, operadores `rg` para cor e
retângulos `re` para as faixas. Coordenadas com **origem no topo-esquerda**; o `y` de texto é a
**linha de base**, não o topo da caixa.

---

## 1. O que este slide é (e o que ele não é)

É a proposta real da **Espaço da Mente**, um Plano de Marketing — **não** o catálogo. O escopo dele
tem **12 etapas e 83 dias**, enquanto o escopo oficial de 12/10 do Plano de Marketing tem **13 etapas
e 85 dias** e inclui "Potenciais Parcerias", que aqui não existe.

Isso é informação, não problema: confirma que **o slide é gerado por projeto**, a partir das etapas
reais daquele projeto, exatamente como o calendário de kick-off. O catálogo define o ponto de partida;
o slide retrata o que foi vendido.

### Achado que resolve uma pendência em aberto

A ordem das etapas neste slide **aprovado por cliente** é:

> 5ª Análise de Concorrentes · **6ª Definição do público-alvo** · 7ª Persona · **8ª Jornada do cliente**

Ou seja: o Público-alvo (Diagnóstico) vem **antes** da Jornada do Cliente (Estratégia), e as fases
ficam contínuas. É exatamente a inversão proposta na **Q6** de
[classificacao-fases-etapas.md](classificacao-fases-etapas.md) — a prática comercial já faz o que a
regra P1 pede. **A Q6 pode ser considerada respondida pela evidência**, restando apenas a diretoria
homologar a troca no escopo oficial.

---

## 2. Estrutura resolvida

Doze etapas, **oito linhas de prazo** (quatro delas mesclando duas etapas) e quatro fases. As
fronteiras batem com precisão de sub-pixel:

| Faixa | y (topo→base) | Conteúdo | Prazo |
|---|---|---|---|
|cabeçalho|52,5 → 124,1|"Fase da Timeline" · "Fase da Timeline" · "Prazo Estimado"|—|
|**Fase 1: Alinhamento**|124,1 → 206,1|1ª Kick Off - Alinhamento|5 dias|
|**Fase 2: Diagnóstico**|206,1 → 440,6|2ª Análise de Contexto|5 dias|
| | |3ª Análise de Setor + 4ª Análise de Recursos|15 dias|
| | |5ª Análise de Concorrentes + 6ª Definição do público-alvo|15 dias|
|**Fase 3: Estratégia**|440,6 → 630,6|7ª Persona + 8ª Jornada do cliente|15 dias|
| | |9ª Mix de Marketing + 10ª Análise SWOT|15 dias|
|**Fase 4: Ação**|630,6 → 680,1|11ª Elaboração do Plano de Ação|10 dias|
| |680,1 → 721,1|12ª Relatório Final|3 dias|
|rodapé|739,9 → 802,1|"Duração Total do Projeto" · "83 Dias ÚTEIS"|—|

### A descoberta que mais importa para a automação

**A célula de prazo mesclada é a entrega em bloco.** As quatro mesclagens (3ª+4ª, 5ª+6ª, 7ª+8ª,
9ª+10ª) são exatamente o `bloco_entrega` do modelo de dados — etapas que dividem um prazo. O slide
não precisa de um conceito novo: ele **já desenha** `Etapa.bloco_entrega`, do mesmo jeito que a
legenda do calendário de kick-off já o trata como entrada única (ADR-032).

O mapeamento fica direto:

```
linha de prazo  =  bloco de entrega  (ou etapa solta, bloco de 1)
faixa de fase   =  Etapa.fase_escopo (ADR-035, Fase 31)
rodapé          =  Σ dias úteis, contando cada bloco uma vez
```

Conferência: 5 + 5 + 15 + 15 + 15 + 15 + 10 + 3 = **83** ✅ — bate com o "83 Dias ÚTEIS" do rodapé,
confirmando que o total soma **por linha de prazo**, não por etapa.

---

## 3. Geometria medida

Página **1440 × 810**.

| Elemento | x | y | largura | altura |
|---|---|---|---|---|
|Painel da tabela|127,6|52,5|1185,5|668,6|
|Barra do rodapé|130,6|739,9|1181,7|62,2|
|Separador cheio (atravessa a coluna de Fase)|127,6|124,1 · 206,1 · 440,6 · 630,6|1178,8|2,2|
|Separador parcial (só Etapa + Prazo)|**460,0**|254,5 · 536,0 · 680,1|849,4|2,2|

**A fronteira da coluna de etapas é x = 460,0** — é onde os separadores parciais começam. Ela separa
a coluna de Fase (mesclada verticalmente) das colunas de Etapa e Prazo.

### Colunas (pela linha de base do texto)

| Coluna | x do texto |
|---|---|
|Fase|160,4 – 164,0|
|Etapa|486,8 – 492,1|
|Prazo|1096,6 – 1098,9|

Não existe régua vertical desenhada entre Etapa e Prazo — a separação é só por posição.

### Linhas de base do texto

- **Etapas (12):** 176,7 · 237,4 · 286,6 · 332,1 · 382,9 · 423,1 · 485,0 · 524,5 · 568,4 · 613,9 · 657,1 · 705,8
- **Prazos (8):** 176,1 · 242,5 · 324,3 · 405,7 · 519,9 · 594,8 · 665,9 · 708,8
- **Rótulos de fase (4):** 178,9 · 331,2 · 534,5 · 671,1 — centrados na faixa (a Fase 3 bate exato:
  média de 440,6 e 630,6 = 535,6 contra 534,5 medido)
- **Título:** 35,5 · **Cabeçalho:** 108,1 · **Rodapé:** 780,4 (rótulo) e 785,4 (total)

### ⚠️ Achado — um separador fora do lugar

Existe um quinto separador cheio em **y = 354,1**, com `x = 118,1` e `w = 1195,0`: ele **ultrapassa a
tabela em ~9 px de cada lado** e corta a faixa da Fase 2 ao meio, entre a linha "3ª+4ª" e a linha
"5ª+6ª" — onde todas as outras divisões internas de fase usam o separador **parcial**, que começa em
x = 460.

É deslize de montagem manual, da mesma família do "achado 2" da Fase 28 (variação entre um material e
outro). **O gerador não deve reproduzi-lo:** divisão dentro de uma fase usa separador parcial.
Registrado aqui para que a diferença entre o slide gerado e este PDF seja uma decisão consciente, e
não pareça defeito.

---

## 4. Cores

| Hex | Uso |
|---|---|
|`#1F2F47` / `#253753`|fundo da página (duas camadas chapadas, sob uma imagem de textura)|
|`#254D77`|painel da tabela, barra do rodapé e todos os separadores|
|`#FFFFFF`|título, nomes das etapas, rótulo "Duração Total do Projeto"|
|`#8FC6FF`|cabeçalho da tabela, rótulos das fases, "83 Dias ÚTEIS"|
|`#94A3B8`|valores de prazo ("5 dias", "15 dias"…)|

Nenhuma dessas cores existe no tema do calendário de kick-off (`#004AAD` cabeçalho, `#FFBD59`
feriado, `PALETA_ETAPAS`). **São dois temas distintos** — o slide de cronograma precisa do seu próprio
arquivo de tema, não de um ramo dentro do existente.

⚠️ **O fundo não é cor chapada.** Além das duas camadas de cor, há uma imagem rasterizada
(5745 × 2989) e um `/Pattern` cobrindo a página — a textura/gradiente da identidade. Isso é uma
diferença real em relação ao calendário, que é 100% vetorial. Ver §6.

---

## 5. Tipografia — e a boa notícia

| Fonte | Onde | Tamanhos |
|---|---|---|
|**DM Serif Display** Regular|título, cabeçalho da tabela|44,2 · 25,0|
|**Poppins** Bold|rótulos de fase, valores de prazo, rodapé|20,2 · 25,0|
|**Poppins** Regular|nomes das etapas|20,2|

**As duas são Google Fonts sob licença OFL — embutíveis.** Isso elimina o trade-off que a Fase 28
teve de assumir (o Klein Text comercial substituído por Inter, com perda de fidelidade registrada no
ADR-032). Aqui o slide gerado pode ser **tipograficamente idêntico** ao original, usando o mesmo
mecanismo de `@font-face` por data-URI que o `calendarioKickoffExport.js` já implementa.

---

## 6. Decisões em aberto para a Fase 32

| # | Questão | Observação |
|---|---|---|
|**D1**|**Como tratar o fundo texturizado?** (a) SVG com gradiente aproximando as duas camadas — 100% vetorial, portável, não idêntico; (b) embutir a imagem como data-URI — fiel, mas pesa no bundle e exige o arquivo original em alta; (c) cor chapada `#1F2F47`.|Recomendação: **(a)**, medindo o gradiente da imagem. É a escolha que mantém o componente leve e portável para o Hub, que é o contrato da fase seguinte.|
|**D2**|**Altura de linha é fixa ou proporcional ao conteúdo?** No PDF as faixas têm alturas desiguais (82 · 48 · 100 · 86 · 95 · 95 · 50 · 41), resultado de montagem manual.|Recomendação: **altura por conteúdo com mínimo fixo**, como o `planejarLegenda()` da Fase 30. Reproduzir as alturas do PDF seria transcrever a irregularidade.|
|**D3**|**O que acontece com 20+ etapas?** O Plano de Negócios tem 8 linhas de prazo, mas Pesquisa de Mercado tem 7 e Mapeamento 5 — já o Plano de Marketing tem 13 etapas em 13 linhas, sem blocos.|Mesma política A da Fase 30: dois presets (normal/compacto) e **aviso ao gerente** quando o mês cai em compacto. Nunca gerar slide quebrado em silêncio.|
|**D4**|**Fase vazia aparece?** É a **Q1** da Fase 31, e aqui ela vira pergunta de layout concreta: três dos oito serviços ficaram sem uma fase.|Bloqueia a 32, não a 31.|
|**D5**|**Nome longo de etapa quebra em duas linhas ou trunca?**|A Fase 30 já decidiu isso para o calendário: **nunca truncar**. Manter a mesma política.|
|**D6**|**O slide é uma página só, sempre?**|Até 13 linhas cabem. Acima disso: compacto, ou segunda página. Decidir junto com D3.|

---

## 7. O que se reaproveita da Fase 28/30

| Peça existente | Aproveitamento |
|---|---|
|`calendarioKickoffExport.js` — raster 2× (2880×1620), fontes via `@font-face` data-URI, cópia por imagem, escritor zip próprio|**quase integral** — é genérico. Deve ser **extraído** para um módulo comum, não duplicado.|
|`calendarioKickoffTema.js` — padrão de "um arquivo só com geometria, paleta e fontes, sem custom properties do app"|**o padrão**, não o conteúdo. O slide tem tema próprio.|
|`CalendarioKickoff.jsx` — página SVG 1440×810|**mesma base**, componente novo.|
|`GeradorCalendarioKickoff.jsx` — overlay com preview, avisos e botões|**estrutura reaproveitável**; muda o ponto de entrada na UI.|
|`CalendarioConfig` (tabela, `cores` JSON por projeto)|só se o slide tiver cor por fase a persistir. Hoje **não tem** — as cores são fixas do tema.|

A conclusão prática: **a Fase 32 é majoritariamente montagem de dados + um SVG novo**, porque a
infraestrutura de exportação já existe e está testada em produção.

---

## 8. O que falta

- **A fase de cada etapa no modelo** — é a Fase 31 (ADR-035). Sem ela o slide não tem como agrupar.
- **As respostas Q1–Q9**, em especial Q1 (fase vazia).
- **O arquivo em alta do fundo**, se D1 for resolvido por imagem.
- **Um segundo exemplar do slide**, de outro serviço — idealmente um com bloco de entrega de 3 etapas
  e um sem nenhum bloco. Com um exemplar só, não dá para separar o que é regra do template do que é
  escolha daquela proposta. Foi assim que a Fase 30 descobriu, com dois PDFs, que as alturas de linha
  variavam por montagem manual.
