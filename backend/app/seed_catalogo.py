"""Seed do catálogo de serviços (Fase 2; sincronizado na Fase 31, ADR-035).

Popula Servico e EtapaTemplate com o catálogo real transcrito de
docs/features/catalogo-servicos.md — escopos oficiais de 12/10/2026, com as
nove decisões Q1-Q9 já aplicadas (resolvidas em 16/10/2026, por comando
direto do responsável). Os dados NÃO devem ser alterados aqui sem nova
validação (ADR-005) — o documento é a fonte de verdade; este script apenas
o transcreve.

Etapas com a mesma `ordem` dentro de um serviço são entregas em bloco
(compartilham o prazo indicado, conforme notas do documento).

Idempotente: serviços já existentes (por nome) são pulados — por isso
sincronizar este catálogo exige o fluxo destrutivo ADR-001 (apagar o .db e
re-semear), não basta rodar de novo. Rodar de `backend/` com:

    python -m app.seed_catalogo
"""

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models.banco_de_dados import Base, Servico, EtapaTemplate

# (nome do serviço, descrição, ofertável,
#  [(ordem, nome da etapa, dias úteis, fase_escopo)])
CATALOGO = [
    (
        "Pesquisa de Mercado",
        "Fonte: escopos oficiais 12/10/2026 (tabela de Cronograma de "
        "Atividades). Ordens 2, 3, 4 e 5 são entregas em bloco. "
        "Total: 80 dias úteis.",
        True,
        [
            (1, "Alinhamento e Kick Off", 5, "alinhamento"),
            (2, "Identificação do Problema", 5, "diagnostico"),
            (2, "Objetivo Geral da Pesquisa", 5, "diagnostico"),
            (3, "Definição do Público-Alvo e Amostra", 15, "diagnostico"),
            (3, "Análise de Concorrência", 15, "diagnostico"),
            (4, "Análise de Tendências", 10, "diagnostico"),
            # Q2 (ADR-035): a mesma etapa é Estratégia no Plano de Marketing
            # — fase é por serviço, não por nome de etapa.
            (4, "Potenciais Parcerias", 10, "diagnostico"),
            (5, "Levantamento de Temas", 10, "estrategia"),
            (5, "Instrumento de Pesquisa", 10, "estrategia"),
            (6, "Aplicação do Instrumento de Pesquisa", 25, "acao"),
            (7, "Tabulação e Análise dos Resultados", 10, "acao"),
        ],
    ),
    (
        "Plano de Marketing",
        "Fonte: escopos oficiais 12/10/2026. Sem blocos. Ordens 6/7 "
        "invertidas (Q6, ADR-035) para preservar continuidade de fase (P1). "
        "Total: 85 dias úteis.",
        True,
        [
            (1, "Alinhamento e Kick Off", 5, "alinhamento"),
            (2, "Análise de Contexto", 2, "diagnostico"),
            (3, "Análise de Setor", 10, "diagnostico"),
            (4, "Análise de Recursos", 5, "diagnostico"),
            (5, "Análise de Concorrentes e Vantagens Competitivas", 10, "diagnostico"),
            (6, "Definição do Público-alvo", 5, "diagnostico"),
            (7, "Potenciais Parcerias", 5, "estrategia"),
            (8, "Persona", 10, "estrategia"),
            (9, "Jornada do Cliente", 5, "estrategia"),
            (10, "Mix de Marketing", 10, "estrategia"),
            (11, "Análise Swot", 5, "estrategia"),
            (12, "Elaboração de Plano de Ação", 10, "acao"),
            (13, "Relatório Final", 3, "acao"),
        ],
    ),
    (
        "Plano de Comunicação",
        "Fonte: escopos oficiais 12/10/2026. Ordens 2, 3 e 4 são entregas "
        "em bloco. Total: 53 dias úteis (Q7, ADR-035 — soma das linhas; o "
        "'60' do documento oficial é erro aritmético da fonte).",
        True,
        [
            (1, "Alinhamento e Kick Off", 5, "alinhamento"),
            (2, "Contexto e Determinação de Objetivos", 15, "diagnostico"),
            (2, "Análise Mercadológica/Externa", 15, "diagnostico"),
            (2, "Público-Alvo", 15, "diagnostico"),
            (3, "Planejamento de Ações e Metas", 15, "estrategia"),
            (3, "Orçamento de Comunicação", 15, "estrategia"),
            (3, "Composto/Mix Promocional", 15, "estrategia"),
            # Q3 (ADR-035): o bloco 4 fica Estratégia para as duas etapas —
            # P2 proíbe dividir o mesmo bloco em fases diferentes.
            (4, "Elaboração das Mensagens", 15, "estrategia"),
            (4, "Seleção de Meios e Canais", 15, "estrategia"),
            (5, "Elaboração do Relatório Final", 3, "acao"),
        ],
    ),
    (
        "Plano de Negócios",
        "Fonte: escopos oficiais 12/10/2026 (tabela de cronograma, Q8 "
        "ADR-035). Ordens 3 e 4 são entregas em bloco. Saíram Pesquisa de "
        "Mercado e Plano de Marketing do escopo. Total: 65 dias úteis.",
        True,
        [
            (1, "Alinhamento e Kick Off", 5, "alinhamento"),
            (2, "Planejamento das Atividades", 5, "alinhamento"),
            (3, "Análise de Setor", 15, "diagnostico"),
            (3, "Análise de Mercado", 15, "diagnostico"),
            (4, "Plano Operacional", 20, "estrategia"),
            (4, "Recursos Humanos", 20, "estrategia"),
            (5, "Plano Financeiro", 15, "estrategia"),
            (6, "Relatório Final", 5, "acao"),
        ],
    ),
    (
        "Planejamento Estratégico",
        "Fonte: Planejamento Estratégico.pdf (arquivo padrão). Inalterado "
        "em 12/10 — único serviço idêntico ao catálogo de 04/07. "
        "Total: 55 dias úteis.",
        True,
        [
            (1, "Planejamento", 5, "alinhamento"),
            (2, "Análise de Contexto", 15, "diagnostico"),
            (3, "Definição de Propósito e Valores", 5, "estrategia"),
            (4, "Estabelecimento de Objetivos", 5, "estrategia"),
            (5, "Formulação de Estratégias", 10, "estrategia"),
            (6, "Plano de Ação", 10, "acao"),
            (7, "Relatório Final", 5, "acao"),
        ],
    ),
    (
        "Plano Operacional",
        "Fonte: escopos oficiais 12/10/2026. Sem blocos. Saiu Alinhamento "
        "e Kick Off do escopo (fase Alinhamento fica vazia — Q1, ADR-035: "
        "a fase vazia aparece, não é omitida). Total: 60 dias úteis.",
        True,
        [
            (1, "Análise de Contexto", 10, "diagnostico"),
            (2, "Definição de Metas e Indicadores", 5, "estrategia"),
            (3, "Layout e Fluxo de Processos", 15, "estrategia"),
            (4, "Capacidade Produtiva", 15, "estrategia"),
            (5, "Organograma", 10, "estrategia"),
            (6, "Relatório", 5, "acao"),
        ],
    ),
    (
        "Mapeamento de Processos",
        "Fonte: escopos oficiais 12/10/2026. Sem blocos. Reestruturado de "
        "6 para 5 etapas; fase Alinhamento vazia (Q1). Mapeamento da "
        "Estrutura Organizacional e Mapeamento de Processos são Diagnóstico "
        "(Q4, ADR-035 — levantamento do como-é, não desenho de solução). "
        "Total: 65 dias úteis.",
        True,
        [
            (1, "Análise de Contexto", 10, "diagnostico"),
            (2, "Mapeamento da Estrutura Organizacional", 20, "diagnostico"),
            (3, "Mapeamento de Processos", 20, "diagnostico"),
            (4, "Revisão de Processos", 10, "estrategia"),
            (5, "Relatório Final", 5, "acao"),
        ],
    ),
    (
        "Cliente Oculto",
        "Fonte: Cliente Oculto.pdf (arquivo padrão). Execução é média "
        "mínima, pode variar por projeto. 'Alinhamento e Kick Off' virou "
        "'Planejamento' em 12/10. Fase Diagnóstico vazia (Q1). "
        "Total: 35 dias úteis.",
        True,
        [
            (1, "Planejamento", 5, "alinhamento"),
            (2, "Definição de Objetivos", 2, "alinhamento"),
            (3, "Definição dos Critérios de Avaliação", 3, "estrategia"),
            (4, "Orientação dos Consultores", 5, "estrategia"),
            (5, "Execução", 10, "acao"),
            (6, "Análise", 5, "acao"),
            (7, "Relatório Final", 5, "acao"),
        ],
    ),
    (
        "Valuation",
        "Fonte: Proposta Midiática (escopo de 24/09, não coberto pelos "
        "escopos oficiais de 12/10 — 'não é serviço oficial'). Serviço "
        "LEGADO, não ofertável (Q5, ADR-035): preservado porque o projeto "
        "#6 (Midiática) está em andamento usando-o; oculto do catálogo "
        "oferecido a projetos novos. Ordem 3 é entrega em bloco. "
        "Total: 58 dias úteis.",
        False,
        [
            (1, "Kick-off e Alinhamento", 5, "alinhamento"),
            (2, "Análise de Contexto", 5, "diagnostico"),
            (3, "Análise de Setor", 15, "diagnostico"),
            (3, "Análise de Mercado", 15, "diagnostico"),
            (4, "Análise dos Intangíveis", 15, "estrategia"),
            (5, "Previsibilidade e Escalabilidade da Receita", 15, "estrategia"),
            (6, "Relatório Final", 3, "acao"),
        ],
    ),
]


def seed(db: Session) -> dict:
    """Insere o catálogo; pula serviços cujo nome já existe.

    Retorna {"criados": [...], "pulados": [...]}.
    """
    criados, pulados = [], []
    for nome, descricao, ofertavel, etapas in CATALOGO:
        existente = db.query(Servico).filter(Servico.nome == nome).first()
        if existente is not None:
            pulados.append(nome)
            continue
        servico = Servico(nome=nome, descricao=descricao, ofertavel=ofertavel)
        db.add(servico)
        db.flush()
        for ordem, nome_etapa, dias, fase_escopo in etapas:
            db.add(
                EtapaTemplate(
                    servico_id=servico.id,
                    ordem=ordem,
                    nome=nome_etapa,
                    descricao_padrao=None,
                    dias_uteis_esperados_padrao=dias,
                    fase_escopo=fase_escopo,
                )
            )
        criados.append(nome)
    db.commit()
    return {"criados": criados, "pulados": pulados}


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        resultado = seed(db)
    finally:
        db.close()
    for nome in resultado["criados"]:
        print(f"criado: {nome}")
    for nome in resultado["pulados"]:
        print(f"pulado (já existe): {nome}")
    print(
        f"{len(resultado['criados'])} serviço(s) criado(s), "
        f"{len(resultado['pulados'])} pulado(s)."
    )


if __name__ == "__main__":
    main()
