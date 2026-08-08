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

### 1. Tabela de professores está vazia (crítico)

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

### 2. Aba "Documentos importantes" não existe na galeria de gestões (alto)

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

### 4. Paridade de features das Fases 12–24 precisa ser auditada (a verificar)

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
```

**Antes de rodar:** peça ao Claude do Hub para primeiro rodar `DESCRIBE <tabela>;` (ou
`SHOW CREATE TABLE <tabela>;`) em cada tabela existente e comparar com o DDL acima —
só criar/alterar o que realmente faltar, sem perder dados de produção (gestões e projetos
reais já cadastrados). Colunas que já existem com tipo diferente (ex. `VARCHAR` vs `TEXT`)
não precisam ser alteradas só por estética.

## Resumo executivo (para o Claude do Apoio Hub)

1. **Popular a tabela `professores`** com os 72 professores da FAGEN (bloqueador do
   "Professor orientador" e da aba Professores) — prioridade máxima, é o bug mais visível.
2. **Implementar a aba "Documentos importantes"** (tabela `documentos` + tela + endpoints).
3. **Trocar os emojis ⏳/📅 pelos ícones SVG da marca** nos cards de etapa.
4. **Auditar a paridade das Fases 12–24** feature a feature (lista na seção 4) e reportar de
   volta o que falta antes de declarar a publicação completa.
