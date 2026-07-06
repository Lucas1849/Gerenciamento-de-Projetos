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


def janela_datas_plausiveis() -> tuple[date, date]:
    """Janela dinâmica de plausibilidade (Fase 10): 01/01/(ano atual − 1) a
    31/12/(ano atual + 2) — cobre gestões passadas recentes e planejamento
    futuro razoável. Se a empresa passar a planejar mais de 2 anos à frente,
    ajustar as constantes aqui (decisão barata, registrada no plano)."""
    ano = date.today().year
    return date(ano - 1, 1, 1), date(ano + 2, 12, 31)


def validar_data_plausivel(data_inicio: date | None) -> date | None:
    """Validador (usado nos schemas Pydantic): rejeita datas fora da janela
    de plausibilidade com mensagem em português. None passa (data opcional)."""
    if data_inicio is None:
        return None
    minimo, maximo = janela_datas_plausiveis()
    if not minimo <= data_inicio <= maximo:
        raise ValueError(
            "data de início implausível: deve estar entre "
            f"{minimo.strftime('%d/%m/%Y')} e {maximo.strftime('%d/%m/%Y')}"
        )
    return data_inicio
