"""Rotas de etapas de projeto e da associação EtapaConsultor (ADR-002/ADR-003)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import (
    Etapa,
    EtapaConsultor,
    EtapaDependencia,
    Projeto,
    Trabalhador,
)
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
        # Dependências informativas (Fase 13, ADR-015): quem bloqueia esta
        # etapa e quem esta etapa bloqueia (só id + nome, leve para os chips).
        bloqueada_por=[
            schemas.EtapaRef.model_validate(d.bloqueada_por)
            for d in etapa.dependencias_bloqueada
        ],
        bloqueando=[
            schemas.EtapaRef.model_validate(d.etapa)
            for d in etapa.dependencias_bloqueando
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


@router.patch("/{etapa_id}", response_model=schemas.EtapaResposta)
def editar_etapa(
    etapa_id: int, edicao: schemas.EtapaEditar, db: Session = Depends(get_db)
):
    """Edita campos da etapa pós-criação (Fase 12, ADR-014).

    Aplica só os campos enviados. Se a etapa pertence a um bloco de entrega,
    dias_uteis_esperados/data_inicio propagam a todos os membros (redundância
    do ADR-009); nome/descricao permanecem individuais.
    """
    etapa = db.get(Etapa, etapa_id)
    if etapa is None:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")

    campos = edicao.model_dump(exclude_unset=True)
    if "nome" in campos:
        etapa.nome = campos["nome"]
    if "descricao" in campos:
        etapa.descricao = campos["descricao"]

    compartilhados = {
        c: campos[c] for c in ("dias_uteis_esperados", "data_inicio") if c in campos
    }
    if compartilhados:
        alvos = [etapa]
        if etapa.bloco_entrega is not None:
            alvos = (
                db.query(Etapa)
                .filter(
                    Etapa.projeto_id == etapa.projeto_id,
                    Etapa.bloco_entrega == etapa.bloco_entrega,
                )
                .all()
            )
        for alvo in alvos:
            for campo, valor in compartilhados.items():
                setattr(alvo, campo, valor)

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


@router.post("/{etapa_id}/dependencias", response_model=schemas.EtapaResposta)
def criar_dependencia(
    etapa_id: int, dados: schemas.DependenciaCriar, db: Session = Depends(get_db)
):
    """Cria uma dependência informativa (Fase 13, ADR-015): a etapa da rota
    passa a ficar 'bloqueada por' `bloqueada_por_id`.

    Validações: ambas as etapas existem e são do mesmo projeto (404/422), sem
    auto-referência (422), sem duplicata (409) e sem ciclo direto (422 se o
    inverso já existir). Ciclos indiretos ficam fora de escopo — a dependência
    é só informativa, nada é reagendado.
    """
    etapa = db.get(Etapa, etapa_id)
    if etapa is None:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    if dados.bloqueada_por_id == etapa_id:
        raise HTTPException(
            status_code=422, detail="Uma etapa não pode depender de si mesma"
        )
    bloqueadora = db.get(Etapa, dados.bloqueada_por_id)
    if bloqueadora is None:
        raise HTTPException(
            status_code=404, detail="Etapa bloqueadora não encontrada"
        )
    if bloqueadora.projeto_id != etapa.projeto_id:
        raise HTTPException(
            status_code=422, detail="As etapas devem pertencer ao mesmo projeto"
        )
    if (
        db.query(EtapaDependencia)
        .filter_by(etapa_id=etapa_id, bloqueada_por_id=dados.bloqueada_por_id)
        .first()
    ):
        raise HTTPException(status_code=409, detail="Dependência já existe")
    if (
        db.query(EtapaDependencia)
        .filter_by(etapa_id=dados.bloqueada_por_id, bloqueada_por_id=etapa_id)
        .first()
    ):
        raise HTTPException(
            status_code=422,
            detail="Dependência criaria um ciclo direto (o inverso já existe)",
        )

    db.add(EtapaDependencia(etapa_id=etapa_id, bloqueada_por_id=dados.bloqueada_por_id))
    db.commit()
    db.refresh(etapa)
    return serializar_etapa(etapa)


@router.delete(
    "/{etapa_id}/dependencias/{bloqueada_por_id}",
    response_model=schemas.EtapaResposta,
)
def remover_dependencia(
    etapa_id: int, bloqueada_por_id: int, db: Session = Depends(get_db)
):
    """Remove a dependência (Fase 13). 404 se o vínculo não existir."""
    dependencia = (
        db.query(EtapaDependencia)
        .filter_by(etapa_id=etapa_id, bloqueada_por_id=bloqueada_por_id)
        .first()
    )
    if dependencia is None:
        raise HTTPException(status_code=404, detail="Dependência não encontrada")
    db.delete(dependencia)
    db.commit()
    etapa = db.get(Etapa, etapa_id)
    db.refresh(etapa)
    return serializar_etapa(etapa)
