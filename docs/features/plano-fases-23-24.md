# Plano de ação — Fases 23 e 24 (feriados municipais de Uberlândia no calendário; data final editável na criação do projeto)

Registro do planejamento pedido pelo responsável em **11/07/2026**, na sequência da galeria de projetos (Fase 22, [plano-fases-21-22.md](plano-fases-21-22.md)). Origem: dois pedidos na mesma mensagem, ambos vindos de um teste real do calendário — (1) o cálculo de dias úteis já considera **feriados nacionais** (o teste confirmou 07 de setembro), mas **não** os **feriados municipais de Uberlândia**, o que torna a data final derivada irreal na operação da empresa (que fica em Uberlândia/UFU); (2) nos formulários, os **gerentes precisam poder mudar a data final diretamente na criação do projeto** — hoje, no editor de etapas da criação (`EtapasEditor.jsx`), a data final é apenas exibida (derivada, read-only via `DataFimPreview`); a edição da data final só existe **pós-criação**, no `ModalEditarEtapa` (Fase 16, ADR-018).

> **STATUS: AMBAS EXECUTADAS EM 12/07/2026, por comando direto do responsável.** Os ADRs correspondentes ([../arquitetura/decisoes.md](../arquitetura/decisoes.md), ADR-025 e ADR-026) estão com status **"implementado"**. As perguntas do 23d foram resolvidas na execução: a lista oficial veio do **Decreto Municipal nº 22.174/2025** (calendário oficial da Prefeitura — Sexta-feira Santa, Corpus Christi, 15/08 e 31/08 como municipais); recesso da UFU ficou no roadmap; município fixo em Uberlândia (default aceito).

| Fase | Entrega | Status |
|---|---|---|
| 23 | **Feriados municipais de Uberlândia** no cálculo de dias úteis (`app/utils/calendario.py`) — a data final derivada passa a pular os feriados do município | ✅ Executada (12/07/2026) — classe `Uberlandia`, `test_fase23.py` |
| 24 | **Data final editável na criação do projeto** — porta o padrão da Fase 16 (ADR-018) do `ModalEditarEtapa` para o `EtapasEditor.jsx` | ✅ Executada (12/07/2026) — `CampoDataFim` no editor |

**As duas fases são independentes** e podem ser executadas em qualquer ordem ou juntas, mas se complementam: a 23 melhora a **precisão automática** da data final e a 24 dá a **válvula de escape manual** para os casos que o calendário ainda não cobre (feriados pontuais, recessos da universidade, decisões de negócio). Nenhuma das duas mexe em schema — **não há fluxo destrutivo ADR-001** (a `data_fim` nunca é persistida, sempre derivada — mesmo princípio das Fases 16/18/ADR-018).

## Diagnóstico verificado no código (11/07/2026)

### Fonte única de cálculo de datas
- **`app/utils/calendario.py`** centraliza tudo num único objeto `_calendario = Brazil()` (workalendar). `calcular_data_fim`, `contar_dias_uteis` (inverso exato, Fase 16), `proximo_dia_util` (cascata) e `_primeiro_dia_util` derivam **todas** do mesmo calendário. **O frontend nunca calcula datas** — usa `GET /calendario/data-fim`, `GET /calendario/dias-uteis` e `POST /calendario/cascata` (ADR-008). ⇒ **trocar o calendário base num único lugar propaga para todas as superfícies** (Kanban, tabela, cronograma, calendário, editor de criação, modal de edição) sem tocar em nenhuma delas.
- O docstring do módulo já registra a lacuna como risco conhecido: *"Considera feriados nacionais do Brasil (workalendar), municipais/estaduais fora do escopo (risco registrado)."* A Fase 23 fecha esse risco para Uberlândia.
- O **ADR-018 (Fase 16) já anteviu isso**: o contexto cita textualmente *"um feriado municipal (ex.: Uberlândia) torna o prazo derivado irreal"* e entregou a data final editável **só no modal de edição** como paliativo. A Fase 23 ataca a causa (o calendário) e a Fase 24 estende o paliativo para a criação.

### workalendar não tem Uberlândia
- O pacote `workalendar.america` traz dezenas de calendários brasileiros (`BrazilBeloHorizonteCity`, `BrazilGoianiaCity`, `BrazilSaoPauloCity`, …) e **estaduais** (`BrazilMinasGerais`), mas **não existe `BrazilUberlandiaCity`** (verificado em 11/07/2026). ⇒ o calendário de Uberlândia precisa ser **definido no projeto**, subclassando a base do workalendar e acrescentando os feriados municipais transcritos de fonte oficial.
- `BrazilMinasGerais` (estado) é a base natural: já herda os feriados nacionais e acrescenta os estaduais de MG (ex.: **21 de abril — Tiradentes** já é nacional; MG tem particularidades). A Fase 23 subclassa a base escolhida e adiciona **só** os municipais de Uberlândia.

### Editor de criação × modal de edição
- **`ModalEditarEtapa.jsx` (Fase 16, ADR-018)** já tem o padrão completo de **data final editável**: três campos sincronizados (`Dias úteis` ↔ `Data de início` ↔ `Data final`), com `aoMudarFim` convertendo a data desejada em `dias_uteis_esperados` via `GET /calendario/dias-uteis` (`contarDiasUteis`), guarda de sequência (`seqRef`) contra respostas fora de ordem, e **ajuste com aviso** quando a data cai em fim de semana/feriado (`recalcularFim` → `calcularDataFim` confere e corrige). No salvar, **só `dias_uteis_esperados` viaja** — a data final continua derivada (ADR-008 intacto).
- **`EtapasEditor.jsx` (criação, Fase 5/ADR-008)** tem hoje, por card: `Dias úteis` (input), `Início` (input date) e `DataFimPreview` — um `<span>` **read-only** que só exibe a data final derivada (via `calcularDataFim`). **Falta o input editável de data final** e a conversão reversa. A cascata reativa (`cascatearItens`, Fase 12/ADR-014) que recomputa os inícios dos cards seguintes já existe e deve continuar funcionando quando a data final de um card mudar (ela muda os `dias`, que já disparam a cascata).
- Toda a infra de API já existe: `calcularDataFim`, `contarDiasUteis`, `cascataDatas` em `services/api.js`. A Fase 24 é **100% frontend** — nenhuma rota, schema ou cálculo novo.

---

## Fase 23 — Feriados municipais de Uberlândia no calendário (ADR-025)

**Conceito:** o cálculo de dias úteis passa a respeitar os feriados **municipais de Uberlândia** além dos nacionais. Como a empresa (Apoio Consultoria / FAGEN-UFU) opera em Uberlândia, a data final derivada de cada etapa deve pular os feriados do município — hoje ela só pula os nacionais, o que a torna otimista (curta demais) sempre que um feriado municipal cai no intervalo.

### 23a — Calendário de Uberlândia (backend)
- **Novo calendário no `app/utils/calendario.py`** subclassando a base do workalendar (`BrazilMinasGerais`, que já traz nacionais + estaduais de MG) e acrescentando os feriados **municipais** de Uberlândia. Trocar a linha única `_calendario = Brazil()` por `_calendario = Uberlandia()` propaga para tudo.
- **Padrão de definição** (a confirmar na fonte oficial, ver 23b):
  ```python
  from workalendar.america import BrazilMinasGerais

  class Uberlandia(BrazilMinasGerais):
      "Feriados municipais de Uberlândia/MG sobre a base estadual de MG."
      FIXED_HOLIDAYS = BrazilMinasGerais.FIXED_HOLIDAYS + (
          (8, 15, "Nossa Senhora da Abadia (padroeira)"),
          (8, 31, "Aniversário de Uberlândia"),
      )
      # Feriados móveis (ex.: Corpus Christi como ponto municipal), se
      # confirmados, entram via get_variable_days().
  ```
- **Não persiste nada, não migra:** a `data_fim` é sempre derivada (ADR-008/016/018) ⇒ os projetos já existentes passam a exibir a data final correta (mais longa quando há feriado municipal no intervalo) **sem tocar no banco**. **Não aciona o fluxo destrutivo ADR-001.** É exatamente a propriedade "sem migração" da Fase 16.
- `contar_dias_uteis` (reverse) e a cascata usam o **mesmo** `_calendario`, então ficam consistentes automaticamente — a ida-e-volta (`data → dias → data`) continua exata, agora contando os municipais.

### 23b — Dataset de feriados (transcrição validada, padrão ADR-005)
- **A lista de feriados municipais é conteúdo validado, não inferência** — mesmo princípio do catálogo de serviços (ADR-005) e do seed de professores (ADR-023). As datas devem ser **transcritas da fonte oficial**: a **Lei Municipal / calendário oficial da Prefeitura de Uberlândia** (e, se a empresa seguir o calendário acadêmico, o **recesso/feriados da UFU**). Não hardcodar datas "de memória".
- **Candidatos conhecidos a confirmar** (não assumir sem checar a fonte): **15 de agosto — Nossa Senhora da Abadia** (padroeira do município) e **31 de agosto — Aniversário de Uberlândia**; verificar também **Corpus Christi** (móvel; costuma ser ponto facultativo/municipal) e **Sexta-feira Santa** (já nacional). ⇒ **pergunta ao responsável / levantamento** (23d).
- **Feriados municipais são informação pública** (lei municipal) — **podem ser commitados** no código, ao contrário do dataset de professores (dados pessoais, gitignorado). Ficam inline no calendário ou num pequeno módulo `feriados_uberlandia.py` com a fonte e a data da transcrição no docstring.

### 23c — Teste (`test_fase23.py`)
- Um caso com intervalo que **contém** um feriado municipal (ex.: início em 12/08 + N dias úteis cruzando 15/08) e o mesmo intervalo **sem** o feriado, provando que a data final se alonga em 1 dia útil.
- Ida-e-volta: `contar_dias_uteis(inicio, calcular_data_fim(inicio, N)) == N` num intervalo que cruza feriado municipal (garante que o reverse-calendar continua exato com a base nova).
- Regressão: os casos nacionais existentes (ex.: 07 de setembro) continuam verdes; `data_inicio` num feriado municipal cai corretamente para o próximo dia útil (`_primeiro_dia_util`).

### 23d — Perguntas ao responsável (levantamento)
1. **Fonte e lista exata dos feriados municipais** de Uberlândia a adotar (Lei Municipal / calendário da Prefeitura). Default proposto para validação: 15/08 (padroeira) e 31/08 (aniversário da cidade). Confirmar Corpus Christi e eventuais pontos facultativos.
2. **Recesso da UFU / calendário acadêmico** entra? A empresa é júnior da FAGEN-UFU; se os projetos param no recesso da universidade, essas datas também deveriam contar como não-úteis. Pode ser fase futura (roadmap: "Calendário estilizado automático" já lista "calendário de férias da universidade").
3. **Município fixo (Uberlândia) ou configurável?** Default proposto: **fixo em Uberlândia** (é onde a empresa opera; mais simples e realista). Suporte a múltiplos municípios por gestão/projeto é evolução de roadmap, não da fase.

---

## Fase 24 — Data final editável na criação do projeto (ADR-026)

**Conceito:** no editor de etapas da **criação** do projeto, o gerente passa a poder **digitar a data final** de cada card, além dos dias úteis e da data de início — exatamente o que a Fase 16 (ADR-018) entregou no `ModalEditarEtapa` para etapas já criadas. Assim o gerente que sabe a data de entrega acordada com o cliente não precisa calcular os dias úteis na cabeça, e tem a válvula de escape para qualquer feriado/recesso que o calendário ainda não modele.

### 24a — Data final editável no `EtapasEditor.jsx` (frontend)
- Substituir o `DataFimPreview` **read-only** por um **input `type="date"` editável** de data final, replicando o comportamento sincronizado do `ModalEditarEtapa` (ADR-018):
  - Editar **dias úteis** ou **início** → recalcula a data final exibida (já é o que o preview faz hoje).
  - Editar a **data final** → converte em `dias_uteis_esperados` via `contarDiasUteis(inicio, dataFim)` (contagem inclusiva, Fase 16), **atualiza o campo de dias** do card e dispara a **cascata** dos cards seguintes (a cascata da Fase 12 já reage à mudança de `dias`).
  - Se a data final cair em **fim de semana/feriado**, ajustar para o dia útil que a cobre **com aviso** (mesmo `calcularDataFim` de conferência do modal). Como a Fase 23 acrescenta os feriados municipais à fonte única, esse ajuste passa a respeitá-los automaticamente.
  - **Guarda de sequência** (padrão `seqRef` do modal / `cascataSeq` do editor) contra respostas de rede fora de ordem.
- **Data final desabilitada enquanto não houver data de início** (o campo precisa da âncora), igual ao modal (`disabled={!dataInicio}` + `title`).
- **Bloco de entrega:** o card de bloco tem `dias`/`dataInicio` compartilhados (um por conjunto) — a data final editável opera sobre esses valores compartilhados, como já é a semântica do bloco no editor.
- **ADR-008 preservado:** o payload de criação (`etapasParaPayload` em `etapasEditorUtils.js`) **continua enviando `dias_uteis_esperados` + `data_inicio`**, nunca a data final. A data final editável é **açúcar de UI** que só ajusta os dias — a matemática de datas permanece exclusiva do backend. **Nenhuma mudança em `etapasParaPayload`, no schema `EtapaProjetoCriar` ou nas rotas.**

### 24b — Reuso / refatoração
- O bloco de conversão data↔dias com guarda de sequência e ajuste-com-aviso é **idêntico** ao do `ModalEditarEtapa`. Avaliar extrair um helper compartilhado (ex.: `sincronizarDataFim()` em `datasUtils.js` ou `etapasEditorUtils.js`) para os dois consumirem, evitando duplicar a lógica delicada de sequência. Decisão de execução — se a extração ficar mais complexa que o ganho, replicar localmente com comentário apontando o ADR-018.
- `DataFimPreview` deixa de ser read-only (vira o input) ou é removido em favor do novo campo; conferir que nenhum outro componente o importa (é local do `EtapasEditor`).

### 24c — Teste / verificação
- **Frontend (manual, verificação no browser):** criar projeto, num card digitar uma data final → os dias úteis se ajustam e os cards seguintes recalculam o início (cascata); digitar data final em sábado → aviso de ajuste; validar que o projeto criado tem os dias/início corretos no backend (a data final exibida na página do projeto bate com a digitada).
- `npm run lint` / `npm run build`.
- **Backend:** nenhuma mudança ⇒ suíte `pytest` existente continua cobrindo a criação; a Fase 24 não adiciona teste de backend (é UI sobre rotas já testadas).

---

## Fora de escopo (registrado)
- **Feriados de outros municípios / multi-cidade** (23): o piloto opera em Uberlândia; parametrizar município por gestão/projeto é roadmap.
- **Recesso/calendário acadêmico da UFU** (23): depende de levantamento com a diretoria (mesma pauta do "Calendário estilizado automático" no [roadmap](roadmap.md)); pode virar fase própria.
- **Feriados estaduais de MG** além dos que o `BrazilMinasGerais` já traz (23): a base do workalendar cobre; não transcrever manualmente o que o pacote já dá.
- **Data final como campo persistido** (24): continua **derivada** (ADR-008) — a edição da data final nunca grava data, só ajusta dias. Persistir data real de conclusão é schema novo (registrado no roadmap de dashboards).
- **UI de gestão de feriados** (cadastro self-service de feriados pela tela): fora do piloto — feriado é conteúdo transcrito de fonte oficial (ADR-005), não dado de usuário.

## Riscos registrados
1. **(23) Lista de feriados errada/desatualizada:** transcrever de memória ou de fonte não-oficial dá data final errada em todos os projetos. Mitigar com a transcrição da **fonte oficial** (Lei Municipal / Prefeitura), fonte + data no docstring, e conferência do responsável (23d).
2. **(23) Mudança silenciosa das datas de projetos existentes:** ao adicionar os municipais, todo projeto cujo intervalo cruza um feriado municipal passa a exibir data final +1 dia útil. É o **comportamento correto e desejado**, mas o responsável deve saber que as datas "vão mexer" na primeira subida — comunicar na entrega.
3. **(24) Duplicação da lógica delicada de sequência:** copiar o bloco de conversão do modal sem extrair helper arrisca as duas cópias driftarem. Mitigar preferindo a extração (24b) ou, se replicar, comentar o vínculo com o ADR-018.
4. **(24) Cascata × edição de data final:** editar a data final muda os dias, que disparam a cascata dos cards seguintes — conferir que a guarda de sequência do editor (`cascataSeq`) e a da conversão não brigam (duas fontes de resposta assíncrona no mesmo card). Validar no browser com edições rápidas em sequência.
5. **(23/24) Regressão da fonte única:** qualquer código que tenha, por engano, replicado math de data no frontend quebraria a consistência. Verificado em 11/07/2026 que não há — o frontend só chama as rotas de calendário; manter assim.
