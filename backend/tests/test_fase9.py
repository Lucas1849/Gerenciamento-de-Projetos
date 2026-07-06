"""Testes da Fase 9: exclusão de projetos (cascata) e gestões (bloqueada
com projetos) — DELETE /projetos/{id} e DELETE /gestoes/{id} (ADR-012)."""

from app.models.banco_de_dados import Etapa, EtapaConsultor, Projeto
from tests.test_smoke import _criar_projeto, _setup_base


def test_excluir_projeto_cascata_completa(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=2)
    projeto = _criar_projeto(client, base)
    projeto_id = projeto["id"]
    assert db_session.query(Etapa).filter(Etapa.projeto_id == projeto_id).count() == 3
    assert db_session.query(EtapaConsultor).count() == 6

    resp = client.delete(f"/projetos/{projeto_id}")
    assert resp.status_code == 204, resp.text

    # Cascata: EtapaConsultor → Etapas → Projeto, tudo apagado.
    assert db_session.get(Projeto, projeto_id) is None
    assert db_session.query(Etapa).filter(Etapa.projeto_id == projeto_id).count() == 0
    assert db_session.query(EtapaConsultor).count() == 0


def test_excluir_projeto_inexistente_404(client, db_session):
    assert client.delete("/projetos/999").status_code == 404


def test_excluir_gestao_com_projetos_bloqueada(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    _criar_projeto(client, base)

    resp = client.delete(f"/gestoes/{base['gestao_id']}")
    assert resp.status_code == 409
    assert "projeto(s)" in resp.json()["detail"]


def test_excluir_gestao_vazia(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto = _criar_projeto(client, base)

    # Depois de excluir o projeto, a gestão fica vazia e pode ser excluída.
    assert client.delete(f"/projetos/{projeto['id']}").status_code == 204
    assert client.delete(f"/gestoes/{base['gestao_id']}").status_code == 204
    assert client.get("/gestoes/").json() == []


def test_excluir_gestao_inexistente_404(client, db_session):
    assert client.delete("/gestoes/999").status_code == 404
