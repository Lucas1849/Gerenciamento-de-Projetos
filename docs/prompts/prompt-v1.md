# Prompt v1 — Contexto Fundacional do Produto

Registro do contexto original que fundamenta este projeto, usado como base para o plano de continuidade em [../arquitetura/decisoes.md](../arquitetura/decisoes.md) e [../arquitetura/visao-geral.md](../arquitetura/visao-geral.md). Mantido aqui para referência histórica — se este contexto mudar, atualizar este arquivo e revisar as decisões que dependem dele.

## Contexto Apoio Consultoria

A Apoio Consultoria presta serviço para empresas que precisam resolver suas dificuldades relacionadas a marketing, processos e estratégia. A cartela de serviços é: Pesquisa de Mercado, Plano de Marketing, Plano de Comunicação, Plano de Negócios, Planejamento Estratégico, Plano Operacional, Mapeamento de Processos e Cliente Oculto.

A aplicação tem a finalidade de melhorar os processos realizados pelos gerentes na realização dos projetos. Features gerais esperadas (ver detalhamento e status em [../features/roadmap.md](../features/roadmap.md)):
- Gerar calendário estilizado automático mostrando os dias úteis de cada etapa, feriados e período de férias da universidade.
- Gerar ficha de cadastro de projeto de extensão automático no SIEX da universidade com as informações do projeto.
- Descrição dos pontos fortes dos membros para facilitar a alocação de consultores nas demandas.

## Regras de negócio

A organização de uma equipe de projetos é feita pela diretoria da área, com alocação inicial de um gerente e três consultores por projeto, além da procura de um professor orientador para manter a qualidade do projeto. Mesmo iniciando com 3 consultores, um projeto pode ter consultores temporários ao longo do tempo — fundamental para a feature do SIEX automático. Uma etapa pode ser realizada por 3 consultores, mais consultores, ou pela empresa toda (ex.: aplicação de uma pesquisa de mercado).

Papéis:
- **Diretora:** aloca a equipe, controla prazos de cada etapa, valida entregas e o correto andamento dos processos.
- **Gerente:** estipula os dias úteis de cada etapa, descreve as demandas de cada consultor, gerencia a construção das demandas, envia a demanda para o professor orientador validar, e comunica a entrega ao cliente.
- **Consultores:** realizam as atividades estipuladas pelos gerentes, seguindo metodologias e orientações do professor.

A aplicação centraliza o andamento e a documentação dos projetos.

## Página — organização esperada

Mantendo a identidade visual do Apoio Hub (plataforma centralizadora já existente, hospedada no Hostgator, com tabelas de colaboradores e login):

- **Galeria:** projetos organizados por gestão (ex. "2026.1", "2025.2"), no mesmo padrão de visualização por gestão já usado para membros no Apoio Hub.
- **Dentro de uma gestão:** Kanban das etapas em que cada projeto está — kick-off, em andamento, finalização, ajustes, concluído.
- **Dentro de um projeto:** nome do projeto, tipo de serviço, etapas do projeto (cada uma com número indefinido de consultores atribuídos, podendo ser qualquer membro cadastrado), e a equipe alocada.
- **Etapas padrão automáticas:** cada tipo de serviço tem etapas pré-definidas — não é necessário criá-las manualmente. Ao criar um projeto e escolher o serviço em um menu suspenso, as etapas padrão são carregadas automaticamente com dias úteis e descrição pré-preenchidos (editáveis).

## Status

Este contexto deu origem ao [plano de continuidade](../arquitetura/decisoes.md) que reconstrói o modelo de dados e a navegação do piloto para suportar o que está descrito acima. Decisões específicas de design (equipe flexível por etapa, dois níveis de Kanban, papéis de pessoa, etc.) estão documentadas em `decisoes.md`, não repetidas aqui.
