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
import { PALETA_ETAPAS, CORES } from './calendarioKickoffTema';

const ddmm = (iso) => formatarData(iso).slice(0, 5); // "18/06"

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

  return { ano, mes, celulas, legenda };
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
