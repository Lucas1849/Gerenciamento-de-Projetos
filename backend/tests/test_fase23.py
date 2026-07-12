"""Testes da Fase 23 (ADR-025): feriados municipais de Uberlândia no
cálculo de dias úteis — a data final derivada pula os quatro feriados
municipais (Decreto nº 22.174/2025) além dos nacionais.

Datas de referência (2026): Sexta-feira Santa 03/04, Corpus Christi 04/06,
Nossa Senhora da Abadia 15/08 (sábado em 2026 — caso fixo testado em 2025,
quando cai numa sexta), Aniversário de Uberlândia 31/08 (segunda)."""

from datetime import date

from app.utils.calendario import calcular_data_fim, contar_dias_uteis


def test_aniversario_de_uberlandia_alonga_a_data_fim():
    # sex 28/08/2026 + 2 dias úteis: sem o feriado seria seg 31/08;
    # com o municipal, pula para ter 01/09.
    assert calcular_data_fim(date(2026, 8, 28), 2) == date(2026, 9, 1)


def test_nossa_senhora_da_abadia_em_dia_de_semana():
    # qui 14/08/2025 + 2 dias úteis: sex 15/08 é feriado municipal,
    # o dia 2 vira seg 18/08.
    assert calcular_data_fim(date(2025, 8, 14), 2) == date(2025, 8, 18)


def test_corpus_christi_municipal():
    # qua 03/06/2026 + 2 dias úteis: qui 04/06 (Corpus Christi) pulado,
    # dia 2 é sex 05/06.
    assert calcular_data_fim(date(2026, 6, 3), 2) == date(2026, 6, 5)


def test_sexta_feira_santa_municipal():
    # qui 02/04/2026 + 2 dias úteis: sex 03/04 (Sexta-feira Santa) pulada,
    # dia 2 é seg 06/04.
    assert calcular_data_fim(date(2026, 4, 2), 2) == date(2026, 4, 6)


def test_inicio_em_feriado_municipal_cai_no_proximo_dia_util():
    # início em seg 31/08/2026 (feriado municipal): dia útil 1 é ter 01/09.
    assert calcular_data_fim(date(2026, 8, 31), 1) == date(2026, 9, 1)


def test_ida_e_volta_exata_cruzando_feriado_municipal():
    # contar_dias_uteis continua o inverso exato de calcular_data_fim
    # (convenção inclusiva da Fase 16) num intervalo que cruza 31/08.
    inicio = date(2026, 8, 26)
    for n in range(1, 8):
        assert contar_dias_uteis(inicio, calcular_data_fim(inicio, n)) == n


def test_regressao_feriado_nacional_07_setembro():
    # sex 04/09/2026 + 2 dias úteis: seg 07/09 (nacional) segue pulado,
    # dia 2 é ter 08/09 — a base nacional não regrediu.
    assert calcular_data_fim(date(2026, 9, 4), 2) == date(2026, 9, 8)
