"""Testes da Fase 8: blocos com N etapas — estender e retirar etapa específica
(POST /projetos/{id}/blocos/{chave}/etapas, DELETE .../etapas/{etapa_id})."""

from datetime import date

from app.models.banco_de_dados import Etapa
from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base


def _bloco_de_2(client, projeto_id, etapas):
    """Forma um bloco com as 2 primeiras etapas e devolve a chave."""
    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": [etapas[0]["id"], etapas[1]["id"]],
              "dias_uteis_esperados": 15, "data_inicio": "2026-09-04"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()[0]["bloco_entrega"]


def test_criar_bloco_com_3_etapas_direto(client, db_session):
    # A criação com N>2 já funciona — documentado com teste.
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()

    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": [e["id"] for e in etapas], "dias_uteis_esperados": 10},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert len(corpo) == 3
    assert len({e["bloco_entrega"] for e in corpo}) == 1


def test_estender_bloco_adota_prazo_data_e_preserva_status(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    chave = _bloco_de_2(client, projeto_id, etapas)

    # A etapa a adicionar tem status próprio, que deve ser preservado.
    terceira = etapas[2]["id"]
    client.put(f"/etapas/{terceira}/status", json={"status": "em_andamento"})

    resp = client.post(
        f"/projetos/{projeto_id}/blocos/{chave}/etapas",
        json={"etapa_ids": [terceira]},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert len(corpo) == 3
    nova = next(e for e in corpo if e["id"] == terceira)
    # Adota prazo/data do bloco (ADR-009), mantém status individual.
    assert nova["bloco_entrega"] == chave
    assert nova["dias_uteis_esperados"] == 15
    assert nova["data_inicio"] == "2026-09-04"
    assert nova["status"] == "em_andamento"


def test_estender_bloco_rejeicoes(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    outro_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    etapas_outro = client.get(f"/projetos/{outro_id}/etapas").json()
    chave = _bloco_de_2(client, projeto_id, etapas)
    terceira = etapas[2]["id"]

    # Bloco inexistente → 404.
    resp = client.post(
        f"/projetos/{projeto_id}/blocos/nao-existe/etapas",
        json={"etapa_ids": [terceira]},
    )
    assert resp.status_code == 404

    # Ids repetidos → 422.
    resp = client.post(
        f"/projetos/{projeto_id}/blocos/{chave}/etapas",
        json={"etapa_ids": [terceira, terceira]},
    )
    assert resp.status_code == 422

    # Etapa de outro projeto → 404.
    resp = client.post(
        f"/projetos/{projeto_id}/blocos/{chave}/etapas",
        json={"etapa_ids": [etapas_outro[0]["id"]]},
    )
    assert resp.status_code == 404

    # Etapa já em bloco (inclusive membro do próprio) → 409.
    resp = client.post(
        f"/projetos/{projeto_id}/blocos/{chave}/etapas",
        json={"etapa_ids": [etapas[0]["id"]]},
    )
    assert resp.status_code == 409


def test_retirar_etapa_de_bloco_de_3_mantem_bloco(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    chave = _bloco_de_2(client, projeto_id, etapas)
    client.post(f"/projetos/{projeto_id}/blocos/{chave}/etapas",
                json={"etapa_ids": [etapas[2]["id"]]})

    resp = client.delete(
        f"/projetos/{projeto_id}/blocos/{chave}/etapas/{etapas[1]['id']}"
    )
    assert resp.status_code == 200, resp.text

    retirada = db_session.get(Etapa, etapas[1]["id"])
    db_session.refresh(retirada)
    # Volta a ser avulsa mantendo prazo/data.
    assert retirada.bloco_entrega is None
    assert retirada.dias_uteis_esperados == 15
    assert retirada.data_inicio == date(2026, 9, 4)
    # Os outros 2 continuam no bloco.
    for etapa_id in (etapas[0]["id"], etapas[2]["id"]):
        etapa = db_session.get(Etapa, etapa_id)
        db_session.refresh(etapa)
        assert etapa.bloco_entrega == chave


def test_retirar_etapa_de_bloco_de_2_dissolve_o_bloco(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    chave = _bloco_de_2(client, projeto_id, etapas)

    resp = client.delete(
        f"/projetos/{projeto_id}/blocos/{chave}/etapas/{etapas[0]['id']}"
    )
    assert resp.status_code == 200, resp.text
    # Invariante: bloco mínimo = 2 — o membro restante também dissolve.
    for e in etapas:
        etapa = db_session.get(Etapa, e["id"])
        db_session.refresh(etapa)
        assert etapa.bloco_entrega is None
        assert etapa.dias_uteis_esperados == 15


def test_retirar_etapa_404s(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    chave = _bloco_de_2(client, projeto_id, etapas)

    # Bloco inexistente → 404.
    resp = client.delete(
        f"/projetos/{projeto_id}/blocos/nao-existe/etapas/{etapas[0]['id']}"
    )
    assert resp.status_code == 404

    # Etapa do projeto mas fora do bloco → 404.
    resp = client.delete(
        f"/projetos/{projeto_id}/blocos/{chave}/etapas/{etapas[2]['id']}"
    )
    assert resp.status_code == 404
