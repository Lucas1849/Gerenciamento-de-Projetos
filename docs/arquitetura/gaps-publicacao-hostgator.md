# Gaps entre o piloto (FastAPI/React) e a publicação no Apoio Hub (Hostgator)

> Documento gerado em 15/07/2026 a partir de inspeção visual do ambiente publicado
> (`https://apoioconsultoriajunior.com.br/ApoioHub/projetos`) via navegador, comparando
> com o comportamento esperado deste repositório (`empresa-projetos`). Destinado a orientar
> o Claude que auxilia o dono do Apoio Hub a corrigir o que faltou/veio errado na publicação.
>
> **Achado importante sobre a arquitetura da publicação:** o Apoio Hub publicado **não roda
> o backend FastAPI/SQLite deste repositório**. As chamadas de rede do frontend publicado vão
> para endpoints PHP (`/ApoioHub/api/proj_get_professores.php`, `proj_get_projetos.php`,
> `proj_get_catalogo.php`, etc.), típicos de hospedagem compartilhada Hostgator (PHP + MySQL).
> Ou seja, o módulo de Projetos foi **portado/reimplementado em PHP consumindo um banco MySQL**,
> replicando o schema deste repo (`backend/app/models/banco_de_dados.py`) — não é o mesmo
> processo Python. Isso explica por que os comandos para criar tabelas precisam ser **SQL
> (DDL para MySQL/MariaDB)**, não Alembic/SQLAlchemy.

---

## Atualização de 23/08/2026 — auditoria por código + teste do ambiente publicado

> **Mudança de método, e ela importa.** O documento original (15/07/2026) nasceu de **inspeção visual** do site publicado, e por isso a seção 4 lista as Fases 12–24 como "a verificar". Desde então o repositório do Hub passou a estar disponível localmente em `C:\Users\lukin\Vs Projects\ApoioHub` (PHP em `api/proj_*.php`, React em `src/components/projetos/`), o que permite **auditar por código** — definitivo, e sem tocar em produção.
>
> **Armadilha registrada:** o working tree do repo do Hub estava com a branch `feat/fase-27-meus-projetos-seletor-fase` em checkout. **Ver um arquivo no diretório não significa que ele está publicado** — o que vale é o que está em **`main`**. Toda afirmação abaixo foi verificada com `git cat-file -e main:<arquivo>`, não com `ls`.

### Como cada achado foi verificado

| Método | Alcance |
|---|---|
| **Leitura de código em `main`** | presença de endpoints, campos das respostas, lógica de calendário |
| **Teste ao vivo, GET sem autenticação** | `proj_calendario_data_fim.php` no ambiente publicado, comparado com o piloto rodando local como oráculo |
| **Não verificado** (exige sessão logada) | dados de produção (gap 1) e fluxos de UI — o gaps doc segue dependendo disso |

### Paridade do calendário: verificada ao vivo, 5 de 5

O plano da Fase 29 partia de que "o Hub não tem workalendar" e que a fonte de feriados seria **o maior trabalho do port**. **Não é.** `api/proj_calendario_lib.php` está em `main` e transcreve o calendário inteiro do piloto: Páscoa por Meeus/Jones/Butcher, Sexta-feira Santa e Corpus Christi (móveis), os dois municipais de Uberlândia (15/08 e 31/08), convenção **inclusiva** (ADR-018) e o teto anti-DoS `PROJ_MAX_DIAS_UTEIS = 2000` (mesmo hardening do piloto).

Testado contra o **ambiente publicado**, com o piloto local como oráculo:

| Caso | Piloto (workalendar) | Hub publicado | |
|---|---|---|---|
| 28/08/2026 + 3 dias úteis — **31/08 Aniversário de Uberlândia** (municipal) | 02/09 | 02/09 | ✅ |
| 02/06/2026 + 3 — **04/06 Corpus Christi** (móvel) | 05/06 | 05/06 | ✅ |
| 02/04/2026 + 2 — **03/04 Sexta-feira Santa** (móvel) | 06/04 | 06/04 | ✅ |
| 04/09/2026 + 2 — **07/09 Independência** (nacional, controle) | 08/09 | 08/09 | ✅ |
| 16/02/2026 + 3 — **Carnaval, que NÃO é feriado** | 18/02 | 18/02 | ✅ |

O último caso é o que descarta coincidência: bate inclusive no que **não** é feriado. **A Fase 23 (ADR-025) está portada e no ar.**

### O que a auditoria de código fechou

| Fase | Item | Situação em `main` |
|---|---|---|
| 12 (ADR-014) | cascata de datas, edição de etapa | ✅ `proj_calendario_cascata.php`, `proj_editar_etapa.php`, `proj_reordenar_etapas.php` |
| 13 (ADR-015) | dependências + Cronograma interativo | ✅ `proj_criar_dependencia.php`, `proj_deletar_dependencia.php`, `CronogramaEtapas.jsx` |
| 16 (ADR-018) | dia útil inclusivo | ✅ documentado e implementado em `proj_calendario_lib.php`; confirmado pelos testes acima |
| 17 (ADR-019) | termos aditivos | ✅ `proj_criar_termo.php`, `proj_anexar_doc_termo.php`, `proj_deletar_termo.php`, `ModalTermoAditivo.jsx` |
| 19 (ADR-021) | links de entrega/demanda | ✅ `proj_criar_link_etapa.php`, `proj_deletar_link_etapa.php` |
| 22 (ADR-024) | galeria de projetos | ✅ `GaleriaProjetos.jsx` |
| 23 (ADR-025) | feriados municipais | ✅ **verificado ao vivo** (tabela acima) |
| 24 (ADR-026) | data final editável na criação | ✅ `proj_calendario_dias_uteis.php` + `EtapasEditor.jsx` |
| **26/27 (ADR-029/030)** | seletor de fase no card + "Meus projetos" | ⚠️ **NÃO está em `main`** — ver abaixo |
| 18 (ADR-020) | Documentos importantes | ❌ **confirmado ausente** — nenhum endpoint de `documentos` em `api/` |
| **28 (ADR-031/032/033)** | gerador de calendário de kick-off | ❌ não portado (esperado — é a Fase 29) |

**A seção 4 deste documento ("paridade das Fases 12–24 a verificar") está portanto respondida**, exceto pelo que depende de dado de produção.

### Fase 27 está em PR de teste, não publicada

`SeletorFase.jsx` existe no diretório, mas **não em `main`** — o commit `c02c6ca` ("feat: Fase 27 — filtro 'Meus projetos' e seletor de fase no card") vive só na branch `feat/fase-27-meus-projetos-seletor-fase`, que está pushed para o origin e **aguardando merge**. É exatamente o padrão "PR de teste" do [plano-fases-25-27.md](../features/plano-fases-25-27.md).

Escopo do PR pendente: **4 arquivos, 262 inserções** — `SeletorFase.jsx` (novo), `GaleriaProjetos.jsx`, `VisaoGeral.jsx`, `src/pages/Projetos.jsx`.

### Achado novo — os nomes dos feriados divergem (vai para o slide do cliente)

O Hub tem os nomes apenas como **comentário** no PHP; o piloto os tem como dado (`NOMES_FERIADOS_PT`), e eles entram na legenda do calendário de kick-off ("Feriado - Independência do Brasil"). Quando a Fase 29 criar o endpoint de listagem, usar os comentários existentes produziria **texto diferente nas duas stacks para o mesmo projeto**:

| Data | Piloto (correto, vai ao slide) | Hub (comentário atual) |
|---|---|---|
| 07/09 | Independência **do Brasil** | Independência |
| 12/10 | **Nossa Senhora** Aparecida | N. Sra. Aparecida |
| 15/08 | Nossa Senhora da Abadia **(padroeira de Uberlândia)** | N. Sra. da Abadia (Uberlândia) |

O piloto também lista **Páscoa (05/04)**, ausente no Hub — inofensivo (cai no domingo e o frontend nunca pinta feriado de fim de semana), mas o endpoint deve ser escrito sabendo disso.

### Observação de segurança (sem alarme)

`proj_calendario_data_fim.php` respondeu **sem nenhuma sessão** — o teste acima foi feito de um navegador sem login no Hub. É um endpoint de cálculo público em produção. Está limitado por `PROJ_MAX_DIAS_UTEIS = 2000`, então o vetor de DoS que o hardening do piloto fechou em 12/07/2026 está capado ali também. Registrado em [hardening-producao.md](hardening-producao.md); não é incidente.

---

## O que está OK

- Tema escuro, cores de marca (indigo `#6C5CE7`), tipografia e grid da galeria de projetos
  batem com o design system do piloto (`App.css`).
- Fluxo de navegação (Gestões → galeria de projetos com badge de fase e filtros → página do
  projeto → abas Etapas/Visão Geral → sub-abas Por status/Tabela/Cronograma/Calendário)
  está presente e funcional.
- Membros usa fotos reais da equipe (dado que só existe no Hub, correto por design).
- Bloco de entrega, drag do Cronograma, badges de fase e TAP aparecem corretamente na tela
  testada.

## Gaps encontrados

### 1. Tabela de professores está vazia (crítico) — *não reverificado em 23/08/2026*

> Este gap é de **dado de produção**, não de código: só se confirma com sessão logada no Hub. A auditoria de 23/08/2026 foi por código + endpoint público, então **não o revalidou** — segue como estava.

**Onde:** aba "Projetos" → "Professores" mostra "Nenhum professor cadastrado"; no formulário
de "Visão Geral" de um projeto, o campo "Professor orientador" só oferece "— Sem professor —".

**Causa provável:** a tabela `professores` existe no MySQL (a consulta
`proj_get_professores.php` responde 200 OK, só que com lista vazia), mas nunca foi populada.
No piloto isso equivale a rodar `python -m app.seed_professores` (Fase 21, ADR-023) — os 72
professores da FAGEN, incluindo `interesse_orientar` e `servico_interesse` — que aqui exige
um `INSERT` equivalente em MySQL, com os dados que hoje vivem no arquivo gitignored
`backend/app/dados/professores_seed.json` (distribuído por OneDrive; formato documentado em
`backend/app/dados/professores_seed.exemplo.json`).

**O que o Claude do dono do Hub precisa fazer:**
1. Confirmar que a tabela `professores` no MySQL tem as colunas do schema abaixo (seção SQL).
2. Pedir ao responsável o arquivo `professores_seed.json` (ou planilha equivalente) com os
   72 professores da FAGEN.
3. Gerar os `INSERT INTO professores (...) VALUES (...)` a partir desse arquivo (mesmo texto
   de `nome`, `email`, `servico_interesse`, `contato`, `observacoes`,
   `interesse_orientar` — `1`/`0`/`NULL`).
4. Confirmar que o catálogo de serviços (`servicos`/`etapas_template`, Fase 2) também foi
   semeado — `proj_get_catalogo.php` respondeu 200 com dados, então isso já está OK; só
   professores está faltando.

### 2. Aba "Documentos importantes" não existe na galeria de gestões (alto) — ❌ **CONFIRMADO ABERTO** (23/08/2026)

> Confirmado por código: não há nenhum endpoint de `documentos` em `api/`. Segue valendo integralmente.

**Onde:** a galeria de gestões (`/ApoioHub/projetos`) só mostra as abas "Gestões" e
"Professores". Falta a terceira aba **"Documentos importantes"** (Fase 18, ADR-020): lista
de links nomeados do Drive, sem vínculo com gestão/projeto específico.

**O que fazer:** implementar a tela e os endpoints correspondentes à tabela `documentos`
(ver DDL abaixo) — listar (`GET`), criar (`POST`, valida URL http/https) e excluir
(`DELETE /documentos/{id}`) — e adicionar a aba no frontend publicado.

### 3. Ícones de prazo/data usam emoji em vez dos ícones SVG da marca (médio, visual)

**Onde:** nos cards de etapa (Kanban "Por status"), o ícone ao lado de "Prazo: N dia(s)
útil(eis)" aparece como ampulheta emoji (⏳) e o ícone da data como calendário emoji (📅).

**Esperado:** desde a Fase 15 (ADR-017) o piloto usa ícones SVG próprios da marca
(`IconePrazo`/`IconeData` em `frontend/src/components/Icones.jsx`), não emojis do sistema
operacional — o motivo original era justamente consistência visual entre dispositivos/SO.

**O que fazer:** localizar no bundle publicado (`assets/Projetos-*.js`) o componente que
renderiza o card de etapa e trocar os emojis pelos SVGs equivalentes (ou recriá-los —
são ícones simples de contorno, sem texto, coerentes com a paleta indigo/branco do tema).

### 4. Paridade de features das Fases 12–24 — ✅ **AUDITADA em 23/08/2026**

> **Respondida** na seção "Atualização de 23/08/2026", por leitura de `main` + teste ao vivo do calendário. Resultado: **todas as Fases 12–24 estão em `main`**, incluindo os feriados municipais de Uberlândia (verificados 5/5 contra o piloto). O texto abaixo fica como registro do que se pediu auditar.

Não foi possível confirmar em uma sessão de inspeção visual se todas as features abaixo
existem no ambiente publicado (podem ter sido portadas parcialmente para o PHP). Vale um
levantamento explícito comparando com os endpoints do piloto:

- Fase 12 (ADR-014): cascata de datas na criação (`POST /calendario/cascata`), edição via
  modal (`PATCH /etapas/{id}`), reordenação de etapas.
- Fase 13 (ADR-015): dependências entre etapas (bloqueada-por/bloqueando) e Cronograma
  interativo (arrastar barra, redimensionar, conectar dependência).
- Fase 16 (ADR-018): convenção de dia útil inclusiva (dia de início conta como dia 1).
- Fase 17 (ADR-019): termos aditivos por bloco de entrega (`TermoAditivo`).
- Fase 19 (ADR-021): links de entrega/demanda por etapa (`EtapaLink`).
- Fase 23 (ADR-025): feriados **municipais de Uberlândia** (Sexta-feira Santa, Corpus
  Christi, 15/08, 31/08) no cálculo de datas — se o PHP usa outra biblioteca de calendário,
  precisa reimplementar essas quatro datas manualmente (o piloto usa `workalendar` com uma
  subclasse `Uberlandia(BrazilMinasGerais)`).
- Fase 24 (ADR-026): campo de data final editável na criação do projeto (converte para
  dias úteis automaticamente).

Recomendação: pedir ao Claude do Hub para testar cada fluxo manualmente (criar projeto,
editar etapa, criar termo aditivo, criar link, checar se datas pulam feriados municipais)
e reportar o que já existe vs. o que falta, antes de assumir que está tudo implementado.

## DDL de referência (MySQL) — schema alvo (ADR-001 a ADR-026)

Tradução direta de `backend/app/models/banco_de_dados.py` para MySQL/MariaDB. Ajustar tipos
conforme o que já existe no banco do Hub (idealmente **auditar as tabelas existentes antes de
rodar isto** — não sobrescrever dados reais). `AUTO_INCREMENT` assume MySQL 8+/MariaDB.

```sql
CREATE TABLE IF NOT EXISTS trabalhadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(255) NOT NULL,
  emailInstitucional VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS professores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  servico_interesse VARCHAR(500) NULL,
  contato VARCHAR(255) NULL,
  observacoes TEXT NULL,
  interesse_orientar BOOLEAN NULL
);

CREATE TABLE IF NOT EXISTS gestoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  ativa BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS servicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT NULL
);

CREATE TABLE IF NOT EXISTS etapas_template (
  id INT AUTO_INCREMENT PRIMARY KEY,
  servico_id INT NOT NULL,
  ordem INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao_padrao TEXT NULL,
  dias_uteis_esperados_padrao INT NULL,
  FOREIGN KEY (servico_id) REFERENCES servicos(id)
);

CREATE TABLE IF NOT EXISTS projetos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  objetivo TEXT NULL,
  nome_contratante VARCHAR(255) NULL,
  agregados_contratante TEXT NULL,
  servico_id INT NOT NULL,
  gestao_id INT NOT NULL,
  fase VARCHAR(20) NOT NULL DEFAULT 'kickoff',
  tap_assinado BOOLEAN NOT NULL DEFAULT FALSE,
  gerente_id INT NOT NULL,
  diretor_id INT NOT NULL,
  professor_orientador_id INT NULL,
  FOREIGN KEY (servico_id) REFERENCES servicos(id),
  FOREIGN KEY (gestao_id) REFERENCES gestoes(id),
  FOREIGN KEY (gerente_id) REFERENCES trabalhadores(id),
  FOREIGN KEY (diretor_id) REFERENCES trabalhadores(id),
  FOREIGN KEY (professor_orientador_id) REFERENCES professores(id)
);

CREATE TABLE IF NOT EXISTS etapas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL,
  etapa_template_id INT NULL,
  ordem INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  dias_uteis_esperados INT NULL,
  data_inicio DATE NULL,
  bloco_entrega VARCHAR(36) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'nao_iniciada',
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
  FOREIGN KEY (etapa_template_id) REFERENCES etapas_template(id)
);

CREATE TABLE IF NOT EXISTS etapa_consultores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etapa_id INT NOT NULL,
  trabalhador_id INT NOT NULL,
  data_entrada DATE NOT NULL,
  data_saida DATE NULL,
  FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE CASCADE,
  FOREIGN KEY (trabalhador_id) REFERENCES trabalhadores(id)
);

CREATE TABLE IF NOT EXISTS etapa_dependencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etapa_id INT NOT NULL,
  bloqueada_por_id INT NOT NULL,
  UNIQUE KEY uq_dependencia_par (etapa_id, bloqueada_por_id),
  FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE CASCADE,
  FOREIGN KEY (bloqueada_por_id) REFERENCES etapas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS termos_aditivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etapa_id INT NOT NULL,
  dias_adicionais INT NOT NULL,
  motivo VARCHAR(500) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  documento_url VARCHAR(1000) NULL,
  FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS etapa_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  etapa_id INT NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (etapa_id) REFERENCES etapas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Fase 28 (ADR-031) — estilização do gerador de calendário de kick-off.
-- Necessária só quando a Fase 29 (port do gerador) for executada.
CREATE TABLE IF NOT EXISTS calendario_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id INT NOT NULL UNIQUE,
  cores TEXT NOT NULL,
  CONSTRAINT fk_calconfig_projeto FOREIGN KEY (projeto_id)
    REFERENCES projetos(id) ON DELETE CASCADE
);
```

**Antes de rodar:** peça ao Claude do Hub para primeiro rodar `DESCRIBE <tabela>;` (ou
`SHOW CREATE TABLE <tabela>;`) em cada tabela existente e comparar com o DDL acima —
só criar/alterar o que realmente faltar, sem perder dados de produção (gestões e projetos
reais já cadastrados). Colunas que já existem com tipo diferente (ex. `VARCHAR` vs `TEXT`)
não precisam ser alteradas só por estética.

## Resumo executivo (para o Claude do Apoio Hub)

*Atualizado em 23/08/2026 após a auditoria por código + teste do publicado.*

1. **Popular a tabela `professores`** com os 72 professores da FAGEN (bloqueador do
   "Professor orientador" e da aba Professores) — prioridade máxima, é o bug mais visível.
   **Único gap que a auditoria de 23/08 não pôde reverificar** (é dado de produção, exige
   sessão logada).
2. **Implementar a aba "Documentos importantes"** (tabela `documentos` + tela + endpoints) —
   ❌ confirmado ausente por código.
3. **Trocar os emojis ⏳/📅 pelos ícones SVG da marca** nos cards de etapa.
4. ~~Auditar a paridade das Fases 12–24~~ — ✅ **feito em 23/08/2026**: todas em `main`,
   incluindo os feriados municipais de Uberlândia, verificados **5/5 ao vivo** contra o
   piloto. Nada a fazer aqui.
5. **Mergear o PR da Fase 27** (`feat/fase-27-meus-projetos-seletor-fase`, 4 arquivos) —
   está pushed e parado; o seletor de fase e o filtro "Meus projetos" **não estão no ar**.
6. **Quando a Fase 29 for executada:** criar a tabela `calendario_config` (DDL acima) e um
   `proj_get_feriados.php` que exponha o `proj_feriados()` que já existe — **usando os nomes
   PT-BR do piloto**, não os comentários do PHP (a divergência está registrada acima; esse
   texto vai para o slide do cliente).
