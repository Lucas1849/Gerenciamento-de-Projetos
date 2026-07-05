"""Rotas de projetos. A criação usa o cascade em app.services.projetos."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Projeto
from app.routes.etapas import consultores_ativos, serializar_etapa
from app.services import projetos as servico_projetos
from app.utils.db import get_db

router = APIRouter(prefix="/projetos", tags=["Projetos"])


@router.post("/", response_model=schemas.ProjetoResposta)
def criar_projeto(projeto: schemas.ProjetoCriar, db: Session = Depends(get_db)):
    """Cria o projeto com o cascade: etapas do template + consultores iniciais."""
    try:
        return servico_projetos.criar_projeto(db, projeto)
    except ValueError as erro:
        raise HTTPException(status_code=404, detail=str(erro))


def equipe_derivada(projeto: Projeto) -> list[schemas.TrabalhadorResposta]:
    """Equipe derivada (ADR-002): união dos consultores ativos de todas as etapas."""
    equipe: dict[int, schemas.TrabalhadorResposta] = {}
    for etapa in projeto.etapas:
        for trabalhador in consultores_ativos(etapa):
            equipe.setdefault(
                trabalhador.id,
                schemas.TrabalhadorResposta.model_validate(trabalhador),
            )
    return list(equipe.values())


@router.get("/", response_model=list[schemas.ProjetoListaResposta])
def listar_projetos(db: Session = Depends(get_db)):
    """Lista com a equipe derivada embutida (avatares dos cards da galeria)."""
    return [
        schemas.ProjetoListaResposta(
            **schemas.ProjetoResposta.model_validate(p).model_dump(),
            equipe=equipe_derivada(p),
        )
        for p in db.query(Projeto).all()
    ]


@router.get("/{projeto_id}", response_model=schemas.ProjetoDetalheResposta)
def obter_projeto(projeto_id: int, db: Session = Depends(get_db)):
    """Detalhe do projeto com etapas e equipe derivada (ADR-002)."""
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    base = schemas.ProjetoResposta.model_validate(projeto)
    return schemas.ProjetoDetalheResposta(
        **base.model_dump(),
        etapas=[serializar_etapa(e) for e in projeto.etapas],
        equipe=equipe_derivada(projeto),
    )


@router.put("/{projeto_id}", response_model=schemas.ProjetoListaResposta)
def atualizar_projeto(
    projeto_id: int, atualizacao: schemas.ProjetoAtualizar, db: Session = Depends(get_db)
):
    """Atualiza fase (Kanban da galeria) e/ou tap_assinado (ADR-003/ADR-007).

    Devolve a mesma forma da listagem (equipe derivada embutida) para que a
    resposta possa ser escrita de volta no estado da galeria sem perder campos.
    """
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if atualizacao.fase is not None:
        projeto.fase = atualizacao.fase
    if atualizacao.tap_assinado is not None:
        projeto.tap_assinado = atualizacao.tap_assinado
    db.commit()
    db.refresh(projeto)
    return schemas.ProjetoListaResposta(
        **schemas.ProjetoResposta.model_validate(projeto).model_dump(),
        equipe=equipe_derivada(projeto),
    )


@router.get("/{projeto_id}/etapas", response_model=list[schemas.EtapaResposta])
def listar_etapas_do_projeto(projeto_id: int, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return [serializar_etapa(e) for e in projeto.etapas]
