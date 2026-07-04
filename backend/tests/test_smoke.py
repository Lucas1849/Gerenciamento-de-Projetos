"""Smoke tests da rede mínima de segurança do backend.

Cobrem o cascade de criação de projeto, o soft-delete de EtapaConsultor
(ADR-002) e a independência fase/status (ADR-003).
"""

from app.models.banco_de_dados import Etapa, EtapaConsultor


def _setup_base(client, n_templates=3, n_consultores=2):
    """Cria dados estruturais mínimos: gestão, serviço com templates,
    trabalhadores. Retorna ids úteis."""
    gestao = client.post("/gestoes/", json={"nome": "2026.1", "ativa": True}).json()

    servico = client.post(
        "/servicos/", json={"nome": "Servico Teste", "descricao": "min"}
    ).json()
    template_ids = []
    for i in range(1, n_templates + 1):
        t = client.post(
            "/etapas-template/",
            json={
                "servico_id": servico["id"],
                "ordem": i,
                "nome": f"Etapa {i}",
                "descricao_padrao": f"desc {i}",
                "dias_uteis_esperados_padrao": i * 2,
            },
        ).json()
        template_ids.append(t["id"])

    gerente = client.post(
        "/trabalhadores/",
        json={"nome": "Gerente", "cargo": "gerente", "emailInstitucional": "g@x.com"},
    ).json()
    diretor = client.post(
        "/trabalhadores/",
        json={"nome": "Diretor", "cargo": "diretor", "emailInstitucional": "d@x.com"},
    ).json()
    consultores = []
    for i in range(n_consultores):
        c = client.post(
            "/trabalhadores/",
            json={
                "nome": f"Consultor {i}",
                "cargo": "consultor",
                "emailInstitucional": f"c{i}@x.com",
            },
        ).json()
        consultores.append(c["id"])

    return {
        "gestao_id": gestao["id"],
        "servico_id": servico["id"],
        "template_ids": template_ids,
        "gerente_id": gerente["id"],
        "diretor_id": diretor["id"],
        "consultores_ids": consultores,
    }


def _criar_projeto(client, base):
    resp = client.post(
        "/projetos/",
        json={
            "nome": "Projeto Teste",
            "servico_id": base["servico_id"],
            "gestao_id": base["gestao_id"],
            "gerente_id": base["gerente_id"],
            "diretor_id": base["diretor_id"],
            "consultores_iniciais_ids": base["consultores_ids"],
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_cascade_criacao_projeto(client, db_session):
    base = _setup_base(client, n_templates=3, n_consultores=2)
    projeto = _criar_projeto(client, base)

    etapas = (
        db_session.query(Etapa)
        .filter(Etapa.projeto_id == projeto["id"])
        .order_by(Etapa.ordem)
        .all()
    )
    # Uma etapa por template, na ordem, copiando os campos do template.
    assert len(etapas) == 3
    assert [e.etapa_template_id for e in etapas] == base["template_ids"]
    assert [e.nome for e in etapas] == ["Etapa 1", "Etapa 2", "Etapa 3"]
    assert all(e.status == "nao_iniciada" for e in etapas)

    # Um EtapaConsultor por (etapa, consultor), com data_entrada preenchida.
    for etapa in etapas:
        vinculos = (
            db_session.query(EtapaConsultor)
            .filter(EtapaConsultor.etapa_id == etapa.id)
            .all()
        )
        assert sorted(v.trabalhador_id for v in vinculos) == sorted(
            base["consultores_ids"]
        )
        assert all(v.data_entrada is not None for v in vinculos)
        assert all(v.data_saida is None for v in vinculos)


def test_soft_delete_consultor(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=2)
    projeto = _criar_projeto(client, base)

    etapa = (
        db_session.query(Etapa).filter(Etapa.projeto_id == projeto["id"]).first()
    )
    alvo = base["consultores_ids"][0]

    antes = db_session.query(EtapaConsultor).count()
    resp = client.delete(f"/etapas/{etapa.id}/consultores/{alvo}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["data_saida"] is not None

    # A linha continua existindo no banco, agora com data_saida preenchida.
    assert db_session.query(EtapaConsultor).count() == antes
    vinculo = (
        db_session.query(EtapaConsultor)
        .filter(
            EtapaConsultor.etapa_id == etapa.id,
            EtapaConsultor.trabalhador_id == alvo,
        )
        .one()
    )
    assert vinculo.data_saida is not None

    # E o consultor sai da equipe ativa da etapa.
    detalhe = client.get(f"/projetos/{projeto['id']}").json()
    etapa_resp = next(e for e in detalhe["etapas"] if e["id"] == etapa.id)
    assert alvo not in [c["id"] for c in etapa_resp["consultores"]]


def test_independencia_fase_status(client, db_session):
    base = _setup_base(client, n_templates=2, n_consultores=1)
    projeto = _criar_projeto(client, base)
    etapas = db_session.query(Etapa).filter(Etapa.projeto_id == projeto["id"]).all()

    # Mudar a fase do projeto não altera nenhum Etapa.status (ADR-003).
    resp = client.put(f"/projetos/{projeto['id']}", json={"fase": "andamento"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["fase"] == "andamento"
    for e in etapas:
        db_session.refresh(e)
        assert e.status == "nao_iniciada"

    # Mudar o status de uma etapa não altera a fase do projeto.
    resp = client.put(f"/etapas/{etapas[0].id}/status", json={"status": "concluida"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "concluida"
    assert client.get(f"/projetos/{projeto['id']}").json()["fase"] == "andamento"
    # E as demais etapas seguem intactas.
    for e in etapas[1:]:
        db_session.refresh(e)
        assert e.status == "nao_iniciada"
