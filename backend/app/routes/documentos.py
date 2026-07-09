"""Rotas dos documentos importantes da área (Fase 18, ADR-020, revisada em
09/07/2026): links nomeados para o Drive exibidos na galeria de gestões.
Sem vínculo com gestão/projeto e sem upload — a aba é só o índice."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Documento
from app.utils.db import get_db

router = APIRouter(prefix="/documentos", tags=["Documentos"])


@router.get("/", response_model=list[schemas.DocumentoResposta])
def listar_documentos(db: Session = Depends(get_db)):
    return db.query(Documento).order_by(Documento.criado_em).all()


@router.post("/", response_model=schemas.DocumentoResposta)
def criar_documento(dados: schemas.DocumentoCriar, db: Session = Depends(get_db)):
    documento = Documento(nome=dados.nome, url=dados.url)
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return documento


@router.delete("/{documento_id}", status_code=204)
def excluir_documento(documento_id: int, db: Session = Depends(get_db)):
    """Sem editor no piloto: para corrigir, exclui e recria."""
    documento = db.get(Documento, documento_id)
    if documento is None:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    db.delete(documento)
    db.commit()
