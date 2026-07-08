"""Rotas de apoio ao formulário: prévia da data final por dias úteis (Fase 5)
e cascata de datas de início encadeadas (Fase 12)."""

from datetime import date

from fastapi import APIRouter, Query

from app import schemas
from app.utils.calendario import calcular_data_fim, contar_dias_uteis

router = APIRouter(prefix="/calendario", tags=["Calendário"])


@router.get("/data-fim")
def data_fim(
    data_inicio: date = Query(...),
    dias_uteis: int = Query(..., ge=0),
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
    return {
        "data_inicio": data_inicio,
        "data_fim": data_fim,
        "dias_uteis": contar_dias_uteis(data_inicio, data_fim),
    }


@router.post("/cascata")
def cascata(dados: schemas.CascataCriar):
    """Encadeia datas de início por dias úteis (Fase 12, ADR-014).

    inicios[0] = data_inicio; inicios[k] = data final da etapa anterior
    (calcular_data_fim já devolve o início da próxima na convenção ADR-008).
    Um único round-trip resolve a cascata inteira do editor de criação.
    """
    inicios = [dados.data_inicio]
    for dias in dados.dias[:-1]:
        inicios.append(calcular_data_fim(inicios[-1], dias))
    return {"inicios": inicios}
