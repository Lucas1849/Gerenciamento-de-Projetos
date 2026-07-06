// Agrupamento de etapas em cards (avulsas + blocos de entrega, ADR-009),
// compartilhado entre as visões (Kanban, tabela, cronograma, calendário).

export const RANK = { nao_iniciada: 0, em_andamento: 1, concluida: 2 };

export const STATUS_LABEL = {
  nao_iniciada: 'Não Iniciada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
};

// Fluxo do Kanban interno; usado tanto nos cards avulsos quanto por membro
// de bloco (status individual por etapa — ADR-009).
export const FLUXO = {
  nao_iniciada: { next: 'em_andamento', nextLabel: 'Iniciar →' },
  em_andamento: { prev: 'nao_iniciada', next: 'concluida', nextLabel: 'Concluir ✓' },
  concluida:    { prev: 'em_andamento' },
};

/** Numera os blocos na ordem da primeira etapa de cada um: Map chave → N. */
export function numerosDosBlocos(etapas) {
  const numeros = new Map();
  [...etapas].sort((a, b) => a.ordem - b.ordem).forEach(e => {
    if (e.bloco_entrega && !numeros.has(e.bloco_entrega)) {
      numeros.set(e.bloco_entrega, numeros.size + 1);
    }
  });
  return numeros;
}

/** Agrupa em cards: etapas avulsas + um card por bloco (chave compartilhada),
 *  com rótulo "Bloco N" e membros ordenados. */
export function agruparCards(etapas) {
  const cards = [];
  const numeros = numerosDosBlocos(etapas);
  const blocosVistos = new Set();
  [...etapas].sort((a, b) => a.ordem - b.ordem).forEach(etapa => {
    if (!etapa.bloco_entrega) {
      cards.push({ tipo: 'etapa', etapa, ordem: etapa.ordem });
      return;
    }
    if (blocosVistos.has(etapa.bloco_entrega)) return;
    blocosVistos.add(etapa.bloco_entrega);
    const membros = etapas
      .filter(e => e.bloco_entrega === etapa.bloco_entrega)
      .sort((a, b) => a.ordem - b.ordem);
    cards.push({
      tipo: 'bloco',
      membros,
      ordem: etapa.ordem,
      rotulo: `Bloco ${numeros.get(etapa.bloco_entrega)}`,
    });
  });
  return cards;
}

/** Status do card: o próprio, ou o da etapa menos avançada no caso de bloco. */
export const statusDoCard = (card) =>
  card.tipo === 'etapa'
    ? card.etapa.status
    : card.membros.reduce((min, e) => (RANK[e.status] < RANK[min] ? e.status : min), 'concluida');

/** Itens de linha do tempo (cronograma/calendário): um por etapa avulsa e um
 *  por bloco (barra/chip único — prazo/data compartilhados, ADR-009). */
export const itensLinhaDoTempo = (etapas) =>
  agruparCards(etapas).map(card =>
    card.tipo === 'etapa'
      ? {
          key: `e-${card.etapa.id}`,
          nome: `${card.etapa.ordem}. ${card.etapa.nome}`,
          status: card.etapa.status,
          inicio: card.etapa.data_inicio,
          fim: card.etapa.data_fim,
        }
      : {
          key: `b-${card.membros[0].bloco_entrega}`,
          nome: `📦 ${card.rotulo} (${card.membros.length} etapas)`,
          status: statusDoCard(card),
          inicio: card.membros[0].data_inicio,
          fim: card.membros[0].data_fim,
        }
  );
