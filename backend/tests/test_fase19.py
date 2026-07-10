"""Testes da Fase 19 (ADR-021): links de entregas e demandas por etapa —
anexo livre e nomeado, sem trava de exclusão, sempre individual por etapa."""

from app.models.banco_de_dados import EtapaLink
from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base


def test_criar_e_excluir_link(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = client.get(f"/projetos/{projeto_id}/etapas").json()[0]

    resp = client.post(
        f"/etapas/{etapa['id']}/links",
        json={"tipo": "entrega", "nome": "Relatório final",
              "url": "https://drive.google.com/rel"},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert len(corpo["links"]) == 1
    link = corpo["links"][0]
    assert link["tipo"] == "entrega"
    assert link["nome"] == "Relatório final"

    resp = client.post(
        f"/etapas/{etapa['id']}/links",
        json={"tipo": "demanda", "nome": "Briefing do cliente",
              "url": "https://drive.google.com/brief"},
    )
    assert len(resp.json()["links"]) == 2

    # Exclusão livre, sem trava (contraste deliberado com o 409 do termo).
    resp = client.delete(f"/etapas/{etapa['id']}/links/{link['id']}")
    assert resp.status_code == 200, resp.text
    restantes = resp.json()["links"]
    assert len(restantes) == 1
    assert restantes[0]["tipo"] == "demanda"


def test_validacoes_404_e_422(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = client.get(f"/projetos/{projeto_id}/etapas").json()[0]

    # Etapa inexistente.
    assert client.post(
        "/etapas/99999/links",
        json={"tipo": "entrega", "nome": "x", "url": "https://x"},
    ).status_code == 404
    # Nome vazio, tipo inválido, URL não-http.
    assert client.post(
        f"/etapas/{etapa['id']}/links",
        json={"tipo": "entrega", "nome": "   ", "url": "https://x"},
    ).status_code == 422
    assert client.post(
        f"/etapas/{etapa['id']}/links",
        json={"tipo": "anexo", "nome": "x", "url": "https://x"},
    ).status_code == 422
    assert client.post(
        f"/etapas/{etapa['id']}/links",
        json={"tipo": "demanda", "nome": "x", "url": "ftp://x"},
    ).status_code == 422

    # DELETE: link inexistente e link de outra etapa.
    assert client.delete(f"/etapas/{etapa['id']}/links/99999").status_code == 404
    link = client.post(
        f"/etapas/{etapa['id']}/links",
        json={"tipo": "entrega", "nome": "x", "url": "https://x"},
    ).json()["links"][0]
    assert client.delete(f"/etapas/99999/links/{link['id']}").status_code == 404


def test_links_nao_propagam_entre_membros_de_bloco(client):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    ids = [etapas[0]["id"], etapas[1]["id"]]
    client.post(
        f"/projetos/{projeto_id}/blocos",
        json={"etapa_ids": ids, "dias_uteis_esperados": 5,
              "data_inicio": "2026-07-06"},
    )

    resp = client.post(
        f"/etapas/{ids[0]}/links",
        json={"tipo": "entrega", "nome": "Só do membro 1",
              "url": "https://drive.google.com/m1"},
    )
    assert resp.status_code == 200, resp.text

    depois = client.get(f"/projetos/{projeto_id}/etapas").json()
    por_id = {e["id"]: e for e in depois}
    # Link fica só na etapa onde foi anexado — nada propaga no bloco.
    assert len(por_id[ids[0]]["links"]) == 1
    assert por_id[ids[1]]["links"] == []


def test_cascade_ao_excluir_projeto(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = client.get(f"/projetos/{projeto_id}/etapas").json()[0]
    client.post(
        f"/etapas/{etapa['id']}/links",
        json={"tipo": "demanda", "nome": "x", "url": "https://x"},
    )
    assert db_session.query(EtapaLink).count() == 1

    assert client.delete(f"/projetos/{projeto_id}").status_code == 204
    # Cascade ORM (padrão ADR-012): links somem com a etapa/projeto.
    assert db_session.query(EtapaLink).count() == 0
