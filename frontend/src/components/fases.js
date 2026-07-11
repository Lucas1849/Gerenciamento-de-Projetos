// ─── Fases do ciclo de vida do projeto (ADR-003) ────────────────────────────
// Compartilhado entre GaleriaProjetos (badge e chips de filtro, Fase 22) e
// PaginaProjeto (chip + select de fase).
// Títulos e cores dos dots seguem as colunas do Kanban do Apoio Hub.

export const FASES = [
  { valor: 'kickoff',     titulo: 'Kick-off',     cor: 'var(--fase-kickoff)' },
  { valor: 'andamento',   titulo: 'Em Andamento', cor: 'var(--fase-andamento)' },
  { valor: 'finalizacao', titulo: 'Finalização',  cor: 'var(--fase-finalizacao)' },
  { valor: 'ajustes',     titulo: 'Ajustes',      cor: 'var(--fase-ajustes)' },
  { valor: 'concluido',   titulo: 'Concluído',    cor: 'var(--fase-concluido)' },
];

export const FASE_LABEL = Object.fromEntries(FASES.map(f => [f.valor, f.titulo]));
