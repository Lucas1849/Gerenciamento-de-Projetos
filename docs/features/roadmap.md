# Roadmap Futuro

Itens fora do escopo da "base sólida" (Fases 0–5 do plano de continuidade). Cada um depende de dados que a base sólida já vai deixar prontos, mas nenhum deve ser implementado antes dela.

## Calendário estilizado automático → promovido a especificação (Fases 28–29)

Gerar calendário mostrando os dias úteis de cada etapa, feriados e período de férias da universidade — usado para preparar slides de apresentação ao cliente.

**Atualização de 21/08/2026 — o item saiu do roadmap e virou documentação base**, por pedido do responsável (com o modelo real do Canva como referência): especificação e análise das possibilidades técnicas em [calendario-kickoff.md](calendario-kickoff.md), plano executável em [plano-fases-28-29.md](plano-fases-28-29.md) (Fase 28 no piloto, Fase 29 port para o Hub), ADRs 031–033 **propostos**. Nada executado — aguarda a escolha da possibilidade de geração e o comando do responsável.

- **Depende de:** `Etapa.dias_uteis_esperados` e `Etapa.data_inicio` (existem; a Fase 5 adotou `workalendar` com feriados nacionais para o cálculo de data final — `app/utils/calendario.py`).
- **Falta levantar:** ~~feriados estaduais/municipais~~ (endereçados pela **Fase 23**, ADR-025); **calendário de férias/recesso da universidade** (ainda pendente — levantamento com a diretoria, mesma pauta da Fase 23; quando entrar no `_calendario`, o gerador das Fases 28–29 herda automaticamente); paleta/fonte/logo do template do Canva (pré-requisito das Fases 28–29, com a diretoria).
- ~~**Falta decidir:** formato/estilo visual do calendário gerado~~ — especificado em [calendario-kickoff.md](calendario-kickoff.md) (anatomia transcrita do modelo real; possibilidades A–E com recomendação registrada).
- **Permanece aqui como evolução futura:** exportação direta PPTX / integração com a API do Canva (possibilidade E da especificação) — só sobre a base entregue, se o uso pedir.

## Exportação automática para SIEX (ficha de cadastro de projeto de extensão)

Gerar a ficha de cadastro de projeto de extensão no SIEX da universidade, exportando para Google Sheets no formato exigido, reduzindo o tempo da diretoria com burocracia.

- **Depende de:** `EtapaConsultor.data_entrada`/`data_saida` (já implementado na base sólida) — é exatamente o dado de "quem trabalhou em qual etapa e quando" que o SIEX exige.
- **Falta levantar:** layout exato exigido pela ficha SIEX (com a diretoria, mesmo tipo de levantamento feito para o [catálogo de serviços](catalogo-servicos.md)).
- **Falta decidir:** integração com Google Sheets API (credenciais/service account) ou geração de arquivo para upload manual.

## Pontos fortes dos membros

Descrição dos pontos fortes de cada membro para facilitar a alocação de consultores nas demandas.

- **Depende de:** nenhuma mudança de schema bloqueante — adicionar campo em `Trabalhador` é uma migração isolada e barata.
- **Falta levantar:** taxonomia dos pontos fortes (tags fechadas vs. texto livre) — decisão de conteúdo com a diretoria, não técnica.

## Atualização automática do TAP via Clicksign

Hoje o status do TAP é alterado manualmente na página do projeto depois que o cliente assina no Clicksign (fluxo entregue na Fase 4, que permanece como fallback permanente). A ideia é o status virar "assinado" automaticamente a partir de algum gatilho do Clicksign.

- **Depende de:** `Projeto.tap_assinado` e da edição manual via `PUT /projetos/{id}` (ambos já existem).
- **Falta levantar:** viabilidade técnica — plano/API da conta Clicksign da Apoio, se webhooks estão disponíveis nesse plano, e como correlacionar o documento assinado ao projeto correto (ID externo? nome do contratante?).
- **Falta decidir:** webhook (exige backend com URL pública — o piloto roda local) vs. polling periódico da API do Clicksign vs. continuar manual. **Não implementar antes desse levantamento.**

## Integração real com o Apoio Hub

Autenticação via login já existente no Apoio Hub, leitura da tabela de colaboradores já cadastrada lá, e possível unificação de banco de dados.

- **Atualização de 05/07/2026 — o schema do Hub foi mapeado.** O mantenedor da plataforma enviou o dump de colunas do banco de produção (25 tabelas MySQL/MariaDB). A análise completa, o mapa de correspondência com o modelo do piloto e as **definições piloto → produção** (o que sai e o que fica no go-live) estão em [../arquitetura/integracao-apoio-hub.md](../arquitetura/integracao-apoio-hub.md); a execução é a **Fase 11** do [plano de fases 7–11](plano-fases-7-11.md), gatilhada pelo acesso ao banco.
- **O que a análise revelou:** `plataforma_hub_funcionarios` cobre (com sobra) o cadastro de membros — inclusive foto, status Ativo/Alumni/Desligado e `nivel_acesso` para permissões; o Hub **já tem** um módulo simples de projetos/etapas com os mesmos enums de fase/status (a integração é evolução de schema, não greenfield); `Professor` (orientador externo) **não existe** no Hub e precisará de decisão.
- **Decisão já tomada:** adiado por escolha do responsável pelo projeto — o piloto continua isolado com seus próprios dados por enquanto.
- **Limpeza pendente ligada a este item:** o cadastro de colaborador/professor na tela **Membros** é scaffolding provisório de testes (decisão de 05/07/2026, Fase 3) — remover quando o piloto tiver acesso às tabelas do Hub. O user card decorativo da sidebar (`USUARIO_DEMO`) também passa a vir do login real. As rotas DELETE de gestão/projeto (Fase 9 planejada) passam a ser **exclusivas de diretores/cargos de edição** via `nivel_acesso`.
- **Risco reduzido:** o stack de dados deixou de ser desconhecido (era o "maior risco do roadmap inteiro"); o esforço remanescente está no acesso, na autenticação e na migração SQLite → MySQL.

## Paridade de cargos e permissões entre o piloto e a produção

Fazer o ambiente de testes refletir o tratamento de **cargos e gerenciamento de permissões** que existe de verdade na produção. Pedido pelo responsável em **08/08/2026**, na aprovação das Fases 25–27, como contrapartida consciente ao ADR-028 (features que dependem de identidade nascem no Hub; o piloto recebe só o layout).

**O problema:** hoje o piloto e a produção não se parecem nesse ponto. No piloto, `Trabalhador.cargo` é **texto livre** (`Column(String)`, input aberto em `FormularioColaborador.jsx`), não há área, não há usuário logado (`USUARIO_DEMO` é decorativo) e **toda rota é aberta**. Na produção (`ApoioHub`), há `nivel_acesso`, cargos por área (`plataforma_hub_funcionario_cargos`), uma fonte única de permissão no frontend (`src/utils/permissions.js`: `isAdminGlobal` / `pertenceAArea`) e o espelho dela no backend (`api/proj_auth_lib.php`, `proj_exigir_editor()` em todo endpoint de escrita, leitura liberada). A consequência prática é que **regras de permissão não podem ser testadas no piloto** — só validadas direto em produção, que é exatamente onde não se quer descobrir que estavam erradas.

- **Depende de:** decidir o **alcance** — espelhar só o suficiente para testar (um usuário atual + `podeEditar` equivalente) ou modelar cargos/áreas de verdade no piloto. O primeiro é barato; o segundo mexe em `Trabalhador` ⇒ **fluxo destrutivo ADR-001** (apagar o `.db` + re-seed).
- **Falta levantar:** quais permissões o módulo de Projetos realmente precisa distinguir além de "pode editar" (a produção hoje tem só esse corte para projetos, mais o admin global) e se o piloto deve replicar os `area_id` do Hub ou uma abstração própria.
- **Falta decidir:** se isso vira fase própria antes da **Fase 11** (integração real, que traz auth de verdade e tornaria boa parte deste item obsoleto) ou se é absorvido por ela. Vale a pena pesar: espelhar permissões no piloto é trabalho que a Fase 11 pode tornar descartável — mas a Fase 11 está travada externamente há meses, e enquanto isso cada feature com permissão sai não-testável.
- **Relacionado:** [../arquitetura/gaps-publicacao-hostgator.md](../arquitetura/gaps-publicacao-hostgator.md) (divergências já conhecidas entre piloto e publicado) e o risco 7 do [plano-fases-25-27.md](plano-fases-25-27.md).

## Métricas e dashboards de projetos

Painéis com indicadores dos projetos para a diretoria e os gerentes acompanharem saúde, prazo e alocação — ex.: projetos por fase, etapas atrasadas (data final derivada vs. hoje), % de conclusão por projeto, carga por consultor (quantas etapas ativas cada um tem), tempo médio por etapa/serviço, aderência ao prazo planejado. Pedido pelo responsável em **06/07/2026**, para **depois** das Fases 12 e 13 ([plano-fases-12-13.md](plano-fases-12-13.md)).

**Atualização de 09/07/2026:** uma aba "Dashboards" chegou a ser **planejada na Fase 18** (ADR-020) e foi **retirada por decisão do diretor** — os KPIs nunca foram levantados (o pedido era um comentário "por cima") e o item volta para cá até a diretoria defini-los. A **proposta-base registrada como pauta** desse levantamento (do [plano das Fases 16–18](plano-fases-16-18.md)): rota agregadora `GET /gestoes/{id}/dashboard` devolvendo `projetos_por_fase`, `etapas_por_status` e `termos` (total de termos aditivos, Σ dias aditivos, ranking por projeto e por serviço) — a Fase 17 (Termo Aditivo, ADR-019) cria exatamente o dado de **atraso formalizado** (`data_fim_original` planejada × `data_fim` efetiva) que torna essas métricas confiáveis. Registrado também o limite: o modelo **não tem data real de conclusão** de etapa — o "atraso" mensurável hoje é o formalizado (termos), não o observado; medir atraso real é schema novo.

- **Depende de:** dados que já existem no modelo — `Projeto.fase`, `Etapa.status`, `Etapa.data_inicio` + `data_fim` derivada (ADR-008), `EtapaConsultor.data_entrada`/`data_saida` (ADR-002). A Fase 13 acrescenta `EtapaDependencia` (métricas de caminho crítico/bloqueios) e a **Fase 17 acrescentará `TermoAditivo`** (atraso formalizado, planejado × real).
- **Falta levantar:** quais indicadores a diretoria realmente usa para decidir (levantamento com a diretoria, mesmo tipo feito para o [catálogo de serviços](catalogo-servicos.md)) — evitar dashboards "bonitos e inúteis". Definir o conceito de "atrasado" (termo aditivo formalizado? data final derivada vs. hoje? vs. prazo do TAP?).
- **Falta decidir:** agregação no backend (novas rotas `GET /metricas/...` que devolvem números prontos — a proposta-base acima é o ponto de partida) vs. cálculo no frontend a partir das rotas existentes; biblioteca de gráficos (o app hoje só tem react/react-dom/@dnd-kit/lucide como dependências de frontend — introduzir uma lib de chart é uma decisão de dependência) vs. SVG/CSS próprios no estilo do design system (proposta-base: sem lib). **Não implementar antes desse levantamento.**
