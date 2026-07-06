"""Testes da Fase 10: janela de plausibilidade de datas (422 para anos
absurdos em todos os pontos de entrada de data_inicio)."""

from datetime import date

from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base

ANO = date.today().year


def test_projeto_com_etapa_em_ano_absurdo_422(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            "etapas": [{"nome": "Etapa", "dias_uteis_esperados": 5,
                        "data_inicio": "8250-12-05"}],
        },
    )
    assert resp.status_code == 422
    assert "implausível" in resp.text


def test_projeto_com_etapa_no_ano_corrente_200(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            "etapas": [{"nome": "Etapa", "dias_uteis_esperados": 5,
                        "data_inicio": f"{ANO}-06-01"}],
        },
    )
    assert resp.status_code == 200, resp.text


def test_limites_da_janela(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)

    def tentar(data):
        return client.post(
            "/projetos/",
            json={
                "nome": "P",
                "servico_id": base["servico_id"],
                "gestao_id": base["gestao_id"],
                "gerente_id": base["gerente_id"],
                "diretor_id": base["diretor_id"],
                "etapas": [{"nome": "E", "dias_uteis_esperados": 1,
                            "data_inicio": data}],
            },
        ).status_code

    # Bordas inclusivas: 01/01/(ano−1) e 31/12/(ano+2) passam.
    assert tentar(f"{ANO - 1}-01-01") == 200
    assert tentar(f"{ANO + 2}-12-31") == 200
    # Um dia fora de cada borda → 422.
    assert tentar(f"{ANO - 2}-12-31") == 422
    assert tentar(f"{ANO + 3}-01-01") == 422


def test_bloco_com_data_fora_da_janela_422(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()

    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": [e["id"] for e in etapas],
              "dias_uteis_esperados": 5, "data_inicio": "8250-12-05"},
    )
    assert resp.status_code == 422


def test_etapa_manual_com_data_fora_da_janela_422(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)

    resp = client.post(
        "/etapas/",
        json={"projeto_id": projeto_id, "ordem": 99, "nome": "Manual",
              "data_inicio": "1900-01-01"},
    )
    assert resp.status_code == 422
