"""Testes da Fase 13 (ADR-015): dependências informativas entre etapas
(POST/DELETE /etapas/{id}/dependencias) e reverse-calendar
(GET /calendario/dias-uteis, inverso exato de /calendario/data-fim)."""

from app.models.banco_de_dados import EtapaDependencia
from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base


def _etapas(client, projeto_id):
    return client.get(f"/projetos/{projeto_id}/etapas").json()


def test_criar_dependencia_grava_os_dois_sentidos(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = _etapas(client, projeto_id)
    bloqueada, bloqueadora = etapas[0], etapas[1]

    resp = client.post(
        f"/etapas/{bloqueada['id']}/dependencias",
        json={"bloqueada_por_id": bloqueadora["id"]},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    # A resposta é a etapa bloqueada, já com o vínculo em bloqueada_por[].
    assert [d["id"] for d in corpo["bloqueada_por"]] == [bloqueadora["id"]]
    assert corpo["bloqueada_por"][0]["nome"] == bloqueadora["nome"]
    assert corpo["bloqueando"] == []

    # O outro sentido aparece na etapa bloqueadora.
    outra = next(e for e in _etapas(client, projeto_id) if e["id"] == bloqueadora["id"])
    assert [d["id"] for d in outra["bloqueando"]] == [bloqueada["id"]]
    assert outra["bloqueada_por"] == []


def test_remover_dependencia(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = _etapas(client, projeto_id)
    a, b = etapas[0], etapas[1]
    client.post(f"/etapas/{a['id']}/dependencias", json={"bloqueada_por_id": b["id"]})

    resp = client.delete(f"/etapas/{a['id']}/dependencias/{b['id']}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["bloqueada_por"] == []
    # Some do banco.
    assert db_session.query(EtapaDependencia).count() == 0
    # Remover de novo → 404.
    assert client.delete(f"/etapas/{a['id']}/dependencias/{b['id']}").status_code == 404


def test_dependencia_rejeicoes(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    outro_id = _criar_projeto(client, base)
    etapas = _etapas(client, projeto_id)
    etapas_outro = _etapas(client, outro_id)
    a, b = etapas[0], etapas[1]

    # Auto-referência → 422.
    resp = client.post(f"/etapas/{a['id']}/dependencias", json={"bloqueada_por_id": a["id"]})
    assert resp.status_code == 422

    # Etapa bloqueadora de outro projeto → 422.
    resp = client.post(
        f"/etapas/{a['id']}/dependencias",
        json={"bloqueada_por_id": etapas_outro[0]["id"]},
    )
    assert resp.status_code == 422

    # Etapa da rota inexistente → 404.
    resp = client.post("/etapas/99999/dependencias", json={"bloqueada_por_id": b["id"]})
    assert resp.status_code == 404

    # Etapa bloqueadora inexistente → 404.
    resp = client.post(f"/etapas/{a['id']}/dependencias", json={"bloqueada_por_id": 99999})
    assert resp.status_code == 404

    # Duplicata → 409.
    assert client.post(
        f"/etapas/{a['id']}/dependencias", json={"bloqueada_por_id": b["id"]}
    ).status_code == 200
    resp = client.post(f"/etapas/{a['id']}/dependencias", json={"bloqueada_por_id": b["id"]})
    assert resp.status_code == 409

    # Ciclo direto: b já é bloqueada por a → recusar a bloqueada por b (422).
    client.post(f"/etapas/{b['id']}/dependencias", json={"bloqueada_por_id": etapas[2]["id"]})
    resp = client.post(f"/etapas/{b['id']}/dependencias", json={"bloqueada_por_id": a["id"]})
    assert resp.status_code == 422


def test_excluir_projeto_apaga_dependencias(client, db_session):
    # Cascade (ADR-012 + ADR-015): apagar o projeto apaga as dependências
    # (nos dois sentidos) sem erro de integridade.
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = _etapas(client, projeto_id)
    client.post(f"/etapas/{etapas[0]['id']}/dependencias", json={"bloqueada_por_id": etapas[1]["id"]})
    client.post(f"/etapas/{etapas[2]['id']}/dependencias", json={"bloqueada_por_id": etapas[0]["id"]})
    assert db_session.query(EtapaDependencia).count() == 2

    resp = client.delete(f"/projetos/{projeto_id}")
    assert resp.status_code == 204, resp.text
    assert db_session.query(EtapaDependencia).count() == 0


def test_dias_uteis_e_inverso_exato_de_data_fim(client, db_session):
    # Round-trip obrigatório (risco 4 do plano): contar_dias_uteis desfaz
    # calcular_data_fim para data_fim caindo num dia útil.
    inicio = "2026-07-06"  # segunda-feira
    for n in (1, 3, 5, 10, 20):
        fim = client.get(
            f"/calendario/data-fim?data_inicio={inicio}&dias_uteis={n}"
        ).json()["data_fim"]
        resp = client.get(f"/calendario/dias-uteis?data_inicio={inicio}&data_fim={fim}")
        assert resp.status_code == 200, resp.text
        assert resp.json()["dias_uteis"] == n

    # Convenção inclusiva (Fase 16): mesmo dia útil conta como 1.
    resp = client.get(f"/calendario/dias-uteis?data_inicio={inicio}&data_fim={inicio}")
    assert resp.json()["dias_uteis"] == 1

    # data_fim < data_inicio → 0.
    resp = client.get(f"/calendario/dias-uteis?data_inicio={inicio}&data_fim=2026-07-03")
    assert resp.json()["dias_uteis"] == 0
