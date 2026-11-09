# Plano de ação — Fase 32 (geração automática do slide "Cronograma de Execução")

> **STATUS: EXECUTADA (16/10/2026), por comando direto do responsável.** As decisões D1–D6 e o ponto
> de entrada na UI foram resolvidos (seguindo as recomendações da spec) e registrados no ADR-036
> ([decisoes.md](../arquitetura/decisoes.md)) antes da implementação. 32a–32e completos; **32f (passada
> visual do PNG rasterizado) foi feita nesta execução** — diferente das pendências 28e/30e do
> calendário, que seguem em aberto. Risco não-bloqueante registrado: um segundo exemplar do slide, de
> outro serviço, continua recomendado para separar regra de template de particularidade da proposta.

Especificação com a anatomia medida do slide: [cronograma-proposta.md](cronograma-proposta.md).
Dado e formulário: [plano-fase-31.md](plano-fase-31.md). Decisão de modelo: ADR-035 (proposto).
ADR desta fase: **ADR-036, a escrever quando a fase for autorizada.**

---

## 1. A tese da fase, em uma frase

O slide de cronograma é o **mesmo problema** do calendário de kick-off, na mesma base de 1440×810, com
a mesma exportação — então ele é majoritariamente **montagem de dados + um SVG novo**, e não um
subsistema.

O que de fato muda: o agrupamento é por **fase** (não por mês), a linha é o **bloco de entrega** (não
o dia), o tema é outro, e as fontes — Poppins e DM Serif Display, ambas OFL — são **embutíveis**, o
que permite fidelidade tipográfica total, diferente do Klein Text da Fase 28.

---

## 2. Passos

| # | Passo | Entrega |
|---|---|---|
|**32a**|`cronogramaPropostaTema.js`|geometria transcrita (§3 da spec), as 5 cores, as 3 fontes, presets normal/compacto|
|**32b**|`cronogramaPropostaUtils.js`|`montarCronograma(etapas)` → fases × linhas de prazo; agrupa por `fase_escopo`, depois por `bloco_entrega`; numera as etapas (1ª, 2ª…); soma o total|
|**32c**|`CronogramaProposta.jsx`|a página SVG — cabeçalho, faixas de fase, linhas, rodapé|
|**32d**|extrair a exportação|`exportarSvg.js` comum, a partir do `calendarioKickoffExport.js`; **o calendário passa a usar o módulo extraído** (senão vira duplicação, não reuso)|
|**32e**|`GeradorCronogramaProposta.jsx`|overlay com preview, avisos de estouro, copiar/baixar|
|**32f**|passada visual do PNG rasterizado|⚠️ a mesma pendência **28e/30e segue aberta** — não acumular uma terceira|

### 32b é o passo com conteúdo de verdade

```
entrada:  etapas do projeto (com fase_escopo, bloco_entrega, dias_uteis_esperados, ordem)
saída:    [ { fase, linhas: [ { etapas: [...], numeros: [...], dias } ] } ], total
```

Regras, todas derivadas da spec:

1. Agrupar por `fase_escopo`, na ordem canônica Alinhamento → Diagnóstico → Estratégia → Ação.
2. Dentro da fase, agrupar por `bloco_entrega`; etapa solta é bloco de um.
3. A numeração (1ª, 2ª…) é **global e sequencial por `ordem`**, atravessando as fases.
4. O total soma **uma vez por linha de prazo** — conferido contra o PDF: 5+5+15+15+15+15+10+3 = 83 ✅.
5. Separador **parcial** (x=460) entre linhas da mesma fase; **cheio** entre fases. O PDF tem um
   separador cheio fora do lugar em y=354,1 — **é deslize de montagem, não se reproduz** (spec §3).

---

## 3. Riscos

| Risco | Tratamento |
|---|---|
|**Um exemplar só.** Com um PDF não dá para separar regra do template de escolha daquela proposta — foi com **dois** PDFs que a Fase 30 descobriu que as alturas de linha variavam por montagem manual.|Pedir um segundo slide, de outro serviço, idealmente um com bloco de 3 etapas e um sem bloco nenhum. **Pré-requisito recomendado, não bloqueante.**|
|**Fundo texturizado** (imagem 5745×2989 + `/Pattern`) — o calendário é 100% vetorial|D1 da spec. Recomendação: gradiente SVG medido da imagem, preservando leveza e portabilidade.|
|**Duplicar a exportação** em vez de extrair|32d é passo próprio e obrigatório, com o calendário migrado junto|
|**Fase vazia** (3 de 8 serviços)|é a **Q1**; bloqueia a 32, não a 31|
|**Escopo longo** (Plano de Marketing = 13 linhas)|política A da Fase 30: dois presets + aviso visível ao gerente|
|**Port para o Hub** (Fase 33)|mesmas armadilhas do `plano-fases-25-27.md`: Tailwind lá × custom properties aqui, enum divergente, gate `podeEditar`. O tema em arquivo único é o que torna o port viável.|

---

## 4. Onde entra na UI

O calendário de kick-off é aberto por um botão na sub-visão **Calendário** da aba Etapas. O cronograma
de proposta é material **comercial**, usado antes do projeto andar — não pertence à mesma gaveta.

Recomendação: botão na aba **Visão Geral** do projeto ("Gerar cronograma da proposta"), perto do
serviço e do TAP. Confirmar na autorização da fase.

---

## 5. Decisões que preciso antes de executar

1. **Q1** (fase vazia aparece ou é omitida) — bloqueia o layout.
2. **D1** (fundo: gradiente vetorial, imagem embutida ou cor chapada) — recomendação: gradiente.
3. **D3/D6** (escopo longo: compacto ou segunda página).
4. **Ponto de entrada na UI** (§4) — recomendação: Visão Geral.
5. **Um segundo exemplar do slide**, de outro serviço.
