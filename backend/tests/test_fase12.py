"""Testes da Fase 12 (ADR-014): edição pós-criação de etapas (PATCH /etapas/{id}
com propagação de bloco), reordenação (PUT /projetos/{id}/etapas/ordem) e
cascata de datas (POST /calendario/cascata)."""

from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base


def _bloco(client, projeto_id, etapa_ids):
    resp = client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": etapa_ids, "dias_uteis_esperados": 15,
              "data_inicio": "2026-09-04"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()[0]["bloco_entrega"]


def test_editar_etapa_avulsa(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = client.get(f"/projetos/{projeto_id}/etapas").json()[0]

    resp = client.patch(
        f"/etapas/{etapa['id']}",
        json={"nome": "Renomeada", "descricao": "Nova descrição",
              "dias_uteis_esperados": 7, "data_inicio": "2026-07-06"},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert corpo["nome"] == "Renomeada"
    assert corpo["descricao"] == "Nova descrição"
    assert corpo["dias_uteis_esperados"] == 7
    assert corpo["data_inicio"] == "2026-07-06"
    # data_fim continua derivada (ADR-008), na convenção inclusiva (Fase 16):
    # 06/07 (seg) conta como dia 1 → 7 dias úteis terminam em 14/07.
    assert corpo["data_fim"] == "2026-07-14"


def test_editar_dias_data_de_membro_propaga_ao_bloco(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    _bloco(client, projeto_id, [etapas[0]["id"], etapas[1]["id"]])

    # Status individual de um membro, para conferir que não é tocado.
    client.put(f"/etapas/{etapas[1]['id']}/status", json={"status": "em_andamento"})

    resp = client.patch(
        f"/etapas/{etapas[0]['id']}",
        json={"dias_uteis_esperados": 20, "data_inicio": "2026-10-01"},
    )
    assert resp.status_code == 200, resp.text

    depois = client.get(f"/projetos/{projeto_id}/etapas").json()
    membros = [e for e in depois if e["bloco_entrega"] is not None]
    assert len(membros) == 2
    for m in membros:
        assert m["dias_uteis_esperados"] == 20
        assert m["data_inicio"] == "2026-10-01"
    # Status permanece individual; a etapa fora do bloco não é tocada.
    assert next(e for e in depois if e["id"] == etapas[1]["id"])["status"] == "em_andamento"
    fora = next(e for e in depois if e["id"] == etapas[2]["id"])
    assert fora["dias_uteis_esperados"] != 20


def test_editar_nome_de_membro_nao_propaga(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    _bloco(client, projeto_id, [etapas[0]["id"], etapas[1]["id"]])

    resp = client.patch(f"/etapas/{etapas[0]['id']}", json={"nome": "Só eu"})
    assert resp.status_code == 200, resp.text

    depois = client.get(f"/projetos/{projeto_id}/etapas").json()
    assert next(e for e in depois if e["id"] == etapas[0]["id"])["nome"] == "Só eu"
    assert next(e for e in depois if e["id"] == etapas[1]["id"])["nome"] != "Só eu"


def test_editar_etapa_rejeicoes(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = client.get(f"/projetos/{projeto_id}/etapas").json()[0]

    # Etapa inexistente → 404.
    assert client.patch("/etapas/99999", json={"nome": "x"}).status_code == 404
    # Data implausível (Fase 10) → 422.
    resp = client.patch(f"/etapas/{etapa['id']}", json={"data_inicio": "1999-01-01"})
    assert resp.status_code == 422


def test_reordenar_etapas(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    ids = [e["id"] for e in etapas]

    nova_ordem = [ids[2], ids[0], ids[1]]
    resp = client.put(f"/projetos/{projeto_id}/etapas/ordem", json={"ordem": nova_ordem})
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert [e["id"] for e in corpo] == nova_ordem
    assert [e["ordem"] for e in corpo] == [1, 2, 3]


def test_reordenar_lista_divergente_422(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    ids = [e["id"] for e in client.get(f"/projetos/{projeto_id}/etapas").json()]

    # Lista incompleta → 422.
    resp = client.put(f"/projetos/{projeto_id}/etapas/ordem", json={"ordem": ids[:2]})
    assert resp.status_code == 422
    # Id estranho → 422.
    resp = client.put(
        f"/projetos/{projeto_id}/etapas/ordem", json={"ordem": ids[:2] + [99999]}
    )
    assert resp.status_code == 422
    # Projeto inexistente → 404.
    resp = client.put("/projetos/99999/etapas/ordem", json={"ordem": ids})
    assert resp.status_code == 404


def test_cascata_encadeia_datas(client):
    # Exemplo do plano: 06/07/2026 (seg) + 1 dia útil → 07/07; + 2 → 09/07.
    resp = client.post(
        "/calendario/cascata",
        json={"data_inicio": "2026-07-06", "dias": [1, 2, 5]},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["inicios"] == ["2026-07-06", "2026-07-07", "2026-07-09"]

    # Data implausível → 422 (validador da Fase 10 no schema).
    resp = client.post(
        "/calendario/cascata", json={"data_inicio": "1999-01-01", "dias": [1]}
    )
    assert resp.status_code == 422
