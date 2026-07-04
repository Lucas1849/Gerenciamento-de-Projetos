"""Rotas de professores orientadores (ADR-004)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Professor
from app.utils.db import get_db

router = APIRouter(prefix="/professores", tags=["Professores"])


@router.post("/", response_model=schemas.ProfessorResposta)
def criar_professor(professor: schemas.ProfessorCriar, db: Session = Depends(get_db)):
    novo = Professor(nome=professor.nome, email=professor.email)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


@router.get("/", response_model=list[schemas.ProfessorResposta])
def listar_professores(db: Session = Depends(get_db)):
    return db.query(Professor).all()
