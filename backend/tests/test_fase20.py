"""Testes da Fase 20 (ADR-022): perfil estendido de Professor (serviço de
interesse em texto livre, contato, observações) e CRUD completo com 409
quando o professor orienta algum projeto."""

from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base


def _criar_professor(client, **campos):
    resp = client.post("/professores/", json={"nome": "Profa. Ana", **campos})
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_criar_com_perfil_estendido(client):
    prof = _criar_professor(
        client,
        email="ana@univ.br",
        servico_interesse="Pesquisa de Mercado",
        contato="(83) 99999-0000",
        observacoes="Prefere reuniões pela manhã",
    )
    assert prof["servico_interesse"] == "Pesquisa de Mercado"
    assert prof["contato"] == "(83) 99999-0000"
    assert prof["observacoes"] == "Prefere reuniões pela manhã"
    # Campos novos são todos opcionais.
    minimo = _criar_professor(client)
    assert minimo["servico_interesse"] is None
    listados = client.get("/professores/").json()
    assert len(listados) == 2


def test_put_parcial(client):
    prof = _criar_professor(client, email="ana@univ.br", contato="antigo")
    resp = client.put(
        f"/professores/{prof['id']}",
        json={"contato": "novo contato", "observacoes": "obs"},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    # Só os campos enviados mudam; os demais permanecem.
    assert corpo["contato"] == "novo contato"
    assert corpo["observacoes"] == "obs"
    assert corpo["nome"] == "Profa. Ana"
    assert corpo["email"] == "ana@univ.br"

    assert client.put("/professores/99999", json={"nome": "x"}).status_code == 404


def test_delete_livre_sem_vinculo(client):
    prof = _criar_professor(client)
    assert client.delete(f"/professores/{prof['id']}").status_code == 200
    assert client.get("/professores/").json() == []
    assert client.delete(f"/professores/{prof['id']}").status_code == 404


def test_delete_409_com_projeto_vinculado(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    prof = _criar_professor(client)
    _criar_projeto(client, base, professor_orientador_id=prof["id"])

    resp = client.delete(f"/professores/{prof['id']}")
    assert resp.status_code == 409
    # Mensagem clara para a UI: nomeia o(s) projeto(s) orientado(s).
    assert "P" in resp.json()["detail"]
    # O professor continua existindo.
    assert len(client.get("/professores/").json()) == 1
