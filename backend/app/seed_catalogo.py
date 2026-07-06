"""Seed do catálogo de serviços (Fase 2).

Popula Servico e EtapaTemplate com o catálogo real aprovado pela diretoria
em docs/features/catalogo-servicos.md (aprovação registrada em 04/07).
Os dados NÃO devem ser alterados aqui sem nova validação (ADR-005) — o
documento é a fonte de verdade; este script apenas o transcreve.

Etapas com a mesma `ordem` dentro de um serviço são entregas em bloco
(compartilham o prazo indicado, conforme notas do documento).

Idempotente: serviços já existentes (por nome) são pulados. Rodar de
`backend/` com:

    python -m app.seed_catalogo
"""

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models.banco_de_dados import Base, Servico, EtapaTemplate

# (nome do serviço, descrição, [(ordem, nome da etapa, dias úteis)])
CATALOGO = [
    (
        "Pesquisa de Mercado",
        "Fonte: Proposta Esmalteria (bloco 4.1). Ordem 7 é entrega em "
        "bloco. Total: 73 dias úteis.",
        [
            (1, "Alinhamento e Kick Off", 10),
            (2, "Identificação do Problema", 3),
            (3, "Objetivo Geral da Pesquisa", 3),
            (4, "Definição do Público-alvo e Amostra", 7),
            (5, "Análise de Concorrência", 10),
            (6, "Análise de Tendências", 5),
            (7, "Levantamento de Temas", 5),
            (7, "Instrumento de Pesquisa", 5),
            (8, "Aplicação do Instrumento de Pesquisa", 20),
            (9, "Análise e Tabulação dos Resultados", 10),
        ],
    ),
    (
        "Plano de Marketing",
        "Fonte: Proposta Apoio Consultoria — Brambilla Planejados. "
        "Ordem 6 é entrega em bloco. Total: 81 dias úteis.",
        [
            (1, "Kick Off e Planejamento", 5),
            (2, "Análise de Contexto", 3),
            (3, "Análise de Setor", 7),
            (4, "Análise de Recursos", 5),
            (5, "Análise de Concorrentes e Vantagens Competitivas", 6),
            (6, "Potenciais Parcerias", 10),
            (6, "Jornada do Cliente", 10),
            (7, "Definição do Público-alvo", 5),
            (8, "Persona", 10),
            (9, "Mix de Marketing", 10),
            (10, "Análise Swot", 5),
            (11, "Elaboração de Plano de Ação", 10),
            (12, "Relatório Final", 5),
        ],
    ),
    (
        "Plano de Comunicação",
        "Fonte: Cópia de Proposta Ecocash. Ordens 2, 3 e 4 são entregas "
        "em bloco. Total: 55 dias úteis.",
        [
            (1, "Alinhamento e Kick Off", 5),
            (2, "Contexto e Determinação de Objetivos", 15),
            (2, "Análise Mercadológica", 15),
            (2, "Público-Alvo", 15),
            (3, "Planejamento de Metas", 10),
            (3, "Orçamento de Comunicação", 10),
            (3, "Composto/Mix Promocional", 10),
            (4, "Seleção de Meios e Canais", 20),
            (4, "Elaboração das Mensagens", 20),
            (5, "Elaboração do Relatório Final", 5),
        ],
    ),
    (
        "Plano de Negócios",
        "Fonte: Proposta Filipe. Ordens 3 e 6 são entregas em bloco. "
        "Total: 95 dias úteis.",
        [
            (1, "Alinhamento e Kick Off", 5),
            (2, "Planejamento das Atividades", 5),
            (3, "Análise de Setor", 20),
            (3, "Análise de Mercado", 20),
            (4, "Pesquisa de Mercado", 30),
            (5, "Plano de Marketing", 10),
            (6, "Plano Operacional", 12),
            (6, "Recursos Humanos", 12),
            (7, "Plano Financeiro", 10),
            (8, "Relatório Final", 3),
        ],
    ),
    (
        "Planejamento Estratégico",
        "Fonte: Planejamento Estratégico.pdf (arquivo padrão). "
        "Total: 55 dias úteis.",
        [
            (1, "Planejamento", 5),
            (2, "Análise de Contexto", 15),
            (3, "Definição de Propósito e Valores", 5),
            (4, "Estabelecimento de Objetivos", 5),
            (5, "Formulação de Estratégias", 10),
            (6, "Plano de Ação", 10),
            (7, "Relatório Final", 5),
        ],
    ),
    (
        "Plano Operacional",
        "Fonte: Proposta Central Embalagens. Total: 60 dias úteis.",
        [
            (1, "Alinhamento e Kick Off", 5),
            (2, "Análise de Contexto", 20),
            (3, "Definição de Metas e Indicadores", 5),
            (4, "Layout e Fluxo de Processos", 15),
            (5, "Organograma", 10),
            (6, "Relatório", 5),
        ],
    ),
    (
        "Mapeamento de Processos",
        "Total: 55 dias úteis.",
        [
            (1, "Planejamento das Atividades", 5),
            (2, "Análise de Contexto", 10),
            (3, "Definição de metas e Indicadores", 5),
            (4, "Estruturação dos Processos", 20),
            (5, "Descrição de cargos", 10),
            (6, "Relatório final", 5),
        ],
    ),
    (
        "Cliente Oculto",
        "Fonte: Cliente Oculto.pdf (arquivo padrão). Execução é média "
        "mínima, pode variar por projeto. Total: 35 dias úteis.",
        [
            (1, "Alinhamento e Kick Off", 5),
            (2, "Definição de Objetivos", 2),
            (3, "Definição dos Critérios de Avaliação", 3),
            (4, "Orientação dos Consultores", 5),
            (5, "Execução", 10),
            (6, "Análise", 5),
            (7, "Relatório Final", 5),
        ],
    ),
    (
        "Valuation",
        "Fonte: Proposta Midiática. Serviço novo — cronograma baseado na "
        "única proposta realizada. Ordem 3 é entrega em bloco. "
        "Total: 58 dias úteis.",
        [
            (1, "Kick-off e Alinhamento", 5),
            (2, "Análise de Contexto", 5),
            (3, "Análise de Setor", 15),
            (3, "Análise de Mercado", 15),
            (4, "Análise dos Intangíveis", 15),
            (5, "Previsibilidade e Escalabilidade da Receita", 15),
            (6, "Relatório Final", 3),
        ],
    ),
]


def seed(db: Session) -> dict:
    """Insere o catálogo; pula serviços cujo nome já existe.

    Retorna {"criados": [...], "pulados": [...]}.
    """
    criados, pulados = [], []
    for nome, descricao, etapas in CATALOGO:
        existente = db.query(Servico).filter(Servico.nome == nome).first()
        if existente is not None:
            pulados.append(nome)
            continue
        servico = Servico(nome=nome, descricao=descricao)
        db.add(servico)
        db.flush()
        for ordem, nome_etapa, dias in etapas:
            db.add(
                EtapaTemplate(
                    servico_id=servico.id,
                    ordem=ordem,
                    nome=nome_etapa,
                    descricao_padrao=None,
                    dias_uteis_esperados_padrao=dias,
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
