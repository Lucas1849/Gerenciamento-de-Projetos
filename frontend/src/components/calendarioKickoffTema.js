// Tema do calendário de kick-off (Fase 28, ADR-031/032).
//
// TODAS as constantes visuais do gerador vivem aqui — geometria, paleta, fontes
// e logo. É o que faz o componente SVG portar para o Hub numa edição só (cores
// via props, sem custom properties dentro do SVG) e o que permite trocar os
// valores oficiais sem caçar literais espalhados.
//
// Valores TRANSCRITOS dos dois PDFs reais do template (Midiática), lidos dos
// objetos do PDF — ver docs/features/calendario-kickoff.md → "Valores extraídos
// do template". Não são estimativas visuais. As imperfeições de montagem manual
// do template (colunas QUI/SEX trocadas, alturas de rodapé desiguais) NÃO são
// reproduzidas: usamos colunas e linhas uniformes de propósito (achado 2).

// ── Geometria (base 1440×810, 16:9 exato) ───────────────────────────────────
export const GEO = {
  largura: 1440,
  altura: 810,
  // Retângulo da tabela.
  tabela: { x: 35.9, y: 167.3, largura: 1299, altura: 526 }, // 693.3 - 167.3
  notasFracao: 0.293,        // coluna NOTAS = 29,3% da largura da tabela
  alturaCabecalho: 56.8,     // linha DOM…SAB
  semanas: 6,                // linhas de semana (grade sempre 6×7)
  // Cabeçalho da página (mês/ano/logo): do topo até o topo da tabela.
  mes:  { x: 24, baseline: 116, corpo: 80 },   // Questrial 80pt, esquerda
  ano:  { centro: 753, baseline: 122, corpo: 80 }, // Questrial 80pt
  logo: { direita: 1334.9, topo: 40, altura: 90 }, // alinhado à borda da tabela
  diaSemana: { corpo: 17 },  // KleinText-Bold 15,9pt → Inter, caixa alta
  numeroDia: { corpo: 15 },  // KleinText-Italic 14,5pt → Inter italic
  legenda: {
    corpoIntervalo: 19,      // dentro do chip
    corpoNome: 21,           // à direita do chip (20,8pt)
    alturaEntrada: 46,       // altura de cada bloco da legenda
    padding: 18,
    chipLargura: 118,
    chipAltura: 30,
  },
};

// ── Paleta (transcrita — hex do Canva) ──────────────────────────────────────
export const CORES = {
  azulCabecalho: '#004AAD',  // NÃO é o marinho da marca (#03345F) — decisão de
                             // identidade da diretoria manter o do template.
  textoEscuro: '#2B2B2B',
  fundoNotas: '#FAFAFA',
  celulaDia: '#FFFFFF',
  gradeLinha: '#E5E5E5',
  feriado: '#FFBD59',        // laranja — RESERVADO a feriado
  // Cor fixa de termo aditivo: distinta do laranja de feriado e das etapas.
  termoAditivo: '#E8918C',
};

// Paleta default das etapas (transcrita do template). O gerador cicla por ela
// na ordem das etapas; o gerente pode sobrescrever por etapa dentro desta
// paleta (não um color picker livre — mantém o material dentro da identidade).
export const PALETA_ETAPAS = [
  '#C9E597', // verde-claro
  '#8C52FF', // roxo
  '#E2A9F1', // lilás
  '#2A965C', // verde-escuro
  '#FCFFB8', // amarelo-claro
  '#B4B4B4', // cinza
];

// Cor legível (texto) sobre um fundo hex — preto ou branco por luminância.
export function textoSobre(hex) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  // Luminância relativa aproximada.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? CORES.textoEscuro : '#FFFFFF';
}

// ── Tipografia ──────────────────────────────────────────────────────────────
// Questrial (Google Fonts, SIL OFL) no mês/ano — fidelidade total ao elemento
// mais visível. Inter (já no app, OFL) substitui o Klein Text (comercial, não
// embutível) no resto. Substituição é DECISÃO DA DIRETORIA registrada na spec.
export const FONTES = {
  display: 'Questrial',       // mês e ano
  displayFallback: "'Plus Jakarta Sans', sans-serif",
  texto: 'Inter',             // dias, números, legenda
  textoFallback: 'system-ui, sans-serif',
};

// Logo vetorizado da marca (símbolo + "APOIO CONSULTORIA"), azul-marinho,
// fundo transparente. Único arquivo — trocar por um vetor oficial, se a
// diretoria produzir um, é substituir este arquivo em public/.
export const LOGO_URL = '/marca-apoio.svg';
export const LOGO_RATIO = 2.034; // largura/altura da caixa real do desenho

// ── Colunas derivadas (uniformes) ───────────────────────────────────────────
export function larguraColunaDia() {
  return (GEO.tabela.largura * (1 - GEO.notasFracao)) / 7;
}
export function larguraColunaNotas() {
  return GEO.tabela.largura * GEO.notasFracao;
}
export function alturaLinhaSemana() {
  return (GEO.tabela.altura - GEO.alturaCabecalho) / GEO.semanas;
}
