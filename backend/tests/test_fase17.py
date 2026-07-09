"""Testes da Fase 17 (ADR-019): Termo Aditivo — registro formal de dias
adicionais por etapa/bloco, com trava por documento anexado."""

from tests.test_fase6 import _criar_projeto
from tests.test_smoke import _setup_base


def _etapa_com_datas(client, base, projeto_id):
    etapa = client.get(f"/projetos/{projeto_id}/etapas").json()[0]
    resp = client.patch(
        f"/etapas/{etapa['id']}",
        # Seg 06/07/2026 + 5 dias úteis inclusivos → sex 10/07 (Fase 16).
        json={"dias_uteis_esperados": 5, "data_inicio": "2026-07-06"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_termo_desloca_data_fim_e_preserva_original(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = _etapa_com_datas(client, base, projeto_id)
    assert etapa["data_fim"] == "2026-07-10"
    assert etapa["data_fim_original"] == "2026-07-10"

    resp = client.post(
        f"/etapas/{etapa['id']}/termos-aditivos",
        json={"dias_adicionais": 3, "motivo": "Cliente atrasou os dados"},
    )
    assert resp.status_code == 200, resp.text
    corpo = resp.json()
    # 5 + 3 dias inclusivos a partir de 06/07 → qua 15/07; compromisso intacto.
    assert corpo["dias_aditivos"] == 3
    assert corpo["dias_uteis_esperados"] == 5
    assert corpo["data_fim"] == "2026-07-15"
    assert corpo["data_fim_original"] == "2026-07-10"
    assert len(corpo["termos_aditivos"]) == 1
    assert corpo["termos_aditivos"][0]["motivo"] == "Cliente atrasou os dados"


def test_soma_de_multiplos_termos(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = _etapa_com_datas(client, base, projeto_id)
    client.post(f"/etapas/{etapa['id']}/termos-aditivos",
                json={"dias_adicionais": 2, "motivo": "a"})
    resp = client.post(f"/etapas/{etapa['id']}/termos-aditivos",
                       json={"dias_adicionais": 3, "motivo": "b"})
    corpo = resp.json()
    assert corpo["dias_aditivos"] == 5
    assert len(corpo["termos_aditivos"]) == 2
    # 5 + 5 = 10 dias inclusivos a partir de 06/07 → sex 17/07.
    assert corpo["data_fim"] == "2026-07-17"


def test_validacoes_404_e_422(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = client.get(f"/projetos/{projeto_id}/etapas").json()[0]

    assert client.post("/etapas/99999/termos-aditivos",
                       json={"dias_adicionais": 1, "motivo": "x"}).status_code == 404
    assert client.post(f"/etapas/{etapa['id']}/termos-aditivos",
                       json={"dias_adicionais": 0, "motivo": "x"}).status_code == 422
    assert client.post(f"/etapas/{etapa['id']}/termos-aditivos",
                       json={"dias_adicionais": 1, "motivo": "   "}).status_code == 422
    assert client.post(f"/etapas/{etapa['id']}/termos-aditivos",
                       json={"dias_adicionais": 1, "motivo": "x",
                             "documento_url": "ftp://x"}).status_code == 422


def test_termo_em_bloco_soma_para_todos_os_membros(client):
    base = _setup_base(client, n_templates=3, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapas = client.get(f"/projetos/{projeto_id}/etapas").json()
    ids = [etapas[0]["id"], etapas[1]["id"]]
    client.post(f"/projetos/{projeto_id}/blocos",
                json={"etapa_ids": ids, "dias_uteis_esperados": 5,
                      "data_inicio": "2026-07-06"})

    # Termo gravado na etapa de referência do bloco (membros[0]).
    resp = client.post(f"/etapas/{ids[0]}/termos-aditivos",
                       json={"dias_adicionais": 2, "motivo": "bloco atrasou"})
    assert resp.status_code == 200, resp.text

    depois = client.get(f"/projetos/{projeto_id}/etapas").json()
    membros = [e for e in depois if e["bloco_entrega"] is not None]
    # A data efetiva considera o Σ do bloco em TODOS os membros.
    assert all(m["dias_aditivos"] == 2 for m in membros)
    assert len({m["data_fim"] for m in membros}) == 1
    assert membros[0]["data_fim"] == "2026-07-14"  # 5+2=7 dias de 06/07
    assert all(m["data_fim_original"] == "2026-07-10" for m in membros)
    # Etapa fora do bloco não é afetada.
    fora = next(e for e in depois if e["bloco_entrega"] is None)
    assert fora["dias_aditivos"] == 0


def test_excluir_termo_restaura_data_e_trava_com_documento(client):
    base = _setup_base(client, n_templates=1, n_consultores=0)
    projeto_id = _criar_projeto(client, base)
    etapa = _etapa_com_datas(client, base, projeto_id)

    termo = client.post(
        f"/etapas/{etapa['id']}/termos-aditivos",
        json={"dias_adicionais": 3, "motivo": "rascunho"},
    ).json()["termos_aditivos"][0]

    # Sem documento: excluível — a data efetiva volta ao compromisso.
    resp = client.delete(f"/etapas/{etapa['id']}/termos-aditivos/{termo['id']}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["data_fim"] == "2026-07-10"
    assert resp.json()["dias_aditivos"] == 0

    # Com documento anexado: DELETE → 409 (formalizado com o cliente).
    termo2 = client.post(
        f"/etapas/{etapa['id']}/termos-aditivos",
        json={"dias_adicionais": 2, "motivo": "formal"},
    ).json()["termos_aditivos"][0]
    resp = client.put(
        f"/etapas/{etapa['id']}/termos-aditivos/{termo2['id']}/documento",
        json={"documento_url": "https://drive.google.com/doc"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["termos_aditivos"][0]["documento_url"].startswith("https://")
    resp = client.delete(f"/etapas/{etapa['id']}/termos-aditivos/{termo2['id']}")
    assert resp.status_code == 409

    # Termo/etapa trocados → 404.
    assert client.delete(f"/etapas/99999/termos-aditivos/{termo2['id']}").status_code == 404
