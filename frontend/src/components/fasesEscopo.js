// ─── Fases do escopo da proposta comercial (Fase 31 / ADR-035) ─────────────
// Eixo DIFERENTE de `fases.js` (que é Projeto.fase — estágio do projeto na
// galeria). Esta é `Etapa.fase_escopo` / `EtapaTemplate.fase_escopo`: o
// agrupamento Alinhamento/Diagnóstico/Estratégia/Ação usado pelo editor de
// criação (31c), pela reclassificação pós-criação (31d) e pelo futuro slide
// de cronograma (Fase 32). Tokens de cor próprios — não reusa `--fase-*`
// (que é do outro eixo) para não confundir as duas classificações na mesma
// tela (ex. card de projeto mostra fase da galeria; etapa mostra fase do
// escopo).

export const FASES_ESCOPO = [
  { valor: 'alinhamento', titulo: 'Alinhamento', cor: 'var(--fase-escopo-alinhamento)' },
  { valor: 'diagnostico', titulo: 'Diagnóstico', cor: 'var(--fase-escopo-diagnostico)' },
  { valor: 'estrategia', titulo: 'Estratégia', cor: 'var(--fase-escopo-estrategia)' },
  { valor: 'acao', titulo: 'Ação', cor: 'var(--fase-escopo-acao)' },
];

export const ORDEM_FASES_ESCOPO = FASES_ESCOPO.map(f => f.valor);

export const FASE_ESCOPO_LABEL = Object.fromEntries(FASES_ESCOPO.map(f => [f.valor, f.titulo]));

export function corFaseEscopo(valor) {
  return FASES_ESCOPO.find(f => f.valor === valor)?.cor ?? 'var(--color-text-disabled)';
}
