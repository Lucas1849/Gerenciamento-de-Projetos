"""Testes de regressão do hardening de segurança (12/07/2026).

Achado crítico 1 do relatório de sondagem: os laços de calendário (workalendar
itera add_working_days dia a dia) não tinham teto, permitindo DoS trivial numa
API sem auth/rate limit (medido: 2M dias úteis ≈ 10s de CPU por request). O
teto MAX_DIAS_UTEIS agora rejeita valores absurdos com 422 na borda e com
ValueError no núcleo. Ver docs/arquitetura/hardening-producao.md."""

import pytest

from app.utils.calendario import MAX_DIAS_UTEIS, calcular_data_fim, contar_dias_uteis
from datetime import date


# --- Núcleo: as funções de calendário recusam valores fora do teto ----------

def test_calcular_data_fim_acima_do_teto_levanta():
    with pytest.raises(ValueError):
        calcular_data_fim(date(2026, 1, 1), MAX_DIAS_UTEIS + 1)


def test_calcular_data_fim_no_teto_ok():
    # No limite exato ainda calcula (não regride o caso legítimo).
    assert calcular_data_fim(date(2026, 1, 1), MAX_DIAS_UTEIS) is not None


def test_contar_dias_uteis_intervalo_absurdo_aborta():
    # data_fim muito distante: o laço reverso aborta em vez de iterar milhões.
    with pytest.raises(ValueError):
        contar_dias_uteis(date(2026, 1, 1), date(9999, 12, 31))


# --- Borda HTTP: as rotas de calendário devolvem 422, não travam ------------

def test_rota_data_fim_dias_absurdos_422(client):
    resp = client.get(
        "/calendario/data-fim",
        params={"data_inicio": "2026-01-01", "dias_uteis": 2_000_000},
    )
    assert resp.status_code == 422


def test_rota_dias_uteis_data_fim_absurda_422(client):
    resp = client.get(
        "/calendario/dias-uteis",
        params={"data_inicio": "2026-01-01", "data_fim": "9999-12-31"},
    )
    assert resp.status_code == 422


def test_rota_cascata_dias_absurdos_422(client):
    resp = client.post(
        "/calendario/cascata",
        json={"data_inicio": "2026-01-01", "dias": [2_000_000]},
    )
    assert resp.status_code == 422


# --- Regressão: os casos legítimos continuam funcionando --------------------

def test_rota_data_fim_valor_normal_ok(client):
    resp = client.get(
        "/calendario/data-fim",
        params={"data_inicio": "2026-01-05", "dias_uteis": 5},
    )
    assert resp.status_code == 200
    assert resp.json()["data_fim"] == "2026-01-09"
