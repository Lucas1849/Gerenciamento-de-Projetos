"""Regra de negócio central: criação de projeto com cascade.

Ao criar um projeto, o backend:
  1. Cria o Projeto.
  2. Gera as Etapas por um de dois caminhos (ADR-008):
     - payload sem `etapas`: cópia literal dos EtapaTemplate do Servico;
     - payload com `etapas`: lista customizada (reordenada/editada/com etapas
       manuais), com ordem posicional atribuída pelo backend (índice + 1).
     Nos dois caminhos, etapas do mesmo bloco de entrega recebem uma chave
     uuid compartilhada em `bloco_entrega` e o mesmo prazo/data de início
     (templates com `ordem` repetida no catálogo; itens com o mesmo
     `bloco_grupo` no payload).
  3. Atribui cada consultor inicial a TODAS as etapas geradas, criando
     uma linha em EtapaConsultor por (etapa, consultor) com
     data_entrada = hoje (ADR-002).

Ver docs/features/modelo-dados.md ("Fluxo de criação de projeto").
"""

import uuid
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


def _etapas_dos_templates(db: Session, servico_id: int) -> list[Etapa]:
    """Caminho padrão: cópia literal dos templates do serviço.

    Templates que compartilham a mesma `ordem` são um bloco de entrega:
    materializam com a mesma chave uuid em `bloco_entrega`.
    """
    templates = (
        db.query(EtapaTemplate)
        .filter(EtapaTemplate.servico_id == servico_id)
        .order_by(EtapaTemplate.ordem, EtapaTemplate.id)
        .all()
    )
    chave_por_ordem: dict[int, str] = {}
    ordens_repetidas = {
        t.ordem for t in templates if sum(1 for x in templates if x.ordem == t.ordem) > 1
    }
    etapas = []
    for template in templates:
        chave = None
        if template.ordem in ordens_repetidas:
            chave = chave_por_ordem.setdefault(template.ordem, str(uuid.uuid4()))
        etapas.append(
            Etapa(
                etapa_template_id=template.id,
                ordem=template.ordem,
                nome=template.nome,
                descricao=template.descricao_padrao,
                dias_uteis_esperados=template.dias_uteis_esperados_padrao,
                bloco_entrega=chave,
                status="nao_iniciada",
            )
        )
    return etapas


def _etapas_customizadas(
    db: Session, servico_id: int, itens: list["schemas.EtapaProjetoCriar"]
) -> list[Etapa]:
    """Caminho customizado (ADR-008): ordem posicional; blocos por `bloco_grupo`.

    Itens com o mesmo `bloco_grupo` recebem a mesma chave uuid e são
    normalizados para o prazo/data do primeiro item do grupo.
    """
    chave_por_grupo: dict[str, str] = {}
    valores_por_grupo: dict[str, tuple] = {}
    etapas = []
    for indice, item in enumerate(itens):
        if item.etapa_template_id is not None:
            template = db.get(EtapaTemplate, item.etapa_template_id)
            if template is None or template.servico_id != servico_id:
                raise ValueError(
                    f"EtapaTemplate id={item.etapa_template_id} não pertence ao serviço do projeto"
                )
        chave = None
        dias, inicio = item.dias_uteis_esperados, item.data_inicio
        if item.bloco_grupo:
            chave = chave_por_grupo.setdefault(item.bloco_grupo, str(uuid.uuid4()))
            dias, inicio = valores_por_grupo.setdefault(item.bloco_grupo, (dias, inicio))
        etapas.append(
            Etapa(
                etapa_template_id=item.etapa_template_id,
                ordem=indice + 1,
                nome=item.nome,
                descricao=None,
                dias_uteis_esperados=dias,
                data_inicio=inicio,
                bloco_entrega=chave,
                status="nao_iniciada",
            )
        )
    return etapas


def criar_projeto(db: Session, dados: "schemas.ProjetoCriar") -> Projeto:
    """Cria o projeto, gera etapas (template ou customizadas) e atribui consultores.

    Levanta ValueError se o servico_id não existir ou se alguma etapa
    customizada referenciar template de outro serviço.
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

    if dados.etapas is None:
        etapas = _etapas_dos_templates(db, dados.servico_id)
    else:
        etapas = _etapas_customizadas(db, dados.servico_id, dados.etapas)

    hoje = date.today()
    for etapa in etapas:
        etapa.projeto_id = projeto.id
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
