"""Fase 21 (ADR-023): seed de professores orientadores + coluna
interesse_orientar.

O seed roda contra o banco de teste com um dataset fixture pequeno (o real é
gitignorado — dados pessoais, repo público) cobrindo os três perfis: com
pesquisa (interesse_orientar True/False), só com alinhamento da Controle e
sem nada."""

from app.models.banco_de_dados import Professor
from app.seed_professores import carregar_dataset, executar_seed

FIXTURE = [
    {
        "nome": "Fulana de Souza Exemplo",
        "email": "fulana@ufu.br",
        "servico_interesse": "Pesquisa de Mercado, Plano de Marketing",
        "interesse_orientar": True,
        "contato": None,
        "observacoes": "Pesquisa IES 06/2026 — depto Marketing · 2h/semana",
    },
    {
        "nome": "Beltrano Fictício da Silva",
        "email": "beltrano@ufu.br",
        "servico_interesse": "Plano Financeiro",
        "interesse_orientar": None,
        "contato": None,
        "observacoes": None,
    },
    {
        "nome": "Sicrana Ilustrativa Pereira",
        "email": "sicrana@ufu.br",
        "servico_interesse": None,
        "interesse_orientar": False,
        "contato": None,
        "observacoes": "Pesquisa IES 06/2026 — depto Finanças",
    },
    {
        "nome": "Docente Sem Registro Algum",
        "email": "docente@ufu.br",
        "servico_interesse": None,
        "interesse_orientar": None,
        "contato": None,
        "observacoes": None,
    },
]


def test_seed_popula_os_tres_perfis(db_session):
    criados, pulados = executar_seed(db_session, FIXTURE)
    assert (criados, pulados) == (4, 0)

    por_nome = {p.nome: p for p in db_session.query(Professor).all()}
    assert len(por_nome) == 4

    com_pesquisa = por_nome["Fulana de Souza Exemplo"]
    assert com_pesquisa.servico_interesse == "Pesquisa de Mercado, Plano de Marketing"
    assert com_pesquisa.interesse_orientar is True
    assert "Pesquisa IES" in com_pesquisa.observacoes
    assert com_pesquisa.contato is None  # nenhuma planilha tem telefone

    so_alinhamento = por_nome["Beltrano Fictício da Silva"]
    assert so_alinhamento.servico_interesse == "Plano Financeiro"
    assert so_alinhamento.interesse_orientar is None
    assert so_alinhamento.observacoes is None

    recusou = por_nome["Sicrana Ilustrativa Pereira"]
    assert recusou.interesse_orientar is False
    assert recusou.servico_interesse is None


def test_seed_e_idempotente(db_session):
    executar_seed(db_session, FIXTURE)
    criados, pulados = executar_seed(db_session, FIXTURE)
    assert (criados, pulados) == (0, 4)
    assert db_session.query(Professor).count() == 4


def test_seed_pula_por_nome_e_completa_os_demais(db_session):
    db_session.add(Professor(nome="Fulana de Souza Exemplo"))
    db_session.commit()
    criados, pulados = executar_seed(db_session, FIXTURE)
    assert (criados, pulados) == (3, 1)


def test_dataset_real_ausente_da_erro_claro(tmp_path):
    import pytest

    with pytest.raises(FileNotFoundError, match="OneDrive"):
        carregar_dataset(tmp_path / "nao_existe.json")


def test_exemplo_commitado_tem_o_formato_esperado():
    import os

    exemplo = os.path.join(
        os.path.dirname(__file__), "..", "app", "dados",
        "professores_seed.exemplo.json",
    )
    dados = carregar_dataset(__import__("pathlib").Path(exemplo))
    assert {"nome", "email", "servico_interesse", "interesse_orientar"} <= set(dados[0])


def test_interesse_orientar_no_post_e_put(client):
    r = client.post("/professores/", json={"nome": "Prof. API", "interesse_orientar": True})
    assert r.status_code == 200
    prof = r.json()
    assert prof["interesse_orientar"] is True

    r = client.put(f"/professores/{prof['id']}", json={"interesse_orientar": False})
    assert r.json()["interesse_orientar"] is False

    r = client.put(f"/professores/{prof['id']}", json={"interesse_orientar": None})
    assert r.json()["interesse_orientar"] is None


def test_professores_seedados_aparecem_no_get(client, db_session):
    executar_seed(db_session, FIXTURE)
    nomes = {p["nome"] for p in client.get("/professores/").json()}
    assert {f["nome"] for f in FIXTURE} <= nomes
