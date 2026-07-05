"""Testes da Fase 5: calendário de dias úteis, blocos de entrega no cascade
e criação de projeto com etapas customizadas (ADR-008)."""

from datetime import date

from app.models.banco_de_dados import Etapa
from app.utils.calendario import calcular_data_fim
from tests.test_smoke import _setup_base


# ─── Calendário ──────────────────────────────────────────────────────────────

def test_calcular_data_fim_pula_fim_de_semana():
    # Sexta 04/09/2026 + 1 dia útil = segunda 07/09? Não: 07/09 é feriado.
    # Caso simples sem feriado: quinta 10/09/2026 + 2 dias úteis = segunda 14/09.
    assert calcular_data_fim(date(2026, 9, 10), 2) == date(2026, 9, 14)


def test_calcular_data_fim_pula_feriado_nacional():
    # Sexta 04/09/2026 + 3 dias úteis: pula sáb/dom e o feriado de 07/09
    # (Independência) → quinta 10/09.
    assert calcular_data_fim(date(2026, 9, 4), 3) == date(2026, 9, 10)


def test_endpoint_data_fim(client):
    resp = client.get(
        "/calendario/data-fim",
        params={"data_inicio": "2026-09-04", "dias_uteis": 3},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data_fim"] == "2026-09-10"


# ─── Blocos no caminho padrão (templates com ordem repetida) ────────────────

def test_cascade_materializa_bloco_de_templates(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=1)
    # Dois templates extras com a MESMA ordem (2) = entrega em bloco.
    for nome in ("Bloco A", "Bloco B"):
        client.post(
            "/etapas-template/",
            json={"servico_id": base["servico_id"], "ordem": 2, "nome": nome},
        )
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
        },
    )
    assert resp.status_code == 200, resp.text
    etapas = (
        db_session.query(Etapa)
        .filter(Etapa.projeto_id == resp.json()["id"])
        .order_by(Etapa.ordem)
        .all()
    )
    assert len(etapas) == 3
    # A etapa avulsa não tem chave de bloco; as duas do bloco compartilham a mesma.
    assert etapas[0].bloco_entrega is None
    assert etapas[1].bloco_entrega is not None
    assert etapas[1].bloco_entrega == etapas[2].bloco_entrega


# ─── Criação customizada (ADR-008) ──────────────────────────────────────────

def test_criacao_customizada_reordenada_editada_e_manual(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=1)
    t1, t2 = base["template_ids"]
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P custom",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            "consultores_iniciais_ids": base["consultores_ids"],
            "etapas": [
                # Reordenada (template 2 antes do 1), editada (nome/dias/data)
                {"nome": "Etapa 2 editada", "dias_uteis_esperados": 5,
                 "data_inicio": "2026-09-04", "etapa_template_id": t2},
                {"nome": "Etapa 1", "etapa_template_id": t1},
                # Manual, fora do template.
                {"nome": "Extra manual", "dias_uteis_esperados": 3},
            ],
        },
    )
    assert resp.status_code == 200, resp.text
    etapas = (
        db_session.query(Etapa)
        .filter(Etapa.projeto_id == resp.json()["id"])
        .order_by(Etapa.ordem)
        .all()
    )
    # Ordem posicional atribuída pelo backend (índice + 1).
    assert [e.ordem for e in etapas] == [1, 2, 3]
    assert [e.nome for e in etapas] == ["Etapa 2 editada", "Etapa 1", "Extra manual"]
    assert etapas[0].etapa_template_id == t2
    assert etapas[0].dias_uteis_esperados == 5
    assert etapas[0].data_inicio == date(2026, 9, 4)
    assert etapas[2].etapa_template_id is None
    # Consultores iniciais atribuídos também às etapas customizadas.
    detalhe = client.get(f"/projetos/{resp.json()['id']}").json()
    assert all(len(e["consultores"]) == 1 for e in detalhe["etapas"])
    # data_fim derivada na resposta (04/09 + 5 dias úteis, pulando 07/09).
    assert detalhe["etapas"][0]["data_fim"] == "2026-09-14"


def test_criacao_customizada_com_bloco_grupo(client, db_session):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P bloco",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            "etapas": [
                {"nome": "A", "dias_uteis_esperados": 10,
                 "data_inicio": "2026-09-10", "bloco_grupo": "g1"},
                {"nome": "B", "dias_uteis_esperados": 99, "bloco_grupo": "g1"},
                {"nome": "C"},
            ],
        },
    )
    assert resp.status_code == 200, resp.text
    etapas = (
        db_session.query(Etapa)
        .filter(Etapa.projeto_id == resp.json()["id"])
        .order_by(Etapa.ordem)
        .all()
    )
    # Mesmo grupo → mesma chave uuid e prazo/data normalizados pelo 1º item.
    assert etapas[0].bloco_entrega == etapas[1].bloco_entrega is not None
    assert etapas[1].dias_uteis_esperados == 10
    assert etapas[1].data_inicio == date(2026, 9, 10)
    assert etapas[2].bloco_entrega is None


def test_etapas_vazia_rejeitada_com_422(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            "etapas": [],
        },
    )
    assert resp.status_code == 422


def test_template_de_outro_servico_rejeitado_com_404(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    outro = client.post("/servicos/", json={"nome": "Outro Servico"}).json()
    t_outro = client.post(
        "/etapas-template/",
        json={"servico_id": outro["id"], "ordem": 1, "nome": "Alheia"},
    ).json()
    resp = client.post(
        "/projetos/",
        json={
            "nome": "P",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            "etapas": [{"nome": "X", "etapa_template_id": t_outro["id"]}],
        },
    )
    assert resp.status_code == 404
