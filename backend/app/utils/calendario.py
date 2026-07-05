"""Cálculo de datas por dias úteis (Fase 5).

Fonte única do cálculo: o frontend nunca calcula datas localmente — usa
GET /calendario/data-fim. Considera feriados nacionais do Brasil
(workalendar), municipais/estaduais fora do escopo (risco registrado).
"""

from datetime import date

from workalendar.america import Brazil

_calendario = Brazil()


def calcular_data_fim(data_inicio: date, dias_uteis: int) -> date:
    """Data final = data_inicio + N dias úteis (fins de semana e feriados
    nacionais pulados). A data de início não conta como dia útil gasto."""
    return _calendario.add_working_days(data_inicio, dias_uteis)
