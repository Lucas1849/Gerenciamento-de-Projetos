// Montagem das páginas do calendário de kick-off (Fase 28, ADR-031).
//
// Dado as etapas (EtapaResposta) + feriados, produz UMA página por mês entre o
// primeiro data_inicio e a última data_fim efetiva, com as células pintadas, a
// legenda e os feriados de cada mês. Nenhuma aritmética de DIAS ÚTEIS acontece
// aqui (ADR-008): o backend já entrega data_inicio → data_fim; o frontend só
// decide QUAIS células pintar — dia de semana e não-feriado dentro do intervalo,
// que é lógica de exibição. Reusa a grade UTC/ISO de datasUtils.

import {
  gradeCalendario,
  mesDeISO,
  ehFimDeSemana,
  formatarData,
} from './datasUtils';
import { agruparCards, numerosDosBlocos } from './etapasUtils';
import {
  PALETA_ETAPAS, CORES, GEO, larguraColunaNotas, alturaLinhaSemana,
} from './calendarioKickoffTema';

const ddmm = (iso) => formatarData(iso).slice(0, 5); // "18/06"

const ALTURA_LINHA_NOME = 1.1; // multiplicador do corpo p/ altura de linha do nome
// Fase 30: até 4 linhas por nome. Com NOTAS a 34% (chip 172) cabem ~19 chars por
// linha × 4 = ~76, o que acomoda o nome mais longo do catálogo ("Análise de
// Concorrentes e Vantagens Competitivas", 48) e os feriados por extenso ("Feriado
// - Aniversário de Uberlândia") SEM as reticências que ficavam estranhas para o
// cliente (feedback do responsável, 23/08/2026). A altura da entrada acompanha
// (planejarLegenda usa linhas.length), então as linhas extras não sobrepõem nada.
const MAX_LINHAS_NOME = 4;

// Quebra um nome em até `maxLinhas` linhas que caibam em `larguraMax` (px),
// estimando ~0,55·corpo por caractere (Inter). Layout SVG não tem wrap de CSS
// (ADR-032), então a quebra é manual. Movido do componente para cá na Fase 30
// para que o planejamento da legenda (planejarLegenda) seja lógica pura testável.
export function quebrarTexto(texto, larguraMax, corpo, maxLinhas = MAX_LINHAS_NOME) {
  const porChar = corpo * 0.55;
  const maxChars = Math.max(4, Math.floor(larguraMax / porChar));
  const palavras = texto.split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (tentativa.length <= maxChars) atual = tentativa;
    else { if (atual) linhas.push(atual); atual = p; }
    if (linhas.length === maxLinhas) break;
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual);
  if (linhas.length === maxLinhas) {
    const usado = linhas.join(' ').length;
    if (usado < texto.length) linhas[maxLinhas - 1] = linhas[maxLinhas - 1].replace(/.{1}$/, '…');
  }
  return linhas;
}

// Largura disponível para o NOME à direita do chip (deriva de notasFracao).
export function larguraNomeLegenda() {
  const { padding, chipLargura } = GEO.legenda;
  return larguraColunaNotas() - padding * 2 - chipLargura - 12;
}

// Planeja o layout vertical da legenda (Fase 30, M2): escolhe o preset (normal
// ou compacto) que faz TUDO caber, com a altura de cada entrada = função do
// conteúdo (1 ou 2 linhas de nome) e o espaçamento como TOKEN fixo — nunca mais
// o resto elástico que sobrepunha chips. Devolve as posições já resolvidas para
// o componente só desenhar, e `estouro`/`modo` para o gerador avisar o gerente.
export function planejarLegenda(entradas) {
  const { corpoNome, padding, presets } = GEO.legenda;
  const alturaLinha = corpoNome * ALTURA_LINHA_NOME;
  const nomeLargura = larguraNomeLegenda();
  const alturaDisponivel = alturaLinhaSemana() * GEO.semanas - padding;

  const linhasPor = entradas.map(e => quebrarTexto(e.nome, nomeLargura, corpoNome));
  const alturaConteudo = (chipAltura, i) =>
    Math.max(chipAltura, linhasPor[i].length * alturaLinha);

  const cabe = (preset) => {
    let total = padding;
    entradas.forEach((_, i) => {
      total += alturaConteudo(preset.chipAltura, i);
      if (i < entradas.length - 1) total += preset.espacamento;
    });
    return total <= alturaDisponivel;
  };

  let modo = 'normal';
  let estouro = false;
  if (!cabe(presets.normal)) {
    modo = 'compacto';
    if (!cabe(presets.compacto)) estouro = true; // nem compacto cabe: melhor esforço
  }
  const preset = presets[modo];

  let cursor = padding;
  const itens = entradas.map((e, i) => {
    const altura = alturaConteudo(preset.chipAltura, i);
    const top = cursor;
    cursor += altura + preset.espacamento;
    return {
      cor: e.cor, intervalo: e.intervalo, linhas: linhasPor[i],
      top, alturaConteudo: altura, chipAltura: preset.chipAltura,
    };
  });
  return { modo, estouro, itens };
}

/** Itera dias de calendário (inclusivo) entre dois ISO, chamando fn(iso). */
function porDia(inicioISO, fimISO, fn) {
  let d = new Date(`${inicioISO}T00:00:00Z`);
  const fim = new Date(`${fimISO}T00:00:00Z`);
  while (d <= fim) {
    const iso = d.toISOString().slice(0, 10);
    fn(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

const ehSemana = (iso) => {
  const { ano, mes } = mesDeISO(iso);
  return !ehFimDeSemana(ano, mes, +iso.slice(8, 10));
};

/** Transforma os cards (etapas avulsas + blocos, ADR-009) em ITENS pintáveis,
 *  cada um com cor (default da paleta ou override) e os conjuntos de células
 *  normais/de-termo já resolvidos. `cores` é o mapa persistido chave→hex. */
export function montarItens(etapas, feriadosSet, cores = {}) {
  const cards = agruparCards(etapas);
  const numeros = numerosDosBlocos(etapas);

  return cards
    .map((card, indice) => {
      const ref = card.tipo === 'etapa' ? card.etapa : card.membros[0];
      const inicio = ref.data_inicio;
      const fim = ref.data_fim;
      if (!inicio || !fim) return null; // etapa sem datas não entra no calendário

      const key = card.tipo === 'etapa'
        ? `e-${card.etapa.id}`
        : `b-${card.membros[0].bloco_entrega}`;
      // Bloco (ADR-009): pinta UMA vez, UMA legenda — nome COMPOSTO dos membros
      // (decisão do responsável em 21/08/2026).
      const nome = card.tipo === 'etapa'
        ? card.etapa.nome
        : card.membros.map(m => m.nome).join(' + ');
      const rotuloBloco = card.tipo === 'bloco'
        ? `Bloco ${numeros.get(card.membros[0].bloco_entrega)}`
        : null;
      const fimOriginal = ref.data_fim_original || fim;

      const cor = cores[key] || PALETA_ETAPAS[indice % PALETA_ETAPAS.length];

      // Células pintadas: dia de semana e não-feriado dentro de [inicio, fim].
      // As posteriores a data_fim_original são dias de termo aditivo (ADR-019).
      const normais = [];
      const termos = [];
      porDia(inicio, fim, (iso) => {
        if (!ehSemana(iso) || feriadosSet.has(iso)) return;
        if (iso > fimOriginal) termos.push(iso);
        else normais.push(iso);
      });

      return {
        key, nome, rotuloBloco, cor,
        inicio, fim, fimOriginal,
        temTermo: termos.length > 0,
        normais: new Set(normais),
        termos: new Set(termos),
        intervaloNormal: normais.length
          ? `${ddmm(normais[0])} - ${ddmm(normais[normais.length - 1])}`
          : `${ddmm(inicio)} - ${ddmm(fimOriginal)}`,
        intervaloTermo: termos.length
          ? `${ddmm(termos[0])} - ${ddmm(termos[termos.length - 1])}`
          : null,
      };
    })
    .filter(Boolean);
}

/** Lista de meses [{ano, mes}] entre o primeiro início e a última data fim. */
function mesesDoIntervalo(itens) {
  const inicios = itens.map(i => i.inicio).sort();
  const fins = itens.map(i => i.fim).sort();
  if (!inicios.length) return [];
  const a = mesDeISO(inicios[0]);
  const b = mesDeISO(fins[fins.length - 1]);
  const meses = [];
  let { ano, mes } = a;
  while (ano < b.ano || (ano === b.ano && mes <= b.mes)) {
    meses.push({ ano, mes });
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }
  return meses;
}

/** Página de um mês: grade de células pintadas + entradas de legenda. */
function montarPagina(ano, mes, itens, feriadosMap) {
  const noMes = (iso) => {
    const m = mesDeISO(iso);
    return m.ano === ano && m.mes === mes;
  };

  // Células: para cada dia do mês, as faixas de cor (sobreposição = faixa
  // dividida — decisão do responsável em 21/08/2026).
  const celulas = gradeCalendario(ano, mes).flat().map((c) => {
    if (c === null) return { vazia: true };
    const feriadoNome = ehSemana(c.iso) ? feriadosMap.get(c.iso) : null;
    if (feriadoNome) {
      // Feriado em dia de semana ocupa a célula sozinho (não é dia útil de
      // etapa nenhuma — o backend já o pula ao derivar data_fim).
      return { dia: c.dia, iso: c.iso, feriado: true, faixas: [{ cor: CORES.feriado }] };
    }
    const faixas = [];
    itens.forEach((it) => {
      if (it.normais.has(c.iso)) faixas.push({ cor: it.cor });
      else if (it.termos.has(c.iso)) faixas.push({ cor: CORES.termoAditivo });
    });
    return { dia: c.dia, iso: c.iso, faixas };
  });
  // A grade de um mês tem 4, 5 ou 6 semanas (gradeCalendario só completa até
  // o múltiplo de 7), mas a moldura da página é sempre de GEO.semanas linhas —
  // é geometria transcrita do template. Sem completar aqui, o mês curto saía
  // com uma faixa vazia no rodapé: o fundo da coluna NOTAS e as divisórias
  // verticais desciam até a 6ª linha, mas sem células não havia nem fundo nem
  // borda. 19 dos 24 meses de 2026-2027 caem nesse caso (fevereiro/2026 usa só
  // 4 semanas). As células extras são vazias, iguais às que já aparecem antes
  // do dia 1 e depois do último dia do mês.
  while (celulas.length < GEO.semanas * 7) celulas.push({ vazia: true });

  // Legenda: uma entrada por etapa/bloco com célula pintada no mês; termos e
  // feriados como entradas próprias. Etapas multi-mês repetem em cada mês.
  const legenda = [];
  itens.forEach((it) => {
    const temNormalNoMes = [...it.normais].some(noMes);
    if (temNormalNoMes) {
      legenda.push({
        tipo: 'etapa', cor: it.cor,
        intervalo: it.intervaloNormal,
        nome: it.rotuloBloco ? `${it.rotuloBloco}: ${it.nome}` : it.nome,
      });
    }
    const temTermoNoMes = [...it.termos].some(noMes);
    if (temTermoNoMes) {
      legenda.push({
        tipo: 'termo', cor: CORES.termoAditivo,
        intervalo: it.intervaloTermo,
        nome: 'Termo aditivo',
      });
    }
  });
  // Feriados do mês (só dias de semana — sábado/domingo não entram).
  [...feriadosMap.entries()]
    .filter(([iso]) => noMes(iso) && ehSemana(iso))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .forEach(([iso, nome]) => {
      legenda.push({
        tipo: 'feriado', cor: CORES.feriado,
        intervalo: ddmm(iso), nome: `Feriado - ${nome}`,
      });
    });

  return { ano, mes, celulas, legenda, legendaPlano: planejarLegenda(legenda) };
}

/** Ponto de entrada: monta todas as páginas do projeto.
 *  feriados = [{data: 'YYYY-MM-DD', nome}], cores = mapa chave→hex. */
export function montarPaginas(etapas, feriados, cores = {}) {
  const feriadosMap = new Map(feriados.map(f => [f.data, f.nome]));
  const feriadosSet = new Set(feriadosMap.keys());
  const itens = montarItens(etapas, feriadosSet, cores);
  if (!itens.length) return { itens, paginas: [] };
  const paginas = mesesDoIntervalo(itens).map(({ ano, mes }) =>
    montarPagina(ano, mes, itens, feriadosMap)
  );
  return { itens, paginas };
}

/** Anos tocados pelo projeto — para buscar os feriados certos no backend. */
export function anosDoProjeto(etapas) {
  const anos = new Set();
  etapas.forEach((e) => {
    if (e.data_inicio) anos.add(+e.data_inicio.slice(0, 4));
    if (e.data_fim) anos.add(+e.data_fim.slice(0, 4));
  });
  return [...anos].sort();
}
