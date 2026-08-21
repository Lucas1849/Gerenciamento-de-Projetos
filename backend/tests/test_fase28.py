"""Testes da Fase 28 (ADR-031): rota de feriados PT-BR para o calendário de
kick-off e persistência da estilização (CalendarioConfig).

Cobre os três tratamentos obrigatórios sobre a saída crua do workalendar
(dedup por data, nomes PT-BR, feriados de fim de semana não filtrados na rota),
a guarda de plausibilidade do ano e o upsert de cores por projeto.
"""

from datetime import date

from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base

ANO = date.today().year + 1  # dentro da janela de plausibilidade (Fase 10)


def test_feriados_formato_e_ano(client):
    resp = client.get(f"/calendario/feriados?ano={ANO}")
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    assert corpo["ano"] == ANO
    assert isinstance(corpo["feriados"], list) and len(corpo["feriados"]) > 0
    for f in corpo["feriados"]:
        assert set(f) == {"data", "nome"}


def test_feriados_sem_datas_duplicadas(client):
    # 21/04 volta duas vezes no cru (Aniversário de MG + Tiradentes) — a rota
    # deve devolver uma entrada por data.
    feriados = client.get(f"/calendario/feriados?ano={ANO}").json()["feriados"]
    datas = [f["data"] for f in feriados]
    assert len(datas) == len(set(datas)), "há datas duplicadas na resposta"


def test_feriados_nomes_em_portugues(client):
    # Nenhum rótulo cru do workalendar (inglês) pode vazar para o slide.
    feriados = client.get(f"/calendario/feriados?ano={ANO}").json()["feriados"]
    nomes = {f["nome"] for f in feriados}
    for ingles in ("Independence Day", "Christmas Day", "New year", "Labour Day"):
        assert ingles not in nomes
    # E os esperados em PT-BR estão presentes.
    assert "Independência do Brasil" in nomes
    assert "Natal" in nomes


def test_feriados_municipais_de_uberlandia_presentes(client):
    feriados = client.get(f"/calendario/feriados?ano={ANO}").json()["feriados"]
    nomes = {f["nome"] for f in feriados}
    assert any("Uberlândia" in n for n in nomes)  # Aniversário de Uberlândia
    assert any("Abadia" in n for n in nomes)      # Nossa Senhora da Abadia
    assert "Sexta-feira Santa" in nomes
    assert "Corpus Christi" in nomes


def test_feriado_21_04_elege_o_nacional(client):
    # Quando estadual e nacional coincidem em 21/04, prevalece Tiradentes.
    feriados = client.get(f"/calendario/feriados?ano={ANO}").json()["feriados"]
    abril21 = [f for f in feriados if f["data"] == f"{ANO}-04-21"]
    assert len(abril21) == 1
    assert abril21[0]["nome"] == "Tiradentes"


def test_ano_fora_da_janela_422(client):
    assert client.get("/calendario/feriados?ano=1990").status_code == 422
    assert client.get("/calendario/feriados?ano=2400").status_code == 422


# ── CalendarioConfig (persistência da estilização) ──────────────────────────

def test_config_default_vazia(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    resp = client.get(f"/projetos/{projeto_id}/calendario-config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"projeto_id": projeto_id, "cores": {}}


def test_config_upsert_roundtrip(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    cores = {"12": "#C9E597", "bloco-abc": "#8C52FF"}
    resp = client.put(
        f"/projetos/{projeto_id}/calendario-config", json={"cores": cores}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["cores"] == cores
    # Persistiu.
    assert client.get(f"/projetos/{projeto_id}/calendario-config").json()["cores"] == cores
    # Segundo PUT sobrescreve (upsert, não duplica).
    novo = {"12": "#2A965C"}
    client.put(f"/projetos/{projeto_id}/calendario-config", json={"cores": novo})
    assert client.get(f"/projetos/{projeto_id}/calendario-config").json()["cores"] == novo


def test_config_hex_invalido_422(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    resp = client.put(
        f"/projetos/{projeto_id}/calendario-config",
        json={"cores": {"12": "roxo"}},
    )
    assert resp.status_code == 422


def test_config_projeto_inexistente_404(client):
    assert client.get("/projetos/99999/calendario-config").status_code == 404
    assert client.put(
        "/projetos/99999/calendario-config", json={"cores": {}}
    ).status_code == 404
