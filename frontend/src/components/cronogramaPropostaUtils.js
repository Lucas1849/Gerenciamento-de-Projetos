// Montagem do slide "Cronograma de Execução" da proposta (Fase 32, ADR-036;
// numeração e distribuição de altura revistas no hotfix de 09/11/2026, H1/H2).
//
// Dadas as etapas de um projeto (com `fase_escopo`, `bloco_entrega`, `ordem`,
// `dias_uteis_esperados` — Fase 31/ADR-035), produz as quatro fases × linhas
// de prazo que o componente SVG desenha. Reaproveita `agruparCards` (já usado
// pelo Kanban/tabela/cronograma) para a regra "linha de prazo = bloco de
// entrega, ou etapa solta = bloco de 1" (achado da spec: a célula mesclada do
// slide JÁ É `Etapa.bloco_entrega`, nenhum conceito novo).

import { agruparCards } from './etapasUtils';
import { ORDEM_FASES_ESCOPO } from './fasesEscopo';
import { quebrarTexto } from './calendarioKickoffUtils';
import { GEO, alturaConteudoDisponivel } from './cronogramaPropostaTema';

// Largura disponível para o nome da etapa (entre a coluna Etapa e a de Prazo).
function larguraNomeEtapa() {
  return GEO.colunas.prazo - GEO.colunas.etapa - 40;
}

/** Uma linha de prazo por card de `agruparCards` — bloco ou etapa solta,
 *  ainda SEM numeração (H1: numerar vem depois, na ordem de desenho, não na
 *  `ordem` crua). */
function montarLinhasBrutas(etapas) {
  return agruparCards(etapas).map(card => {
    const membros = card.tipo === 'etapa' ? [card.etapa] : card.membros;
    const ref = membros[0];
    return {
      chave: card.tipo === 'etapa' ? `e-${ref.id}` : `b-${ref.bloco_entrega}`,
      membros,
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

/** Numera na ordem de DESENHO — fase canônica, depois linha, depois membro
 *  (H1): garante 1ª, 2ª, 3ª… sem salto mesmo quando a `ordem` persistida
 *  diverge da fase. De passagem, detecta essa divergência (a sequência de
 *  `ordem` crua encontrada na ordem de desenho deixa de ser crescente) para
 *  avisar o gerente — nunca corrigir o dado em silêncio. */
function numerarNaOrdemDeDesenho(fases) {
  let numero = 0;
  let ordemAnterior = -Infinity;
  let ordemDivergente = false;
  const fasesNumeradas = fases.map(f => ({
    ...f,
    linhas: f.linhas.map(l => ({
      ...l,
      etapas: l.membros.map(m => {
        numero += 1;
        if (m.ordem < ordemAnterior) ordemDivergente = true;
        ordemAnterior = m.ordem;
        return { numero, nome: m.nome };
      }),
    })),
  }));
  return { fasesNumeradas, ordemDivergente };
}

/** Total de dias úteis — soma UMA VEZ por linha de prazo, não por etapa
 *  (conferido contra o PDF: membros do mesmo bloco compartilham o prazo). */
function totalDiasUteis(linhasBrutas) {
  return linhasBrutas.reduce((s, l) => s + (Number(l.dias) || 0), 0);
}

// Altura NATURAL de uma linha (antes de esticar): padding + nº de sub-linhas
// de texto (cada nome de etapa pode quebrar em várias — D5: nunca truncar),
// com mínimo fixo.
function alturaNatural(linha, preset, quebrasPorEtapa) {
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
 *  A da Fase 30 — D3/D6) que faz tudo caber numa página só, estica as linhas
 *  proporcionalmente até preencher o painel (H2 — nunca deixa vão vazio antes
 *  do rodapé quando cabe com folga) e devolve as posições já prontas para o
 *  SVG só desenhar. `aviso` é não-null quando o gerente precisa ser avisado
 *  de conteúdo extenso; `avisoOrdem`, quando a ordem persistida diverge da
 *  fase — nunca um slide errado ou corrigido em silêncio. */
export function planejarCronograma(etapas) {
  const linhasBrutas = montarLinhasBrutas(etapas);
  const fasesBrutas = montarFases(linhasBrutas);
  const { fasesNumeradas, ordemDivergente } = numerarNaOrdemDeDesenho(fasesBrutas);
  const linhasNumeradas = fasesNumeradas.flatMap(f => f.linhas);
  const disponivel = alturaConteudoDisponivel();

  const alturaTotalNatural = (preset) => {
    const quebras = calcularQuebras(linhasNumeradas, preset);
    const soma = linhasNumeradas.reduce((s, l) => s + alturaNatural(l, preset, quebras), 0);
    const vazias = fasesNumeradas.filter(f => f.linhas.length === 0).length;
    return soma + vazias * GEO.linha[preset].minima;
  };

  let preset = 'normal';
  let aviso = null;
  let natural = alturaTotalNatural('normal');
  if (natural > disponivel) {
    preset = 'compacto';
    natural = alturaTotalNatural('compacto');
    aviso = 'Conteúdo extenso: linhas compactadas para caber numa página só.';
    if (natural > disponivel) {
      aviso = 'Conteúdo muito extenso — revise manualmente antes de apresentar (pode ficar apertado).';
    }
  }
  // H2: nunca deixa vão vazio antes do rodapé — estica proporcionalmente até
  // preencher o painel quando a altura natural cabe com folga. No caso
  // inverso (conteúdo real demais mesmo em compacto — ex. um serviço de 13
  // etapas soltas, sem blocos), comprime pela mesma razão em vez de deixar
  // as linhas vazarem por cima do rodapé: o aviso acima já avisa que ficou
  // apertado, mas o slide nunca pode sair com texto sobreposto.
  const fator = natural > 0 ? disponivel / natural : 1;

  const quebras = calcularQuebras(linhasNumeradas, preset);
  let y = GEO.painel.y + GEO.alturaCabecalho;
  const fasesLayout = fasesNumeradas.map(f => {
    const yInicio = y;
    const linhasLayout = f.linhas.map(l => {
      const alturaResolvida = alturaNatural(l, preset, quebras) * fator;
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
    if (f.linhas.length === 0) y += GEO.linha[preset].minima * fator;
    return { ...f, yInicio, yFim: y, linhas: linhasLayout };
  });

  return {
    fases: fasesLayout,
    preset,
    aviso,
    avisoOrdem: ordemDivergente
      ? 'A ordem das etapas não segue as fases — revise em Etapas (a numeração abaixo segue a leitura por fase, não a ordem salva).'
      : null,
    total: totalDiasUteis(linhasBrutas),
    disponivel,
  };
}
