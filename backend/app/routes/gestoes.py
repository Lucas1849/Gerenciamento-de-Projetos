"""Rotas de gestões (semestres/ciclos)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Gestao
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
