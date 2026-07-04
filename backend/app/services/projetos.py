"""Regra de negócio central: criação de projeto com cascade.

Ao criar um projeto, o backend:
  1. Cria o Projeto.
  2. Gera uma Etapa para cada EtapaTemplate do Servico escolhido
     (copiando nome, descrição e dias úteis padrão do template).
  3. Atribui cada consultor inicial a TODAS as etapas geradas, criando
     uma linha em EtapaConsultor por (etapa, consultor) com
     data_entrada = hoje (ADR-002).

Ver docs/features/modelo-dados.md ("Fluxo de criação de projeto").
"""

from datetime import date

from sqlalchemy.orm import Session

from app.models.banco_de_dados import (
    Projeto,
    Servico,
    EtapaTemplate,
    Etapa,
    EtapaConsultor,
)
from app import schemas


def criar_projeto(db: Session, dados: "schemas.ProjetoCriar") -> Projeto:
    """Cria o projeto, gera etapas a partir do template e atribui consultores.

    Levanta ValueError se o servico_id não existir. Não faz commit implícito
    além do necessário — deixa o objeto persistido e recarregado.
    """
    servico = db.get(Servico, dados.servico_id)
    if servico is None:
        raise ValueError(f"Servico id={dados.servico_id} não encontrado")

    projeto = Projeto(
        nome=dados.nome,
        descricao=dados.descricao,
        objetivo=dados.objetivo,
        nome_contratante=dados.nome_contratante,
        agregados_contratante=dados.agregados_contratante,
        servico_id=dados.servico_id,
        gestao_id=dados.gestao_id,
        fase=dados.fase,
        tap_assinado=dados.tap_assinado,
        gerente_id=dados.gerente_id,
        diretor_id=dados.diretor_id,
        professor_orientador_id=dados.professor_orientador_id,
    )
    db.add(projeto)
    db.flush()  # garante projeto.id antes de criar as etapas

    hoje = date.today()

    templates = (
        db.query(EtapaTemplate)
        .filter(EtapaTemplate.servico_id == dados.servico_id)
        .order_by(EtapaTemplate.ordem)
        .all()
    )

    for template in templates:
        etapa = Etapa(
            projeto_id=projeto.id,
            etapa_template_id=template.id,
            ordem=template.ordem,
            nome=template.nome,
            descricao=template.descricao_padrao,
            dias_uteis_esperados=template.dias_uteis_esperados_padrao,
            status="nao_iniciada",
        )
        db.add(etapa)
        db.flush()  # garante etapa.id para as associações

        for trabalhador_id in dados.consultores_iniciais_ids:
            db.add(
                EtapaConsultor(
                    etapa_id=etapa.id,
                    trabalhador_id=trabalhador_id,
                    data_entrada=hoje,
                    data_saida=None,
                )
            )

    db.commit()
    db.refresh(projeto)
    return projeto
