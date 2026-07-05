"""Rotas de etapas de projeto e da associação EtapaConsultor (ADR-002/ADR-003)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Etapa, EtapaConsultor, Projeto, Trabalhador
from app.utils.calendario import calcular_data_fim
from app.utils.db import get_db

router = APIRouter(prefix="/etapas", tags=["Etapas"])


def consultores_ativos(etapa: Etapa) -> list[Trabalhador]:
    """Consultores com vínculo ativo (data_saida IS NULL) na etapa."""
    return [ec.trabalhador for ec in etapa.consultores if ec.data_saida is None]


def serializar_etapa(etapa: Etapa) -> schemas.EtapaResposta:
    """Monta a resposta da etapa embutindo a equipe ativa."""
    return schemas.EtapaResposta(
        id=etapa.id,
        projeto_id=etapa.projeto_id,
        etapa_template_id=etapa.etapa_template_id,
        ordem=etapa.ordem,
        nome=etapa.nome,
        descricao=etapa.descricao,
        dias_uteis_esperados=etapa.dias_uteis_esperados,
        data_inicio=etapa.data_inicio,
        # Derivada, nunca armazenada (ADR-008).
        data_fim=(
            calcular_data_fim(etapa.data_inicio, etapa.dias_uteis_esperados)
            if etapa.data_inicio is not None and etapa.dias_uteis_esperados is not None
            else None
        ),
        bloco_entrega=etapa.bloco_entrega,
        status=etapa.status,
        consultores=[
            schemas.TrabalhadorResposta.model_validate(t)
            for t in consultores_ativos(etapa)
        ],
    )


@router.post("/", response_model=schemas.EtapaResposta)
def criar_etapa(etapa: schemas.EtapaCriar, db: Session = Depends(get_db)):
    """Adiciona manualmente uma etapa a um projeto existente."""
    if db.get(Projeto, etapa.projeto_id) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    nova = Etapa(
        projeto_id=etapa.projeto_id,
        etapa_template_id=etapa.etapa_template_id,
        ordem=etapa.ordem,
        nome=etapa.nome,
        descricao=etapa.descricao,
        dias_uteis_esperados=etapa.dias_uteis_esperados,
        data_inicio=etapa.data_inicio,
        bloco_entrega=etapa.bloco_entrega,
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return serializar_etapa(nova)


@router.put("/{etapa_id}/status", response_model=schemas.EtapaResposta)
def atualizar_status_etapa(
    etapa_id: int, atualizacao: schemas.EtapaAtualizar, db: Session = Depends(get_db)
):
    """Move a etapa no Kanban interno do projeto (ADR-003)."""
    etapa = db.get(Etapa, etapa_id)
    if etapa is None:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    etapa.status = atualizacao.status
    db.commit()
    db.refresh(etapa)
    return serializar_etapa(etapa)


@router.post("/{etapa_id}/consultores", response_model=schemas.EtapaConsultorResposta)
def adicionar_consultor(
    etapa_id: int, dados: schemas.EtapaConsultorCriar, db: Session = Depends(get_db)
):
    """Vincula um consultor à etapa (data_entrada = hoje se omitida)."""
    if db.get(Etapa, etapa_id) is None:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    if db.get(Trabalhador, dados.trabalhador_id) is None:
        raise HTTPException(status_code=404, detail="Trabalhador não encontrado")
    vinculo = EtapaConsultor(
        etapa_id=etapa_id,
        trabalhador_id=dados.trabalhador_id,
        data_entrada=dados.data_entrada or date.today(),
        data_saida=None,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(vinculo)
    return vinculo


@router.delete(
    "/{etapa_id}/consultores/{trabalhador_id}",
    response_model=schemas.EtapaConsultorResposta,
)
def remover_consultor(
    etapa_id: int, trabalhador_id: int, db: Session = Depends(get_db)
):
    """Soft-delete: preenche data_saida do vínculo ativo, sem apagar a linha."""
    vinculo = (
        db.query(EtapaConsultor)
        .filter(
            EtapaConsultor.etapa_id == etapa_id,
            EtapaConsultor.trabalhador_id == trabalhador_id,
            EtapaConsultor.data_saida.is_(None),
        )
        .first()
    )
    if vinculo is None:
        raise HTTPException(
            status_code=404, detail="Vínculo ativo não encontrado para esta etapa"
        )
    vinculo.data_saida = date.today()
    db.commit()
    db.refresh(vinculo)
    return vinculo
