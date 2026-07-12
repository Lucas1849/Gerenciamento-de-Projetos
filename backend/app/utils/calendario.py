"""Cálculo de datas por dias úteis (Fase 5).

Fonte única do cálculo: o frontend nunca calcula datas localmente — usa
GET /calendario/data-fim. Desde a Fase 23 (ADR-025) considera, além dos
feriados nacionais, os feriados municipais de Uberlândia/MG.
"""

from datetime import date

from workalendar.america import BrazilMinasGerais


class Uberlandia(BrazilMinasGerais):
    """Feriados municipais de Uberlândia/MG sobre a base estadual de MG.

    Transcrito em 12/07/2026 do calendário oficial da Prefeitura de
    Uberlândia (Decreto Municipal nº 22.174, de 06/10/2025 — Calendário
    Oficial de Feriados de 2026): quatro feriados municipais — Sexta-feira
    Santa e Corpus Christi (móveis, ativados via flags do workalendar, que
    não os traz na base nacional) e os fixos 15/08 (Nossa Senhora da
    Abadia, padroeira) e 31/08 (Aniversário de Uberlândia). Conteúdo
    validado por fonte oficial, padrão ADR-005 — não editar de memória.
    """

    include_good_friday = True
    good_friday_label = "Sexta-feira Santa"
    include_corpus_christi = True

    FIXED_HOLIDAYS = BrazilMinasGerais.FIXED_HOLIDAYS + (
        (8, 15, "Nossa Senhora da Abadia (padroeira de Uberlândia)"),
        (8, 31, "Aniversário de Uberlândia"),
    )


_calendario = Uberlandia()

# Teto de dias úteis por etapa (hardening de segurança, 12/07/2026): sem ele,
# calcular_data_fim/contar_dias_uteis iteram add_working_days um dia por vez
# (workalendar), então um valor absurdo (ex.: 2_000_000 ⇒ ~10s de CPU num
# único request, medido) trava um worker — DoS trivial numa API sem auth nem
# rate limit. 2000 dias úteis ≈ 8 anos, folgadamente além da janela de
# plausibilidade de datas (~4 anos, Fase 10). Aplicado como le=... nos Query/
# Field de entrada (422 limpo) e reforçado defensivamente aqui, protegendo o
# caminho de leitura de qualquer dado fora da faixa. Ver docs de hardening.
MAX_DIAS_UTEIS = 2000


def _primeiro_dia_util(data: date) -> date:
    """Primeiro dia útil >= data (a própria data, se já for útil)."""
    if _calendario.is_working_day(data):
        return data
    return _calendario.add_working_days(data, 1)


def calcular_data_fim(data_inicio: date, dias_uteis: int) -> date:
    """Data final na convenção INCLUSIVA (Fase 16, ADR-018): o dia de início
    conta como dia útil 1 — seg 23/02 + 5 dias úteis ⇒ sex 27/02. Se o início
    cai em fim de semana/feriado, o dia 1 é o primeiro dia útil seguinte.
    dias_uteis <= 0 devolve o próprio início normalizado. dias_uteis acima de
    MAX_DIAS_UTEIS é rejeitado (guarda anti-DoS — ver MAX_DIAS_UTEIS)."""
    if dias_uteis > MAX_DIAS_UTEIS:
        raise ValueError(
            f"dias úteis fora do limite: máximo {MAX_DIAS_UTEIS}"
        )
    inicio = _primeiro_dia_util(data_inicio)
    if dias_uteis <= 0:
        return inicio
    return _calendario.add_working_days(inicio, dias_uteis - 1)


def contar_dias_uteis(data_inicio: date, data_fim: date) -> int:
    """Inverso exato de calcular_data_fim na convenção inclusiva (Fase 16):
    menor N tal que calcular_data_fim(data_inicio, N) >= data_fim — contagem
    inclusiva nas duas pontas (contar(d, d) = 1 para d dia útil). data_fim em
    fim de semana/feriado arredonda para o dia útil que cobre;
    data_fim < data_inicio → 0.

    Itera add_working_days em vez de usar um delta pronto para garantir a
    ida-e-volta exata com a mesma convenção (mesmos feriados nacionais) —
    mesmo rigor do risco registrado na Fase 13."""
    if data_fim < data_inicio:
        return 0
    dias = 1
    corrente = _primeiro_dia_util(data_inicio)
    while corrente < data_fim:
        corrente = _calendario.add_working_days(corrente, 1)
        dias += 1
        if dias > MAX_DIAS_UTEIS:
            # data_fim absurdamente distante: aborta o laço (guarda anti-DoS,
            # ver MAX_DIAS_UTEIS) em vez de iterar milhões de dias.
            raise ValueError(
                f"intervalo fora do limite: máximo {MAX_DIAS_UTEIS} dias úteis"
            )
    return dias


def proximo_dia_util(data: date) -> date:
    """Primeiro dia útil estritamente após `data` (Fase 16): usado pela
    cascata — a próxima etapa começa no dia útil seguinte à entrega."""
    return _calendario.add_working_days(data, 1)


def janela_datas_plausiveis() -> tuple[date, date]:
    """Janela dinâmica de plausibilidade (Fase 10): 01/01/(ano atual − 1) a
    31/12/(ano atual + 2) — cobre gestões passadas recentes e planejamento
    futuro razoável. Se a empresa passar a planejar mais de 2 anos à frente,
    ajustar as constantes aqui (decisão barata, registrada no plano)."""
    ano = date.today().year
    return date(ano - 1, 1, 1), date(ano + 2, 12, 31)


def validar_data_plausivel(data_inicio: date | None) -> date | None:
    """Validador (usado nos schemas Pydantic): rejeita datas fora da janela
    de plausibilidade com mensagem em português. None passa (data opcional)."""
    if data_inicio is None:
        return None
    minimo, maximo = janela_datas_plausiveis()
    if not minimo <= data_inicio <= maximo:
        raise ValueError(
            "data de início implausível: deve estar entre "
            f"{minimo.strftime('%d/%m/%Y')} e {maximo.strftime('%d/%m/%Y')}"
        )
    return data_inicio
