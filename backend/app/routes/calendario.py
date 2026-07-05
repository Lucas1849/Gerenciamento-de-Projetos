"""Rota de apoio ao formulário: prévia da data final por dias úteis (Fase 5)."""

from datetime import date

from fastapi import APIRouter, Query

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
