"""Testes da Fase 6: blocos de entrega interativos em projeto existente
(POST/DELETE /projetos/{id}/blocos — ADR-009)."""

from datetime import date

from app.models.banco_de_dados import Etapa
from tests.test_smoke import _setup_base


def _criar_projeto(client, base, **extra):
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            **extra,
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_criar_bloco_aplica_chave_e_prazo_compartilhados(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    ids = [etapas[0]["id"], etapas[1]["id"]]

    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": ids, "dias_uteis_esperados": 15,
              "data_inicio": "2026-09-04"},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert len(corpo) == 2
    # Chave uuid compartilhada, prazo/data normalizados; data_fim derivada.
    assert corpo[0]["bloco_entrega"] == corpo[1]["bloco_entrega"] is not None
    assert all(e["dias_uteis_esperados"] == 15 for e in corpo)
    assert all(e["data_inicio"] == "2026-09-04" for e in corpo)
    assert corpo[0]["data_fim"] is not None
    # Etapa fora do bloco intocada.
    fora = db_session.get(Etapa, etapas[2]["id"])
    assert fora.bloco_entrega is None


def test_criar_bloco_rejeicoes(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    outro_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    etapas_outro = client.get(f"/projetos/{outro_id}/etapas").json()

    # Menos de 2 etapas → 422 (validação de schema).
    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": [etapas[0]["id"]], "dias_uteis_esperados": 5},
    )
    assert resp.status_code == 422

    # Etapa de outro projeto → 404.
    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": [etapas[0]["id"], etapas_outro[0]["id"]],
              "dias_uteis_esperados": 5},
    )
    assert resp.status_code == 404

    # Etapa já em bloco → 409.
    ok = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": [e["id"] for e in etapas], "dias_uteis_esperados": 5},
    )
    assert ok.status_code == 200
    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": [e["id"] for e in etapas], "dias_uteis_esperados": 5},
    )
    assert resp.status_code == 409


def test_desfazer_bloco_limpa_chave_e_mantem_valores(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    ids = [e["id"] for e in etapas]

    chave = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": ids, "dias_uteis_esperados": 15,
              "data_inicio": "2026-09-04"},
    ).json()[0]["bloco_entrega"]

    resp = client.delete(f"/projetos/{projeto_id}/blocos/{chave}")
    assert resp.status_code == 200, resp.text
    for etapa_id in ids:
        etapa = db_session.get(Etapa, etapa_id)
        db_session.refresh(etapa)
        # Chave limpa; membros mantêm prazo/data (ADR-009).
        assert etapa.bloco_entrega is None
        assert etapa.dias_uteis_esperados == 15
        assert etapa.data_inicio == date(2026, 9, 4)

    # Chave inexistente → 404.
    assert client.delete(f"/projetos/{projeto_id}/blocos/{chave}").status_code == 404
