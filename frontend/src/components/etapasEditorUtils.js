// ─── Helpers do editor de etapas (Fase 5 / ADR-008; fase_escopo Fase 31) ────
// Em arquivo próprio (sem componentes) para o Fast Refresh do Vite.

import { ORDEM_FASES_ESCOPO } from './fasesEscopo';

let proximoUid = 1;
export const novoUid = () => `item-${proximoUid++}`;

/** Converte as etapas-template do serviço em itens do editor.
 *  Templates com a mesma `ordem` formam um bloco (card único). */
export function itensDosTemplates(templates) {
  const grupos = new Map();
  [...templates]
    .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
    .forEach(t => {
      if (!grupos.has(t.ordem)) grupos.set(t.ordem, []);
      grupos.get(t.ordem).push(t);
    });
  return [...grupos.values()].map(grupo => ({
    uid: novoUid(),
    membros: grupo.map(t => ({ nome: t.nome, etapaTemplateId: t.id })),
    dias: grupo[0].dias_uteis_esperados_padrao ?? '',
    dataInicio: '',
    // Fase 31 (ADR-035): copiada do template; propaga ao bloco inteiro (P2)
    // porque o item do editor representa o bloco como uma unidade só.
    faseEscopo: grupo[0].fase_escopo ?? null,
  }));
}

/** Agrupa os itens em faixas por fase_escopo (Opção A, ADR-035): a lista
 *  continua sendo uma só (ordem = cronograma); as faixas são bandas sobre
 *  ela, SEMPRE nas quatro posições canônicas — uma fase sem etapa nenhuma
 *  ainda aparece, vazia (Q1). Itens sem fase (manuais, não classificados)
 *  formam uma faixa própria (`fase: null`) onde aparecerem na lista. */
export function construirFaixas(itens) {
  if (itens.length === 0) return ORDEM_FASES_ESCOPO.map(fase => ({ fase, itens: [] }));

  const faixas = [];
  let ultimoIndiceCanonico = -1;
  let grupoAtual = null;

  itens.forEach(item => {
    if (!grupoAtual || grupoAtual.fase !== item.faseEscopo) {
      const indiceCanonico = ORDEM_FASES_ESCOPO.indexOf(item.faseEscopo);
      for (let f = ultimoIndiceCanonico + 1; f < indiceCanonico; f++) {
        faixas.push({ fase: ORDEM_FASES_ESCOPO[f], itens: [] });
      }
      grupoAtual = { fase: item.faseEscopo, itens: [] };
      faixas.push(grupoAtual);
      if (indiceCanonico >= 0) ultimoIndiceCanonico = indiceCanonico;
    }
    grupoAtual.itens.push(item);
  });

  for (let f = ultimoIndiceCanonico + 1; f < ORDEM_FASES_ESCOPO.length; f++) {
    faixas.push({ fase: ORDEM_FASES_ESCOPO[f], itens: [] });
  }
  return faixas;
}

/** Índice de destino para "mover de faixa" (Alt+←/→, §5 do plano): pula o
 *  resto da faixa atual e aterra logo no início da próxima (ou no fim da
 *  anterior), já adotando a fase vizinha por construção (mover() abaixo
 *  recomputa `faseEscopo` do item pelo vizinho). `null` se não houver
 *  faixa seguinte/anterior (já é a primeira/última etapa da lista). */
export function limiteFaixaSeguinte(itens, indice) {
  const fase = itens[indice].faseEscopo;
  let i = indice;
  while (i + 1 < itens.length && itens[i + 1].faseEscopo === fase) i++;
  return i + 1 < itens.length ? i + 1 : null;
}

export function limiteFaixaAnterior(itens, indice) {
  const fase = itens[indice].faseEscopo;
  let i = indice;
  while (i - 1 >= 0 && itens[i - 1].faseEscopo === fase) i--;
  return i - 1 >= 0 ? i - 1 : null;
}

/** Cascata reativa de datas (Fase 12 / ADR-014): recomputa as datas de início
 *  dos cards à frente de `indice`, encadeando pelos dias úteis via a rota
 *  POST /calendario/cascata (`cascatear` = cliente da API, injetado para não
 *  acoplar este helper ao fetch). Card sem `dias` quebra a cadeia dali para
 *  frente (os seguintes mantêm o que têm). Devolve a lista atualizada. */
export async function cascatearItens(itens, indice, cascatear) {
  const ancora = itens[indice];
  if (!ancora?.dataInicio) return itens;
  // Trecho contíguo com dias preenchidos a partir do ponto alterado.
  const dias = [];
  for (let i = indice; i < itens.length && itens[i].dias !== ''; i++) {
    dias.push(Number(itens[i].dias));
  }
  if (dias.length === 0) return itens;
  // O último valor não é consumido; o 0 extra devolve também o início do card
  // logo após o trecho (ele herda o fim do anterior mesmo sem dias próprios).
  const { inicios } = await cascatear(ancora.dataInicio, [...dias, 0]);
  return itens.map((item, idx) => {
    const k = idx - indice;
    return k > 0 && k < inicios.length ? { ...item, dataInicio: inicios[k] } : item;
  });
}

/** Expande os itens do editor para o payload `etapas` de POST /projetos/.
 *  A ordem NÃO viaja: o backend atribui ordem = índice + 1 (ADR-008). */
export function etapasParaPayload(itens) {
  const etapas = [];
  itens.forEach(item => {
    const blocoGrupo = item.membros.length > 1 ? item.uid : null;
    item.membros.forEach(m => {
      etapas.push({
        nome: m.nome,
        dias_uteis_esperados: item.dias === '' ? null : Number(item.dias),
        data_inicio: item.dataInicio || null,
        etapa_template_id: m.etapaTemplateId ?? null,
        bloco_grupo: blocoGrupo,
        // Fase 31 (ADR-035): a mesma fase para todos os membros do bloco
        // (o item do editor já guarda uma fase só para o conjunto, P2).
        fase_escopo: item.faseEscopo ?? null,
      });
    });
  });
  return etapas;
}
