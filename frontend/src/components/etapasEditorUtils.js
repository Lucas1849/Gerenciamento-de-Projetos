// ─── Helpers do editor de etapas (Fase 5 / ADR-008) ─────────────────────────
// Em arquivo próprio (sem componentes) para o Fast Refresh do Vite.

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
  }));
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
      });
    });
  });
  return etapas;
}
