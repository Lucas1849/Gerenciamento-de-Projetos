# Integração com o Apoio Hub — análise do schema real e definições piloto → produção

Em **05/07/2026**, o membro que mantém a plataforma Apoio Hub enviou o dump das colunas do banco de produção (25 tabelas `plataforma_hub_*`, MySQL/MariaDB). O CSV original fica como referência **local** em `docs/arquitetura/dados/apoio-hub-columns.csv` — **deliberadamente fora do controle de versão** (`.gitignore`), por ser metadado interno da plataforma; quem precisar dele deve pedir ao mantenedor do Hub ou ao responsável pelo projeto. As informações relevantes do dump estão transcritas neste documento. Este documento responde à pergunta do responsável pelo projeto, mapeia a correspondência entre o modelo do piloto e o do Hub, e **define o que fica e o que sai do piloto quando os testes acabarem e a plataforma for ao ar** (a execução dessas definições é a Fase 11 do [plano de fases](../features/plano-fases-7-11.md)).

## A pergunta: "é possível ter uma noção do que o Hub já tem de informação sobre os membros?"

**Sim — com clareza.** O schema mostra que o Hub já mantém um cadastro de membros completo e rico, muito além do que o piloto precisa:

### `plataforma_hub_funcionarios` (tabela central de membros)

| Grupo | Colunas | Relevância para o piloto |
|---|---|---|
| Identidade | `nome`, `foto_url`, `bio`, `emoji_perfil` | **O Hub tem foto** (`foto_url`) — o avatar por iniciais do piloto (`AvatarIniciais.jsx`) é um workaround que vira *fallback* na integração |
| Situação | `status_membro` enum('Ativo','Alumni','Desligado'), `situacao` | Cobre exatamente o conceito de "Membros Ativos / Ex-membros" da tela Membros do Hub |
| Contato | `contato_email`, `contato_telefone`, `contato_instagram`, `contato_linkedin`, `contato_twitter` | Substitui o `emailInstitucional` do piloto com sobra |
| Credenciais | `senha_hash`, `nivel_acesso` | **A autenticação real vive aqui** — e `nivel_acesso` é o campo que vai restringir as rotas DELETE (Fase 9) a diretores/cargos de edição |
| Gamificação | `xp_vitalicio`, `pontos_temporarios`, `foguinho`, `streak_atual`, `maior_streak`, `medalha_projetos/eventos/tempo/excelencia`, `musica_url` | Fora do escopo do módulo de projetos, mas explica o user card da sidebar do Hub (streak/foguinho) |
| Integrações | `google_refresh_token`, `google_calendar_email` | O Hub já integra com Google Calendar — relevante para o roadmap de calendário |

### Cargo, área e histórico

- **`plataforma_hub_funcionario_cargos`** (`funcionario_id`, `area_id`, `cargo_nome`): cargo atual por área (N:N — um membro pode ter cargos em áreas diferentes).
- **`plataforma_hub_areas`**: as áreas da empresa (Projetos, Comercial, Gente e Gestão…).
- **`plataforma_hub_trajetoria`** (`funcionario_id`, `cargo_nome`, `area_id`, `data_inicio`, `data_fim`): **histórico de cargos com datas** — dado valioso no futuro para a ficha SIEX (quem ocupava qual cargo em qual período).

### Correspondência com o piloto

`Trabalhador {nome, cargo, emailInstitucional}` ⊂ `funcionarios` + `funcionario_cargos`. Ou seja: **todo o cadastro provisório da tela Membros é dispensável na integração** — os dados já existem no Hub, com mais qualidade (foto, status, contatos, histórico).

## O que mais o schema revelou

### O Hub já tem um módulo (simples) de projetos

| Tabela do Hub | O que tem | O que falta vs. o piloto |
|---|---|---|
| `plataforma_hub_projetos` | `nome`, `tipo` (varchar **livre**), `status` enum com **as mesmas 5 fases do piloto** ('kick-off','em-andamento','finalizacao','ajustes','concluido'), `gerente_id`, `criado_por` | Sem `Gestao` (semestre), sem FK de serviço (tipo é texto solto), sem TAP, sem diretor, sem professor, sem contratante/agregados |
| `plataforma_hub_projeto_consultores` | `projeto_id`, `funcionario_id`, `ordem` | Equipe **plana por projeto** — sem alocação por etapa, sem `data_entrada`/`data_saida` (o dado que a ficha SIEX exige) |
| `plataforma_hub_projeto_etapas` | `projeto_id`, `nome`, `status` enum com **os mesmos 3 valores** ('nao-iniciado','em-andamento','concluido'), `ordem`, `criado_por` | Sem datas, sem dias úteis, sem `bloco_entrega`, sem vínculo a template de catálogo, sem equipe por etapa |

**Conclusão estrutural: a integração não é greenfield.** O Hub já tem o esqueleto (projetos com as mesmas 5 fases; etapas com os mesmos 3 status — os enums até coincidem, mudando só a grafia `kick-off`/`nao-iniciado` vs. `kickoff`/`nao_iniciada`). O caminho natural é **evoluir o schema do Hub na direção do modelo do piloto**: adicionar gestão, catálogo (`Servico`/`EtapaTemplate`), TAP, diretor/contratante, datas + dias úteis + blocos nas etapas, e substituir a equipe plana por `EtapaConsultor` com `data_entrada`/`data_saida` (ADR-002).

### Lacunas que o Hub NÃO cobre

- **`Professor` não existe no Hub** — o orientador externo não é funcionário. O conceito precisará ser levado ao banco do Hub (tabela nova) ou mantido em tabela própria do módulo de projetos. Decisão para a Fase 11, junto com o mantenedor.
- **Gestão (semestre), catálogo de serviços, TAP, blocos, datas de etapa**: inexistentes no Hub — são exatamente o valor agregado do piloto.

### Stack revelado

Tipos `tinyint`/`enum`/`timestamp` e nomes `plataforma_hub_*` indicam **MySQL/MariaDB** (compatível com a hospedagem Hostgator já conhecida). A migração SQLite → MySQL entra no checklist de go-live abaixo. Isso reduz o que o [roadmap](../features/roadmap.md) chamava de "maior risco do roadmap inteiro": o stack de dados deixou de ser desconhecido.

## Definições piloto → produção

### Sai do piloto no go-live (Fase 11)

Tudo abaixo já está marcado no código como provisório:

| Item provisório | Onde está | Substituído por |
|---|---|---|
| Cadastro de colaborador/professor na tela Membros | `FormularioColaborador.jsx`, `FormularioProfessor.jsx` (scaffolding de teste) | Leitura de `plataforma_hub_funcionarios` (+ `funcionario_cargos`/`areas`) |
| User card decorativo da sidebar | `USUARIO_DEMO` em `App.jsx` | Usuário logado real (`senha_hash`/`nivel_acesso`) |
| Sidebar shell decorativa inteira | `ITENS_MENU_HUB` em `App.jsx` | Navegação real do Hub — o piloto vira só as telas acessadas por "Projetos" |
| Avatar por iniciais como fonte única | `AvatarIniciais.jsx` | `foto_url` real do membro (iniciais permanecem como fallback) |
| Tabela `Trabalhador` própria | `banco_de_dados.py` | Leitura de `funcionarios`; `Gestao`/`Servico`/`EtapaTemplate`/`Projeto`/`Etapa`/`EtapaConsultor` migram/estendem o schema do Hub |
| SQLite local | `database.py` (ADR-001) | Banco MySQL/MariaDB do Hub (aí sim com ferramenta de migração — gatilho do ADR-001). **Preparado em 06/07/2026**: `DATABASE_URL` já é lida do ambiente/.env (default SQLite) — no go-live basta apontar para o MySQL |
| CORS aberto (`allow_origins=["*"]`) | `main.py` | CORS restrito ao domínio do Hub. **Preparado em 06/07/2026**: `FRONTEND_ORIGIN` (lista separada por vírgula) já é lida do ambiente/.env (default `*`) |
| `BASE_URL` hardcoded | `services/api.js` | Configuração por ambiente. **Preparado em 06/07/2026**: `VITE_API_URL` já é lida do ambiente Vite (default localhost; ver `frontend/.env.example`) |
| Rotas DELETE abertas (Fase 9) | `routes/projetos.py`/`gestoes.py` | **Exclusivas de diretores/cargos de edição** via `nivel_acesso` |
| Ausência de autenticação | — | Sessão/login do Hub |

### Fica (é o valor que o piloto entrega ao Hub)

- Catálogo de serviços com etapas-template validadas pela diretoria (ADR-005) e o seed correspondente.
- Criação de projeto com etapas editáveis, reordenáveis e com datas (ADR-008); cálculo de dias úteis com feriados nacionais (`workalendar`).
- Entregas em bloco (ADR-009) com os gestos de ligação/extensão/desfazer.
- Status do TAP com edição manual (e a ideia Clicksign no roadmap).
- Kanban em dois níveis (fase do projeto × status da etapa, ADR-003) e as visualizações múltiplas de etapas (Fase 7: tabela, cronograma, calendário).
- A identidade visual — que já é a do Hub.

## Perguntas em aberto para o mantenedor do Hub (levar à Fase 11)

1. Onde o orientador externo (Professor) deve viver no banco do Hub?
2. O módulo `plataforma_hub_projetos`/`projeto_etapas` atual tem dados de produção que precisam ser migrados para o modelo novo, ou pode ser substituído?
3. Como o piloto deve autenticar: sessão compartilhada do Hub, token, ou embed?
4. Existe ambiente de homologação do Hub para testar a integração antes do go-live?
