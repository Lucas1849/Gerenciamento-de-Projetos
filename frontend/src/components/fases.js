// ─── Fases do ciclo de vida do projeto (ADR-003) ────────────────────────────
// Compartilhado entre KanbanFases (colunas) e PaginaProjeto (chip da fase).

export const FASES = [
  { valor: 'kickoff',     titulo: 'Kick-off',    cor: 'var(--color-text-secondary)' },
  { valor: 'andamento',   titulo: 'Andamento',   cor: 'var(--color-accent)' },
  { valor: 'finalizacao', titulo: 'Finalização', cor: 'var(--color-brand)' },
  { valor: 'ajustes',     titulo: 'Ajustes',     cor: 'var(--color-warning, #b45309)' },
  { valor: 'concluido',   titulo: 'Concluído',   cor: 'var(--color-success)' },
];

export const FASE_LABEL = Object.fromEntries(FASES.map(f => [f.valor, f.titulo]));
