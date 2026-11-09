// Montagem do slide "Cronograma de Execução" da proposta (Fase 32, ADR-036).
//
// Dadas as etapas de um projeto (com `fase_escopo`, `bloco_entrega`, `ordem`,
// `dias_uteis_esperados` — Fase 31/ADR-035), produz as quatro fases × linhas
// de prazo que o componente SVG desenha. Reaproveita `agruparCards` (já usado
// pelo Kanban/tabela/cronograma) para a regra "linha de prazo = bloco de
// entrega, ou etapa solta = bloco de 1" (achado da spec: a célula mesclada do
// slide JÁ É `Etapa.bloco_entrega`, nenhum conceito novo). A numeração (1ª,
// 2ª…) é global e sequencial por `ordem`, atravessando as fases.

import { agruparCards } from './etapasUtils';
import { ORDEM_FASES_ESCOPO } from './fasesEscopo';
import { quebrarTexto } from './calendarioKickoffUtils';
import { GEO, alturaConteudoDisponivel } from './cronogramaPropostaTema';

// Largura disponível para o nome da etapa (entre a coluna Etapa e a de Prazo).
function larguraNomeEtapa() {
  return GEO.colunas.prazo - GEO.colunas.etapa - 40;
}

/** Numeração global (1ª, 2ª…), estável por (ordem, id) — cobre o caso de
 *  membros de bloco empatados em `ordem` (ADR-008/009). */
function numerarEtapas(etapas) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  return new Map(ordenadas.map((e, i) => [e.id, i + 1]));
}

/** Uma linha de prazo por card de `agruparCards` — bloco ou etapa solta. */
export function montarLinhas(etapas) {
  const numeroPorId = numerarEtapas(etapas);
  return agruparCards(etapas).map(card => {
    const membros = card.tipo === 'etapa' ? [card.etapa] : card.membros;
    const ref = membros[0];
    return {
      chave: card.tipo === 'etapa' ? `e-${ref.id}` : `b-${ref.bloco_entrega}`,
      etapas: membros.map(m => ({ numero: numeroPorId.get(m.id), nome: m.nome })),
      dias: ref.dias_uteis_esperados ?? 0,
      faseEscopo: ref.fase_escopo ?? null,
    };
  });
}

/** Agrupa as linhas nas quatro fases canônicas — SEMPRE as quatro, mesmo sem
 *  nenhuma linha (D4/Q1, ADR-035/036: fase vazia aparece, não é omitida).
 *  Linhas sem fase (etapa manual/projeto anterior à Fase 31) formam um grupo
 *  "não classificada" ao final. */
export function montarFases(linhas) {
  const porFase = new Map(ORDEM_FASES_ESCOPO.map(f => [f, []]));
  const naoClassificadas = [];
  linhas.forEach(l => {
    if (porFase.has(l.faseEscopo)) porFase.get(l.faseEscopo).push(l);
    else naoClassificadas.push(l);
  });
  const fases = ORDEM_FASES_ESCOPO.map(fase => ({ fase, linhas: porFase.get(fase) }));
  if (naoClassificadas.length > 0) fases.push({ fase: null, linhas: naoClassificadas });
  return fases;
}

/** Total de dias úteis — soma UMA VEZ por linha de prazo, não por etapa
 *  (conferido contra o PDF: membros do mesmo bloco compartilham o prazo). */
export function totalDiasUteis(linhas) {
  return linhas.reduce((s, l) => s + (Number(l.dias) || 0), 0);
}

// Altura de uma linha: padding + nº de sub-linhas de texto (cada nome de
// etapa pode quebrar em várias — D5: nunca truncar), com mínimo fixo (D2).
function alturaLinha(linha, preset, quebrasPorEtapa) {
  const cfg = GEO.linha[preset];
  const subLinhas = linha.etapas.reduce(
    (s, _, i) => s + quebrasPorEtapa.get(`${linha.chave}:${i}`).length,
    0
  );
  return Math.max(cfg.minima, cfg.padding * 2 + subLinhas * cfg.alturaNome);
}

function calcularQuebras(linhas, preset) {
  const largura = larguraNomeEtapa();
  const corpo = GEO.nomeEtapa.corpo;
  const mapa = new Map();
  linhas.forEach(l => {
    l.etapas.forEach((e, i) => {
      mapa.set(`${l.chave}:${i}`, quebrarTexto(e.nome, largura, corpo, preset === 'compacto' ? 3 : 4));
    });
  });
  return mapa;
}

/** Planeja o cronograma inteiro: escolhe o preset (normal/compacto, política
 *  A da Fase 30 — D3/D6) que faz tudo caber numa página só, calcula a altura
 *  resolvida de cada linha e devolve as posições já prontas para o SVG só
 *  desenhar. `aviso` é não-null quando o gerente precisa ser avisado — nunca
 *  um slide quebrado em silêncio. */
export function planejarCronograma(etapas) {
  const linhas = montarLinhas(etapas);
  const fases = montarFases(linhas);
  const disponivel = alturaConteudoDisponivel();

  const alturaTotal = (preset) => {
    const quebras = calcularQuebras(linhas, preset);
    const soma = linhas.reduce((s, l) => s + alturaLinha(l, preset, quebras), 0);
    const vazias = fases.filter(f => f.linhas.length === 0).length;
    return soma + vazias * GEO.linha[preset].minima;
  };

  let preset = 'normal';
  let aviso = null;
  if (alturaTotal('normal') > disponivel) {
    preset = 'compacto';
    aviso = 'Conteúdo extenso: linhas compactadas para caber numa página só.';
    if (alturaTotal('compacto') > disponivel) {
      aviso = 'Conteúdo muito extenso — revise manualmente antes de apresentar (pode ficar apertado).';
    }
  }

  const quebras = calcularQuebras(linhas, preset);
  let y = GEO.painel.y + GEO.alturaCabecalho;
  const fasesLayout = fases.map(f => {
    const yInicio = y;
    const linhasLayout = f.linhas.map(l => {
      const alturaResolvida = alturaLinha(l, preset, quebras);
      const linha = {
        ...l,
        y,
        altura: alturaResolvida,
        etapas: l.etapas.map((e, i) => ({ ...e, linhasNome: quebras.get(`${l.chave}:${i}`) })),
      };
      y += alturaResolvida;
      return linha;
    });
    // Fase vazia (D4/Q1, ADR-035/036): ainda ocupa uma banda mínima visível,
    // com o estado vazio desenhado ali — nunca altura zero.
    if (f.linhas.length === 0) y += GEO.linha[preset].minima;
    return { ...f, yInicio, yFim: y, linhas: linhasLayout };
  });

  return {
    fases: fasesLayout,
    preset,
    aviso,
    total: totalDiasUteis(linhas),
    disponivel,
  };
}
