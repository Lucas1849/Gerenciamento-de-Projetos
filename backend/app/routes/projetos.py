"""Rotas de projetos. A criação usa o cascade em app.services.projetos."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import Etapa, Projeto
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


@router.delete("/{projeto_id}", status_code=204)
def excluir_projeto(projeto_id: int, db: Session = Depends(get_db)):
    """Exclui o projeto em cascata: EtapaConsultor → Etapas → Projeto (Fase 9).

    ADR-012: apaga o histórico de equipe (dado da futura ficha SIEX) —
    aceitável no piloto; em produção a rota será restrita por cargo.
    """
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    db.delete(projeto)
    db.commit()


@router.post("/{projeto_id}/blocos", response_model=list[schemas.EtapaResposta])
def criar_bloco(
    projeto_id: int, dados: schemas.BlocoCriar, db: Session = Depends(get_db)
):
    """Forma um bloco de entrega com etapas existentes do projeto (ADR-009).

    Valida que todas as etapas pertencem ao projeto e que nenhuma já está em
    bloco; aplica uma chave uuid compartilhada e o prazo/data informados
    (o status permanece individual por etapa).
    """
    if db.get(Projeto, projeto_id) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    if len(set(dados.etapa_ids)) != len(dados.etapa_ids):
        raise HTTPException(status_code=422, detail="etapa_ids contém repetições")

    etapas: list[Etapa] = []
    for etapa_id in dados.etapa_ids:
        etapa = db.get(Etapa, etapa_id)
        if etapa is None or etapa.projeto_id != projeto_id:
            raise HTTPException(
                status_code=404,
                detail=f"Etapa id={etapa_id} não pertence a este projeto",
            )
        if etapa.bloco_entrega is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Etapa id={etapa_id} já faz parte de um bloco de entrega",
            )
        etapas.append(etapa)

    chave = str(uuid.uuid4())
    for etapa in etapas:
        etapa.bloco_entrega = chave
        etapa.dias_uteis_esperados = dados.dias_uteis_esperados
        etapa.data_inicio = dados.data_inicio
    db.commit()
    return [serializar_etapa(e) for e in etapas]


def _etapas_do_bloco(db: Session, projeto_id: int, chave: str) -> list[Etapa]:
    """Membros do bloco ordenados; valida projeto e existência do bloco (404)."""
    if db.get(Projeto, projeto_id) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    etapas = (
        db.query(Etapa)
        .filter(Etapa.projeto_id == projeto_id, Etapa.bloco_entrega == chave)
        .order_by(Etapa.ordem)
        .all()
    )
    if not etapas:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    return etapas


@router.post(
    "/{projeto_id}/blocos/{chave}/etapas",
    response_model=list[schemas.EtapaResposta],
)
def estender_bloco(
    projeto_id: int, chave: str, dados: schemas.BlocoEstender, db: Session = Depends(get_db)
):
    """Estende um bloco existente com novas etapas (Fase 8).

    As novas etapas adotam o prazo/data do bloco (copiados de um membro,
    redundância do ADR-009) e mantêm status individual.
    """
    membros = _etapas_do_bloco(db, projeto_id, chave)
    if len(set(dados.etapa_ids)) != len(dados.etapa_ids):
        raise HTTPException(status_code=422, detail="etapa_ids contém repetições")

    novas: list[Etapa] = []
    for etapa_id in dados.etapa_ids:
        etapa = db.get(Etapa, etapa_id)
        if etapa is None or etapa.projeto_id != projeto_id:
            raise HTTPException(
                status_code=404,
                detail=f"Etapa id={etapa_id} não pertence a este projeto",
            )
        if etapa.bloco_entrega is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Etapa id={etapa_id} já faz parte de um bloco de entrega",
            )
        novas.append(etapa)

    referencia = membros[0]
    for etapa in novas:
        etapa.bloco_entrega = chave
        etapa.dias_uteis_esperados = referencia.dias_uteis_esperados
        etapa.data_inicio = referencia.data_inicio
    db.commit()
    return [serializar_etapa(e) for e in sorted(membros + novas, key=lambda e: e.ordem)]


@router.delete(
    "/{projeto_id}/blocos/{chave}/etapas/{etapa_id}",
    response_model=list[schemas.EtapaResposta],
)
def remover_etapa_do_bloco(
    projeto_id: int, chave: str, etapa_id: int, db: Session = Depends(get_db)
):
    """Retira uma etapa específica do bloco (Fase 8).

    A etapa volta a ser avulsa mantendo prazo/data/status. Se restar apenas
    1 membro, o bloco inteiro dissolve (invariante: bloco mínimo = 2).
    """
    membros = _etapas_do_bloco(db, projeto_id, chave)
    alvo = next((e for e in membros if e.id == etapa_id), None)
    if alvo is None:
        raise HTTPException(
            status_code=404, detail=f"Etapa id={etapa_id} não pertence a este bloco"
        )

    alvo.bloco_entrega = None
    restantes = [e for e in membros if e.id != etapa_id]
    if len(restantes) < 2:
        for etapa in restantes:
            etapa.bloco_entrega = None
    db.commit()
    return [serializar_etapa(e) for e in membros]


@router.delete("/{projeto_id}/blocos/{chave}", response_model=list[schemas.EtapaResposta])
def desfazer_bloco(projeto_id: int, chave: str, db: Session = Depends(get_db)):
    """Desfaz um bloco: limpa a chave; os membros mantêm prazo/data/status."""
    if db.get(Projeto, projeto_id) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    etapas = (
        db.query(Etapa)
        .filter(Etapa.projeto_id == projeto_id, Etapa.bloco_entrega == chave)
        .order_by(Etapa.ordem)
        .all()
    )
    if not etapas:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    for etapa in etapas:
        etapa.bloco_entrega = None
    db.commit()
    return [serializar_etapa(e) for e in etapas]


@router.put("/{projeto_id}/etapas/ordem", response_model=list[schemas.EtapaResposta])
def reordenar_etapas(
    projeto_id: int, dados: schemas.OrdemEtapas, db: Session = Depends(get_db)
):
    """Reordena as etapas do projeto (Fase 12, ADR-014).

    A lista deve conter exatamente os ids das etapas do projeto, na nova ordem
    visual; o backend reatribui ordem = índice + 1 (cobre etapas avulsas e
    membros de bloco).
    """
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    etapas_por_id = {e.id: e for e in projeto.etapas}
    if sorted(dados.ordem) != sorted(etapas_por_id):
        raise HTTPException(
            status_code=422,
            detail="A lista deve conter exatamente os ids das etapas do projeto",
        )

    for indice, etapa_id in enumerate(dados.ordem):
        etapas_por_id[etapa_id].ordem = indice + 1
    db.commit()
    return [serializar_etapa(etapas_por_id[i]) for i in dados.ordem]


@router.get("/{projeto_id}/etapas", response_model=list[schemas.EtapaResposta])
def listar_etapas_do_projeto(projeto_id: int, db: Session = Depends(get_db)):
    projeto = db.get(Projeto, projeto_id)
    if projeto is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return [serializar_etapa(e) for e in projeto.etapas]
