"""Rotas de etapas de projeto e da associação EtapaConsultor (ADR-002/ADR-003)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.models.banco_de_dados import (
    Etapa,
    EtapaConsultor,
    EtapaDependencia,
    EtapaLink,
    Projeto,
    TermoAditivo,
    Trabalhador,
)
from app.utils.calendario import calcular_data_fim
from app.utils.db import get_db

router = APIRouter(prefix="/etapas", tags=["Etapas"])


def consultores_ativos(etapa: Etapa) -> list[Trabalhador]:
    """Consultores com vínculo ativo (data_saida IS NULL) na etapa."""
    return [ec.trabalhador for ec in etapa.consultores if ec.data_saida is None]


def dias_aditivos_da_etapa(etapa: Etapa) -> int:
    """Σ de dias adicionais formalizados (Fase 17, ADR-019). Em bloco, soma os
    termos de TODOS os membros (robusto a termos residuais em outros membros
    após desfazer/refazer blocos); etapa avulsa soma só os próprios."""
    if etapa.bloco_entrega is not None:
        membros = [
            e for e in etapa.projeto.etapas if e.bloco_entrega == etapa.bloco_entrega
        ]
    else:
        membros = [etapa]
    return sum(t.dias_adicionais for m in membros for t in m.termos_aditivos)


def serializar_etapa(etapa: Etapa) -> schemas.EtapaResposta:
    """Monta a resposta da etapa embutindo a equipe ativa."""
    dias_aditivos = dias_aditivos_da_etapa(etapa)
    tem_datas = (
        etapa.data_inicio is not None and etapa.dias_uteis_esperados is not None
    )
    return schemas.EtapaResposta(
        id=etapa.id,
        projeto_id=etapa.projeto_id,
        etapa_template_id=etapa.etapa_template_id,
        ordem=etapa.ordem,
        nome=etapa.nome,
        descricao=etapa.descricao,
        dias_uteis_esperados=etapa.dias_uteis_esperados,
        data_inicio=etapa.data_inicio,
        # Derivadas, nunca armazenadas (ADR-008). data_fim é a data EFETIVA
        # (compromisso + Σ termos aditivos); data_fim_original é o compromisso.
        data_fim=(
            calcular_data_fim(
                etapa.data_inicio, etapa.dias_uteis_esperados + dias_aditivos
            )
            if tem_datas
            else None
        ),
        data_fim_original=(
            calcular_data_fim(etapa.data_inicio, etapa.dias_uteis_esperados)
            if tem_datas
            else None
        ),
        dias_aditivos=dias_aditivos,
        termos_aditivos=[
            schemas.TermoAditivoResposta.model_validate(t)
            for t in etapa.termos_aditivos
        ],
        # Links de entregas/demandas (Fase 19, ADR-021) — individuais por
        # etapa, mesmo em bloco.
        links=[
            schemas.EtapaLinkResposta.model_validate(l) for l in etapa.links
        ],
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


@router.post("/{etapa_id}/termos-aditivos", response_model=schemas.EtapaResposta)
def criar_termo_aditivo(
    etapa_id: int, dados: schemas.TermoAditivoCriar, db: Session = Depends(get_db)
):
    """Formaliza dias adicionais na etapa (Fase 17, ADR-019). O compromisso
    original (dias_uteis_esperados) fica intacto; a data efetiva passa a
    considerar o Σ de termos. Em bloco, o frontend grava na etapa de
    referência (membros[0]) — a derivação soma o bloco inteiro."""
    etapa = db.get(Etapa, etapa_id)
    if etapa is None:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    db.add(
        TermoAditivo(
            etapa_id=etapa_id,
            dias_adicionais=dados.dias_adicionais,
            motivo=dados.motivo,
            documento_url=dados.documento_url,
        )
    )
    db.commit()
    db.refresh(etapa)
    return serializar_etapa(etapa)


@router.put(
    "/{etapa_id}/termos-aditivos/{termo_id}/documento",
    response_model=schemas.EtapaResposta,
)
def anexar_documento_termo(
    etapa_id: int,
    termo_id: int,
    dados: schemas.TermoAditivoDocumento,
    db: Session = Depends(get_db),
):
    """Anexa/atualiza o link do documento formal do termo — a partir daí o
    registro trava (DELETE → 409)."""
    termo = db.get(TermoAditivo, termo_id)
    if termo is None or termo.etapa_id != etapa_id:
        raise HTTPException(status_code=404, detail="Termo aditivo não encontrado")
    termo.documento_url = dados.documento_url
    db.commit()
    etapa = db.get(Etapa, etapa_id)
    db.refresh(etapa)
    return serializar_etapa(etapa)


@router.delete(
    "/{etapa_id}/termos-aditivos/{termo_id}", response_model=schemas.EtapaResposta
)
def excluir_termo_aditivo(
    etapa_id: int, termo_id: int, db: Session = Depends(get_db)
):
    """Exclui um termo em rascunho (Fase 17). Termo com documento anexado está
    formalizado com o cliente e é intocável — 409."""
    termo = db.get(TermoAditivo, termo_id)
    if termo is None or termo.etapa_id != etapa_id:
        raise HTTPException(status_code=404, detail="Termo aditivo não encontrado")
    if termo.documento_url is not None:
        raise HTTPException(
            status_code=409,
            detail="Termo formalizado (documento anexado) não pode ser excluído",
        )
    db.delete(termo)
    db.commit()
    etapa = db.get(Etapa, etapa_id)
    db.refresh(etapa)
    return serializar_etapa(etapa)


@router.post("/{etapa_id}/links", response_model=schemas.EtapaResposta)
def criar_etapa_link(
    etapa_id: int, dados: schemas.EtapaLinkCriar, db: Session = Depends(get_db)
):
    """Anexa um link de entrega ou demanda à etapa (Fase 19, ADR-021).
    Sempre da etapa individual — em bloco, cada membro tem os seus."""
    etapa = db.get(Etapa, etapa_id)
    if etapa is None:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    db.add(
        EtapaLink(
            etapa_id=etapa_id, tipo=dados.tipo, nome=dados.nome, url=dados.url
        )
    )
    db.commit()
    db.refresh(etapa)
    return serializar_etapa(etapa)


@router.delete("/{etapa_id}/links/{link_id}", response_model=schemas.EtapaResposta)
def excluir_etapa_link(etapa_id: int, link_id: int, db: Session = Depends(get_db)):
    """Remove um link da etapa (Fase 19). Exclusão livre, sem trava — link é
    utilitário, não formalização (contraste deliberado com o 409 do termo)."""
    link = db.get(EtapaLink, link_id)
    if link is None or link.etapa_id != etapa_id:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    db.delete(link)
    db.commit()
    etapa = db.get(Etapa, etapa_id)
    db.refresh(etapa)
    return serializar_etapa(etapa)


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
