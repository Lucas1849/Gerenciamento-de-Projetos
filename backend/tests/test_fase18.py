"""Testes da Fase 18 (ADR-020, revisada): documentos importantes da área —
links nomeados para o Drive, sem vínculo com gestão/projeto."""


def test_crud_de_documentos(client):
    assert client.get("/documentos/").json() == []

    resp = client.post(
        "/documentos/",
        json={"nome": "Base de Dados", "url": "https://drive.google.com/base"},
    )
    assert resp.status_code == 200, resp.text
    doc = resp.json()
    assert doc["nome"] == "Base de Dados"

    docs = client.get("/documentos/").json()
    assert len(docs) == 1

    assert client.delete(f"/documentos/{doc['id']}").status_code == 204
    assert client.get("/documentos/").json() == []
    assert client.delete(f"/documentos/{doc['id']}").status_code == 404


def test_validacoes_422(client):
    assert client.post(
        "/documentos/", json={"nome": "X", "url": "ftp://x"}
    ).status_code == 422
    assert client.post(
        "/documentos/", json={"nome": "   ", "url": "https://x"}
    ).status_code == 422
