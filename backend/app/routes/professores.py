"""Rotas de professores orientadores (ADR-004; CRUD completo na Fase 20,
ADR-022 — a aba Professores orientadores da galeria é o lugar canônico)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Professor, Projeto
from app.utils.db import get_db

router = APIRouter(prefix="/professores", tags=["Professores"])


@router.post("/", response_model=schemas.ProfessorResposta)
def criar_professor(professor: schemas.ProfessorCriar, db: Session = Depends(get_db)):
    novo = Professor(
        nome=professor.nome,
        email=professor.email,
        servico_interesse=professor.servico_interesse,
        contato=professor.contato,
        observacoes=professor.observacoes,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


@router.get("/", response_model=list[schemas.ProfessorResposta])
def listar_professores(db: Session = Depends(get_db)):
    return db.query(Professor).all()


@router.put("/{professor_id}", response_model=schemas.ProfessorResposta)
def atualizar_professor(
    professor_id: int,
    dados: schemas.ProfessorAtualizar,
    db: Session = Depends(get_db),
):
    """Atualização parcial (Fase 20, ADR-022): contato e observações evoluem
    com o tempo — aplica só os campos enviados."""
    professor = db.get(Professor, professor_id)
    if professor is None:
        raise HTTPException(status_code=404, detail="Professor não encontrado")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(professor, campo, valor)
    db.commit()
    db.refresh(professor)
    return professor


@router.delete("/{professor_id}", response_model=schemas.ProfessorResposta)
def excluir_professor(professor_id: int, db: Session = Depends(get_db)):
    """Exclui o professor (Fase 20). 409 se ele orienta algum projeto — mesmo
    padrão do 409 de gestão com projetos (ADR-012)."""
    professor = db.get(Professor, professor_id)
    if professor is None:
        raise HTTPException(status_code=404, detail="Professor não encontrado")
    projetos = (
        db.query(Projeto)
        .filter(Projeto.professor_orientador_id == professor_id)
        .all()
    )
    if projetos:
        nomes = ", ".join(p.nome for p in projetos)
        raise HTTPException(
            status_code=409,
            detail=f"Professor orienta o(s) projeto(s): {nomes}",
        )
    db.delete(professor)
    db.commit()
    return professor
