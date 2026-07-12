"""Rotas de apoio ao formulário: prévia da data final por dias úteis (Fase 5)
e cascata de datas de início encadeadas (Fase 12)."""

from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app import schemas
from app.utils.calendario import (
    MAX_DIAS_UTEIS,
    calcular_data_fim,
    contar_dias_uteis,
    proximo_dia_util,
    validar_data_plausivel,
)

router = APIRouter(prefix="/calendario", tags=["Calendário"])


@router.get("/data-fim")
def data_fim(
    data_inicio: date = Query(...),
    # le=MAX_DIAS_UTEIS: teto anti-DoS (ver MAX_DIAS_UTEIS) — sem ele um valor
    # enorme itera milhões de dias e trava o worker (API sem auth/rate limit).
    dias_uteis: int = Query(..., ge=0, le=MAX_DIAS_UTEIS),
):
    """Prévia da data final (data_inicio + dias úteis, feriados nacionais)."""
    return {
        "data_inicio": data_inicio,
        "dias_uteis": dias_uteis,
        "data_fim": calcular_data_fim(data_inicio, dias_uteis),
    }


@router.get("/dias-uteis")
def dias_uteis(
    data_inicio: date = Query(...),
    data_fim: date = Query(...),
):
    """Reverse-calendar (Fase 13): dias úteis entre data_inicio e data_fim,
    inverso exato de /data-fim. Usado pelo redimensionamento do cronograma
    para converter a nova data final arrastada em dias_uteis_esperados."""
    # Plausibilidade nas duas pontas (guarda anti-DoS): sem isso, uma data_fim
    # em ano distante faz o reverse-calendar iterar dia a dia por milhões de
    # dias. A janela (Fase 10) já é o limite natural do domínio.
    try:
        validar_data_plausivel(data_inicio)
        validar_data_plausivel(data_fim)
        dias = contar_dias_uteis(data_inicio, data_fim)
    except ValueError as erro:
        raise HTTPException(status_code=422, detail=str(erro))
    return {
        "data_inicio": data_inicio,
        "data_fim": data_fim,
        "dias_uteis": dias,
    }


@router.post("/cascata")
def cascata(dados: schemas.CascataCriar):
    """Encadeia datas de início por dias úteis (Fase 12, ADR-014).

    Convenção inclusiva (Fase 16, ADR-018): o início da próxima etapa é o
    primeiro dia útil APÓS a data final da anterior — cada dia útil pertence a
    exatamente uma etapa. Os inícios encadeados resultam idênticos aos da
    convenção antiga; só a data final exibida encurta um dia útil.
    Um único round-trip resolve a cascata inteira do editor de criação.
    """
    inicios = [dados.data_inicio]
    for dias in dados.dias[:-1]:
        fim = calcular_data_fim(inicios[-1], dias)
        inicios.append(proximo_dia_util(fim))
    return {"inicios": inicios}
