"""Rotas de apoio ao formulário: prévia da data final por dias úteis (Fase 5)
e cascata de datas de início encadeadas (Fase 12)."""

from datetime import date

from fastapi import APIRouter, Query

from app import schemas
from app.utils.calendario import calcular_data_fim

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
