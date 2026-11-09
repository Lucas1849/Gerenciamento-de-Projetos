# Hotfix da Fase 32 — divergências entre o slide gerado e o modelo

**Status: corrigido e verificado visualmente (09/11/2026), incluindo a revisão 5′ da marca.** H1-H12
implementados; critérios de aceite conferidos no PNG exportado (ABAHABAH, 11 etapas, projeto real do
banco local) e na regressão (Plano de Marketing, 13 etapas soltas, projeto de teste criado e removido
na verificação). A revisão 5′ (marca só com o texto, `marca-apoio-texto.svg`) também foi aplicada e
conferida no PNG exportado — sem o símbolo, sem furos colados.

**Achado adicional durante a verificação, fora do diagnóstico original:** o preset `compacto` (não
recalibrado pelo hotfix — só o `normal` tinha valores medidos no PDF) não comportava de fato o caso
real de estouro: 13 linhas de 1 etapa cada, em `compacto` (mínima 44), somam 650px contra 597px
disponíveis — o "Relatório Final" (13ª etapa) saía sobreposto ao rodapé. Correção: o fator de
distribuição do H2 (`planejarCronograma`) agora também **comprime** quando o conteúdo natural excede o
disponível, não só estica quando sobra espaço — nunca deixa o slide sair com texto sobreposto, mesmo
sem uma recalibração medida de `compacto` (que seguirá pendente até um segundo exemplar do slide, já
registrado como risco em aberto na Fase 32).

**O que foi comparado** (09/11/2026):

- **Gerado:** captura do gerador ("Gerar cronograma da proposta", aba Visão Geral) para o projeto de
  teste `ABAHABAH` (Pesquisa de Mercado, 11 etapas, 7 linhas de prazo, 80 dias), no `master` depois
  do merge do PR #39.
- **Modelo:** `Proposta Espaço da Mente.pdf`, transcrito em
  [cronograma-proposta.md](cronograma-proposta.md), mais a captura de referência da primeira
  conversa sobre a feature (mesmo slide, mostrando a marca no canto).
- **Código:** `cronogramaPropostaTema.js`, `cronogramaPropostaUtils.js`, `CronogramaProposta.jsx`, e
  o banco local (`backend/piloto_projetos.db`), para separar o que é defeito de render do que é dado.

Cada item abaixo diz **o que o modelo faz, o que o gerado faz, a causa no código** e **a correção
proposta**. Valores do modelo vêm do PDF (coordenadas na página 1440×810, origem no topo, `y` de
texto = linha de base), nunca estimados pela captura.

---

## Resumo

| # | Divergência | Gravidade | Onde |
|---|---|---|---|
|H1|**Numeração fora de sequência** (3ª, 1ª, 2ª, 4ª…)|🔴 crítica — errada no material do cliente|utils + dado|
|H2|**Linhas comprimidas e um vão vazio grande** antes do rodapé|🔴 alta — o slide parece inacabado|utils + tema|
|H3|**Rodapé**: total empilhado sob o rótulo, à esquerda, encostado na borda|🟠 alta|componente|
|H4|**Marca da Apoio ausente** no canto superior direito|🟠 alta — slide comercial sem identidade|componente|
|H5|**Nome interno do projeto** ("ABAHABAH") ao lado do título|🟠 alta — expõe nome de trabalho ao cliente|componente|
|H6|**Painel da tabela ausente** (o modelo tem um card opaco, arredondado, com borda)|🟡 média|componente + tema|
|H7|Rótulos de fase sem "Fase N:"|🟡 média|componente|
|H8|Valores de prazo em 20,2 (o modelo usa 25,0)|🟡 média|tema|
|H9|Cabeçalho "Fase / Etapa" ≠ modelo ("Fase da Timeline" ×2), e ~12 px acima|🟢 baixa|componente|
|H10|Cor literal `#1B3A5C` fora do tema|🟢 baixa — dívida|componente|
|H11|**Separadores e rodapé na cor errada** — erro herdado da spec|🟡 média|tema + componente|
|H12|**Fundo da página na cor errada** — cinza-azulado no lugar de azul-escuro → preto|🟠 alta — muda o aspecto do slide inteiro|tema|

---

## 🔴 H1 — Numeração fora de sequência

**Modelo:** 1ª, 2ª, 3ª… de cima para baixo, sem salto — a numeração **é** a leitura do cronograma.

**Gerado:** `3ª Alinhamento e Kick Off` → `1ª Identificação do Problema` → `2ª Objetivo Geral…` →
`4ª Definição do Público-Alvo…`.

**Causa — duas camadas, e as duas precisam de correção:**

1. **Dado:** no banco, o projeto 2 tem o Kick Off gravado com `ordem = 3`, **depois** do bloco
   Identificação + Objetivo (`ordem` 1 e 2) — mas com `fase_escopo = alinhamento`. O template do
   serviço está certo (Kick Off é `ordem` 1). Ou seja, **o dado persistido viola o P1**: a ordem diz
   que o Kick Off vem em terceiro, a fase diz que ele abre o cronograma.

   ```
   id  ordem  nome                         fase_escopo
    7    1    Identificação do Problema    diagnostico   ← bloco
    8    2    Objetivo Geral da Pesquisa   diagnostico   ← bloco
    9    3    Alinhamento e Kick Off       alinhamento
   ```

   As `ordem` são posicionais (1..11), então o projeto foi criado pelo caminho de etapas
   customizadas (`etapas[]` no payload, `ordem = índice + 1`) ou reordenado depois
   (`PUT /projetos/{id}/etapas/ordem`). **Não reproduzi o caminho exato.** O `mover()` do editor
   (`EtapasEditor.jsx`) recalcula a fase pelo vizinho e, pelo que li, não produziria esse estado; os
   suspeitos são caminhos que mexem **só na ordem** (reordenação pós-criação) ou **só na fase** (a
   reclassificação em lote da sub-visão Fases, `PUT .../etapas/fases`), sem tocar no outro eixo.

2. **Render:** `numerarEtapas()` (`cronogramaPropostaUtils.js:23`) numera por `(ordem, id)`, enquanto
   `montarFases()` **desenha** agrupando por fase. Quando ordem e fase discordam, a sequência impressa
   fica embaralhada. O slide não confere a própria coerência.

**Correção proposta:**

- **No slide (o hotfix):** numerar **na ordem de desenho** — percorrer as fases canônicas, as linhas
  de cada fase e os membros de cada linha, contando 1, 2, 3… É o que o modelo faz, e garante sequência
  monotônica mesmo com dado inconsistente.
- **Aviso ao gerente:** se a ordem de desenho divergir da `ordem` persistida, mostrar no painel do
  gerador ("a ordem das etapas não segue as fases — revise em Etapas"). Nunca corrigir em silêncio.
- **No dado (fora do hotfix, registrar como achado da Fase 31):** reproduzir o caminho que gera
  ordem × fase incoerentes e fechá-lo. O mesmo dado aparece fora de ordem no Kanban e na tabela.

---

## 🔴 H2 — Linhas comprimidas e vão vazio antes do rodapé

**Modelo:** as linhas ocupam o painel inteiro, de 124,1 até 721,1. Alturas medidas:
82 · 48 · 100 · 87 · 95 · 95 · 50 · 41 — linha de 2 etapas ≈ 87–100, de 1 etapa ≈ 41–50
(a de 82 é o Kick Off sozinho na Fase 1). O passo entre dois nomes no mesmo bloco é **≈ 40–45**.

**Gerado:** as 7 linhas terminam por volta de y ≈ 594 e sobram **~127 px vazios** antes do rodapé.
O passo entre nomes do mesmo bloco é ≈ 30 — confirma que o slide caiu no preset **compacto**.

**Causa — conta feita com os valores do tema:**

| Preset | linha de 1 etapa | linha de 2 etapas | total (3×1 + 4×2) | cabe em 597? |
|---|---|---|---|---|
|`normal` (nome 42, padding 16, mínima 64)|74|116|**686**|❌ estoura 89 px|
|`compacto` (nome 30, padding 10, mínima 44)|50|80|**470**|✅ sobra 127 px|

Dois problemas encadeados:

1. **O preset `normal` é mais folgado que o modelo** — padding 16 e mínima 64, contra ~4–8 e ~48
   medidos. Por isso um serviço de **7 linhas** estoura, quando o modelo comporta **8 linhas e 12
   etapas** com folga. O gerente ainda recebe o aviso "Conteúdo extenso" — **falso alarme**.
2. **Não há distribuição do excedente.** A política de dois degraus (D2/D3, ADR-036) escolhe o maior
   preset que cabe e para; o espaço que sobra fica vazio no fim.

**Correção proposta:**

- **Recalibrar `normal` pelo modelo:** `alturaNome ≈ 42`, `padding ≈ 4`, `minima ≈ 48`. Com isso o
  `ABAHABAH` dá 3×50 + 4×92 = **518 px** — cabe em `normal`, sem aviso.
- **Distribuir a sobra:** depois de escolher o preset, esticar as linhas proporcionalmente até
  preencher a altura disponível (518 → 597, fator ≈ 1,15), mantendo o texto centrado em cada linha.
  É o comportamento do modelo e elimina o vão.
- `compacto` continua existindo para o caso real de estouro, com o aviso.

⚠️ É uma **revisão parcial do D2 (ADR-036)** — "altura por conteúdo com mínimo" vira "altura por
conteúdo, **esticada até preencher o painel**". Registrar no ADR.

---

## 🟠 H3 — Rodapé

**Modelo:** uma linha só. "Duração Total do Projeto" à **esquerda** (x = 160,4, base 780,4, Poppins
Bold 20,2, branco) e "83 Dias ÚTEIS" à **direita, na coluna do prazo** (x = 1088,8, base 785,4,
Poppins Bold 25,0, `#8FC6FF`).

**Gerado:** as duas linhas **empilhadas à esquerda** em x = 130,6 (`GEO.titulo.x + 3`), e o total
com base em y ≈ 792,9 — encostado na borda de baixo da barra (que termina em 802,1).

**Causa:** `CronogramaProposta.jsx:139-145` posiciona as duas linhas no mesmo x, uma abaixo da outra.

**Correção:** usar as coordenadas do modelo e levá-las ao tema (`GEO.rodape.rotulo` /
`GEO.rodape.total`, com x e base). Escrita **"Dias ÚTEIS"**, como no modelo (decisão 3) — por
exemplo, "80 Dias ÚTEIS".

---

## 🟠 H4 — Marca da Apoio ausente

**Modelo:** a marca "APOIO CONSULTORIA" no canto superior direito. No PDF, a caixa ocupa
**(1302,6 · 3,8) 113,2 × 38,2**, em branco.

**Gerado:** não há marca.

**Causa:** `exportarSvg.js` já sabe embutir logo (data-URI, linhas 45+), mas
`CronogramaProposta.jsx` **nunca desenha** um. A spec também não registrou a marca — a transcrição de
15/10 cobriu tabela, cores e fontes e deixou o logo de fora. Falha da spec, corrigida aqui.

**Correção (decisões 1 e 5):** desenhar a marca "APOIO CONSULTORIA" na caixa medida
**(1302,6 · 3,8) 113,2 × 38,2**, igual ao modelo, e passá-la ao exportador para que saia no PNG.
No PDF a marca é uma imagem rasterizada (`/X5`, 864 × 486 recortada nessa caixa); aqui ela vem do
vetor. Fonte: **o mesmo `frontend/public/marca-apoio.svg`**, com a cor trocada para **branco** — o arquivo
tem `fill #03345F` (azul-marinho), que sumiria sobre este fundo. Nada de arquivo novo: a cor da marca
vira constante do tema (`CORES.marca = '#FFFFFF'`) e é aplicada ao SVG na montagem (sobrescrevendo o
`fill` ao inline-lo como data-URI). O calendário de kick-off continua usando a marca na cor original.

**Revisão da decisão 5 (09/11/2026, depois do hotfix aplicado):** usar o `marca-apoio.svg` com a cor
trocada **não ficou igual ao modelo**, por dois motivos:

1. **O arquivo traz o símbolo** (o "A" estilizado) ao lado do texto. O modelo mostra **só o texto**
   "APOIO / CONSULTORIA": a imagem `/X5` contém o símbolo, mas o recorte da caixa deixa só o texto à vista.
2. **O traçado do arquivo é em camadas de cinza.** O texto não é uma forma única, e sim sobreposições
   `#353334`/`#626161`/`#7A7A7A`/`#D8D7D7` com furos pintados de `white`. O filtro
   `brightness(0) invert(1)` pinta **os furos também** de branco, e o "I" de APOIO fica colado no "O"
   (camada `#D8D7D7`).

**Nova fonte da marca: `frontend/public/marca-apoio-texto.svg`** (arquivo novo, substitui a decisão 5).
É a vetorização da própria imagem `/X5` do PDF modelo, só a área do texto. Foi traçada com potrace a
partir do canal alfa ampliado 8×, e a conferência contra o bitmap original deu erro médio de 3,6/255 e
nenhum pixel invertido. Características do arquivo:

- um único `<path>` com `fill="#FFFFFF"` e `fill-rule="evenodd"`, ou seja, branco nativo;
- **sem filtro** e sem símbolo;
- `viewBox 0 0 417.7 125.2`, enquadrado justo na tinta, proporção **3,336**.

**Posição medida no PDF:** a tinta do texto ocupa **x 1304,8–1414,7 · y 6,4–39,2**, isto é,
**109,9 × 32,8**, proporção 3,34, dentro da caixa de recorte (1302,6 · 3,8) 113,2 × 38,2. A linha
"APOIO" vai de x 1335,0 a 1384,4 e de y 6,4 a 19,3; a linha "CONSULTORIA" vai de x 1304,8 a 1414,7 e
de y 26,1 a 39,2.

**Implementação:**

- `CronogramaProposta.jsx` desenha
  `<image href="/marca-apoio-texto.svg" x=1304.8 y=6.4 width=109.9 height=32.8>`, **sem**
  `FILTRO_MARCA_BRANCA`;
- o tema ganha uma constante própria para essa URL e para essa caixa;
- o `logoUrl` passado ao `exportarSvg.js` passa a ser o novo arquivo;
- `FILTRO_MARCA_BRANCA` sai do tema, porque fica morto;
- `LOGO_URL`/`LOGO_RATIO` do `calendarioKickoffTema.js` continuam intocados, e o calendário de kick-off
  mantém a marca completa.

---

## 🟠 H5 — Nome interno do projeto ao lado do título

**Modelo:** só "Cronograma de Execução". Nenhum nome de projeto ou cliente.

**Gerado:** "ABAHABAH" em cinza, a x = 647,6 (`GEO.titulo.x + 520`), tamanho 18 fixo.

**Causa:** `CronogramaProposta.jsx:58-65`, prop `nomeProjeto`. Não está na spec nem no ADR-036 — é
acréscimo da implementação.

**Correção (decisão 1): remover** o texto e a prop `nomeProjeto` do componente. O slide vai para o
cliente, e o nome do projeto no sistema é nome de trabalho. O nome continua só no **arquivo
exportado** (`exportarSvg` já nomeia o PNG). O canto que ele ocupava não fica vazio: a marca entra no
canto superior direito (H4).

---

## 🟡 H6 — Painel da tabela ausente

**Modelo:** a tabela fica dentro de um **card de cantos arredondados, opaco, com borda**.

**Gerado:** sem card. A tabela flutua sobre o gradiente, e a estrutura vem só dos separadores.

**Causa:** decisão da implementação, registrada **só num comentário**
(`CronogramaProposta.jsx:67`: "Sem fundo sólido para o painel…"), sem passar pela spec nem pelo
ADR-036.

**Valores medidos no PDF (09/11/2026)** — a medição que esta seção deixava pendente foi feita. O card
não é um retângulo `#254D77` translúcido, como a spec dizia: é um preenchimento **opaco** desenhado em
Form XObjects (`/X10` + `/X11`), recortado por um caminho arredondado e contornado por um traço.

| Elemento | Valor |
|---|---|
|Caixa|(127,6 · 52,5) 1185,5 × 668,6 — a mesma da spec|
|Preenchimento|**`#162136`**, opaco (`/ca 1`)|
|Raio do canto|**22,5**|
|Borda|**`#253753`**, **3,0** de espessura (`/LW 4` × escala 0,75)|

**Não há transparência em lugar nenhum do slide:** todos os estados gráficos usados têm `/ca 1`; o
único com `/ca 0` (`gs4`) não pinta nada visível.

**Correção:** desenhar `<rect rx="22.5">` com esses valores, **antes** dos separadores e do texto. As
três constantes vão para o tema (`CORES.painelFundo`, `CORES.painelBorda`, `GEO.painel.raio`,
`GEO.painel.borda`).

---

## 🟡 H11 — Cor dos separadores e do rodapé (achado da mesma medição)

A spec registrou **`#254D77` para painel, rodapé e todos os separadores**. A medição de 09/11 mostrou
que isso estava errado — e a implementação herdou o erro.

**Separadores** (todos com espessura **2,25**, `/LW 3` × 0,75 — o tema usa 2,2, diferença
desprezível):

| y | Tipo | Cor no PDF |
|---|---|---|
|124,1|cheio — abaixo do cabeçalho|`#254D77`|
|206,1|cheio — Fase 1 / Fase 2|`#1F2F47` ⚠️|
|254,5 · 536,0 · 680,1|parcial — dentro da fase|**`#1F2F47`**|
|354,1|o separador fora do lugar|`#1F2F47`|
|440,6 · 630,6|cheio — entre fases|**`#254D77`**|

A regra que se lê do modelo: **divisão entre fases (e o cabeçalho) em `#254D77`, mais visível;
divisão dentro da fase em `#1F2F47`, discreta.** O divisor Fase 1/Fase 2 em `#1F2F47` foge da regra —
deslize de montagem, da mesma família do separador de y = 354,1 (que, por ser `#1F2F47` sobre
`#162136`, quase não aparece). **O gerador segue a regra, não o deslize.**

**Rodapé:** mesma construção do painel — preenchimento **`#162136`** opaco (`/X14`), raio **18,75**,
borda **`#253753`** de 3,0. A caixa da spec está certa. O gerado pinta a barra em `#254D77` chapado,
sem borda nem raio — é por isso que ela aparece azul-clara na captura, e no modelo é escura.

**Correção:** `CORES.separadorFase = '#254D77'` (cabeçalho e entre fases),
`CORES.separadorInterno = '#1F2F47'` (dentro da fase); rodapé com `#162136`, raio 18,75 e borda
`#253753` 3,0. `CORES.painel` (`#254D77`) deixa de ser usado para preenchimento.

**Origem do erro:** o leitor de PDF que usei em 15/10 acompanhava só a cor de **preenchimento**
(`rg`). Os separadores e as bordas são **traços** (`S`, cor em `RG`, espessura em `/LW`), e os
retângulos atribuídos a `#254D77` eram caminhos de **recorte** (`re W n`), que não pintam nada — o
leitor deu a eles a cor que estava ativa no momento. A releitura de 09/11 trata preenchimento, traço
e recorte separadamente.

---

## 🟠 H12 — Fundo da página (achado da mesma medição)

**Modelo:** gradiente linear **vertical** de **`#00063B`** (topo) a **`#000000`** (base) — azul muito
escuro descendo até o preto. É um padrão vetorial do PDF (`/P4`, `ShadingType 2`), conferido por
amostragem: `#00063A` em y = 5, `#00031E` em y = 400, `#000000` em y = 805.

**Gerado:** gradiente de `#1F2F47` a `#253753` — um cinza-azulado bem mais claro, que muda o aspecto do
slide inteiro (compare as duas capturas).

**Causa:** mesmo erro de leitura da spec (H11). `#1F2F47` e `#253753` existem no PDF, mas são cores de
**traço**: separador interno e borda dos cards.

**Correção:** `CORES.fundoTopo = '#00063B'`, `CORES.fundoBase = '#000000'`. O `linearGradient` vertical
do componente já está certo — só as cores mudam.

**Opcional, mesma medição:** o painel tem um brilho externo azul (≈ `#224B75`, opacidade crescendo até
~12% nos ~35 pt antes da borda). Reproduzível com um filtro SVG (`feGaussianBlur` sobre um retângulo
na cor do brilho). É acabamento; se entrar, conferir no PNG exportado, não só no preview.

---

## 🟡 H7 — Rótulos de fase

**Modelo:** "Fase 1: Alinhamento", "Fase 2: Diagnóstico", "Fase 3: Estratégia", "Fase 4: Ação".

**Gerado:** "Alinhamento", "Diagnóstico"…

**Causa:** `FASE_TITULO` em `CronogramaProposta.jsx` só tem o nome.

**Correção:** prefixar "Fase N: ", com N pela posição canônica — **inclusive quando a fase está
vazia** (Q1: a fase aparece, então o número também). A faixa "Não classificada" fica sem número.
Conferir se "Fase 2: Diagnóstico" cabe antes de x = 460 em Poppins Bold 20,2 (a medição do PDF
sugere que sim, com folga).

---

## 🟡 H8 — Tamanho dos valores de prazo

**Modelo:** "5 dias", "15 dias" em **Poppins Bold 25,0**, `#94A3B8` — visivelmente maiores que os
nomes das etapas (spec §5).

**Gerado:** 20,2, o mesmo corpo dos nomes.

**Causa:** `cronogramaPropostaTema.js:41` — `prazoValor: { corpo: 20.2 }`. A spec registra 25,0;
erro de transcrição para o tema.

**Correção:** `prazoValor.corpo = 25.0`.

---

## 🟢 H9 — Cabeçalho

**Modelo:** "Fase da Timeline" · "Fase da Timeline" · "Prazo Estimado", em DM Serif Display 25,0,
base **108,1**, x = 164,0 · 495,8 · 1096,6.

**Gerado:** "Fase" · "Etapa" · "Prazo Estimado", base ≈ **96,3** (`painel.y + alturaCabecalho/2 + 8`).

**Correção (decisão 2): seguir o modelo** — os três rótulos passam a ser **"Fase da Timeline" ·
"Fase da Timeline" · "Prazo Estimado"**, com base em 108,1 e x = 164,0 · 495,8 · 1096,6. A
repetição é do modelo aprovado e fica como está, por decisão do responsável (registrada no ADR-036).

---

## 🟢 H10 — Cor literal fora do tema

`CronogramaProposta.jsx:83` — o separador do cabeçalho usa
`CORES.painel === CORES.textoClaro ? CORES.textoClaro : '#1B3A5C'`, uma condição que nunca é
verdadeira e cai num hex que **não existe no modelo nem no tema**. Viola o princípio do ADR-036
(todas as constantes visuais no tema, para o port ao Hub). Correção: `fill={CORES.painel}`, como os
demais separadores.

---

## O que está correto (não mexer)

- Agrupamento **fase → bloco → etapa**; célula de prazo mesclada = `bloco_entrega`.
- **Total = 80**, somado uma vez por linha de prazo (5 + 5 + 15 + 10 + 10 + 25 + 10).
- Separador **cheio** entre fases e **parcial** (a partir de x = 460) dentro da fase; o separador
  fora do lugar do PDF (y = 354,1) corretamente **não** foi reproduzido.
- Fontes (DM Serif Display / Poppins), as cinco cores do tema, o título e sua posição.
- Fase vazia aparece (Q1) e nome longo nunca é truncado (D5).

---

## Decisões (respondidas pelo responsável em 09/11/2026)

| # | Questão | Decisão |
|---|---|---|
|1|H5/H4 — nome do projeto no slide|**Remover** o nome e colocar a marca "APOIO CONSULTORIA" no canto superior direito, igual ao modelo|
|2|H9 — rótulos do cabeçalho|**"Fase da Timeline" · "Fase da Timeline" · "Prazo Estimado"**, igual ao modelo|
|3|H3 — escrita do total|**"Dias ÚTEIS"**|
|4|H2 — revisão do D2|**Sim:** altura por conteúdo, esticada até preencher o painel|
|5|H4 — origem da marca branca|**O mesmo `marca-apoio.svg`, com a cor trocada** — sem arquivo novo|
|5′|H4 — revisão (09/11/2026)|**SVG novo só com o texto**, `marca-apoio-texto.svg`, vetorizado da imagem `/X5` do modelo: o símbolo e as camadas de cinza do arquivo da plataforma impediam a fidelidade|

Registradas como revisão do ADR-036 em [decisoes.md](../arquitetura/decisoes.md).

---

## Critérios de aceite do hotfix

- [x] `ABAHABAH` numera **1ª → 11ª** de cima para baixo, com o Kick Off como 1ª.
- [x] O gerador avisa quando a `ordem` persistida diverge da sequência por fase.
- [x] `ABAHABAH` gera em preset `normal`, **sem** o aviso "Conteúdo extenso".
- [x] As linhas preenchem o painel até ≈ 721, sem vão antes do rodapé.
- [x] Rodapé numa linha só: rótulo à esquerda (x 160,4), total na coluna do prazo (x 1088,8).
- [x] ~~Marca "APOIO CONSULTORIA" branca em (1302,6 · 3,8) 113,2 × 38,2, vinda do `marca-apoio.svg`
  com a cor trocada~~ — **superado pela revisão 5′ abaixo**: o `marca-apoio.svg` com filtro colava o
  "I" de APOIO no "O"; o calendário de kick-off mantém a marca original (símbolo + texto), intocado.
- [x] (revisão 5′) A marca é **só o texto**, sem o símbolo, vinda do `marca-apoio-texto.svg` sem
  filtro, em (1304,8 · 6,4) 109,9 × 32,8, com os furos de O/P/R/A vazados, também no PNG exportado.
- [x] Sem nome de projeto no slide.
- [x] Painel `#162136` opaco, raio 22,5, borda `#253753` 3,0.
- [x] Rodapé `#162136`, raio 18,75, borda `#253753` 3,0.
- [x] Separadores: `#254D77` no cabeçalho e entre fases, `#1F2F47` dentro da fase.
- [x] Fundo em gradiente vertical `#00063B` → `#000000`.
- [x] Rótulos "Fase N: …", prazos em 25,0.
- [x] Cabeçalho "Fase da Timeline" · "Fase da Timeline" · "Prazo Estimado" na base 108,1.
- [x] Rodapé com "Dias ÚTEIS".
- [x] Nenhuma cor literal fora de `cronogramaPropostaTema.js`.
- [x] Passada visual do **PNG exportado** — conferida contra os valores medidos desta vez (não há o
  PDF neste ambiente para um lado a lado pixel-a-pixel; a conferência foi campo a campo, contra a
  tabela de valores de cada H).
- [x] Regressão: Plano de Marketing (13 linhas, o caso de estouro real) continua cabendo, agora via
  compressão (ver "Achado adicional" acima) — com o aviso mais forte ("revise manualmente").
