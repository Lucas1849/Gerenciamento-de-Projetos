// Aritmética de GRADE de calendário, toda em UTC e com comparações por string
// ISO (YYYY-MM-DD) — evita off-by-one de fuso. Cálculo de dias úteis continua
// exclusivo do backend (ADR-008); aqui só se posiciona/exibe datas prontas.

const pad = (n) => String(n).padStart(2, '0');

export const formatarData = (iso) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso));

/** Data de hoje (local) como string ISO YYYY-MM-DD. */
export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const isoDe = (ano, mes, dia) => `${ano}-${pad(mes)}-${pad(dia)}`;

/** Janela de plausibilidade de datas (Fase 10), espelhando o backend:
 *  01/01/(ano atual − 1) a 31/12/(ano atual + 2). Fonte única da regra é o
 *  backend (422); aqui só se pré-bloqueia o input (min/max) e o submit. */
export function janelaDatas() {
  const ano = new Date().getFullYear();
  return { min: `${ano - 1}-01-01`, max: `${ano + 2}-12-31` };
}

/** true se a data ISO está dentro da janela de plausibilidade. */
export function dataPlausivel(iso) {
  const { min, max } = janelaDatas();
  return iso >= min && iso <= max;
}

/** Extrai { ano, mes } (mes 1–12) de uma string ISO. */
export const mesDeISO = (iso) => ({ ano: +iso.slice(0, 4), mes: +iso.slice(5, 7) });

export const diaDeISO = (iso) => +iso.slice(8, 10);

export const diasNoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Dia da semana (0=domingo) do dia informado, em UTC. */
export const diaDaSemana = (ano, mes, dia) =>
  new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();

export const ehFimDeSemana = (ano, mes, dia) => {
  const d = diaDaSemana(ano, mes, dia);
  return d === 0 || d === 6;
};

/** "julho de 2026" */
export const rotuloMes = (ano, mes) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(ano, mes - 1, 1)));

export const mesAnterior = ({ ano, mes }) =>
  mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };

export const mesSeguinte = ({ ano, mes }) =>
  mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };

/** Grade do mês: array de semanas, cada uma com 7 células
 *  ({ dia, iso } ou null fora do mês), começando no domingo. */
export function gradeCalendario(ano, mes) {
  const total = diasNoMes(ano, mes);
  const celulas = Array(diaDaSemana(ano, mes, 1)).fill(null);
  for (let dia = 1; dia <= total; dia++) celulas.push({ dia, iso: isoDe(ano, mes, dia) });
  while (celulas.length % 7 !== 0) celulas.push(null);
  const semanas = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}
