"""Rotas de colaboradores (Trabalhador)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Trabalhador
from app.utils.db import get_db

router = APIRouter(prefix="/trabalhadores", tags=["Colaboradores"])


@router.post("/", response_model=schemas.TrabalhadorResposta)
def criar_trabalhador(
    trabalhador: schemas.TrabalhadorCriar, db: Session = Depends(get_db)
):
    novo = Trabalhador(
        nome=trabalhador.nome,
        cargo=trabalhador.cargo,
        emailInstitucional=trabalhador.emailInstitucional,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


@router.get("/", response_model=list[schemas.TrabalhadorResposta])
def listar_trabalhadores(db: Session = Depends(get_db)):
    return db.query(Trabalhador).all()
