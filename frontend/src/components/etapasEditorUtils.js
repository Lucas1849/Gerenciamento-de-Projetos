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
