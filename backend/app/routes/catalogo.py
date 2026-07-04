"""Rotas do catálogo de serviços (Servico + EtapaTemplate)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Servico, EtapaTemplate
from app.utils.db import get_db

router = APIRouter(tags=["Catálogo de Serviços"])


@router.post("/servicos/", response_model=schemas.ServicoResposta)
def criar_servico(servico: schemas.ServicoCriar, db: Session = Depends(get_db)):
    novo = Servico(nome=servico.nome, descricao=servico.descricao)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


@router.get("/servicos/", response_model=list[schemas.ServicoResposta])
def listar_servicos(db: Session = Depends(get_db)):
    return db.query(Servico).all()


@router.get("/servicos/{servico_id}", response_model=schemas.ServicoComEtapasResposta)
def obter_servico(servico_id: int, db: Session = Depends(get_db)):
    servico = db.get(Servico, servico_id)
    if servico is None:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return servico


@router.post("/etapas-template/", response_model=schemas.EtapaTemplateResposta)
def criar_etapa_template(
    etapa: schemas.EtapaTemplateCriar, db: Session = Depends(get_db)
):
    if db.get(Servico, etapa.servico_id) is None:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    nova = EtapaTemplate(
        servico_id=etapa.servico_id,
        ordem=etapa.ordem,
        nome=etapa.nome,
        descricao_padrao=etapa.descricao_padrao,
        dias_uteis_esperados_padrao=etapa.dias_uteis_esperados_padrao,
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova
