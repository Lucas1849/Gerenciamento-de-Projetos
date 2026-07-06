"""Rotas de gestões (semestres/ciclos)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Gestao, Projeto
from app.utils.db import get_db

router = APIRouter(prefix="/gestoes", tags=["Gestões"])


@router.post("/", response_model=schemas.GestaoResposta)
def criar_gestao(gestao: schemas.GestaoCriar, db: Session = Depends(get_db)):
    nova = Gestao(nome=gestao.nome, ativa=gestao.ativa)
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@router.get("/", response_model=list[schemas.GestaoResposta])
def listar_gestoes(db: Session = Depends(get_db)):
    return db.query(Gestao).all()


@router.delete("/{gestao_id}", status_code=204)
def excluir_gestao(gestao_id: int, db: Session = Depends(get_db)):
    """Exclui uma gestão vazia (Fase 9).

    Bloqueada (409) se a gestão tiver projetos — default seguro contra
    perda em massa (ADR-012); exclua os projetos primeiro.
    """
    gestao = db.get(Gestao, gestao_id)
    if gestao is None:
        raise HTTPException(status_code=404, detail="Gestão não encontrada")
    total = db.query(Projeto).filter(Projeto.gestao_id == gestao_id).count()
    if total > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Gestão possui {total} projeto(s); exclua-os primeiro",
        )
    db.delete(gestao)
    db.commit()
