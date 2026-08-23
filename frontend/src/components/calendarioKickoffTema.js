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
  // Fase 30 (ADR-034): NOTAS alargada de 0,293 → 0,34 para o chip crescer sem
  // fazer os nomes de etapa truncarem (afastamento deliberado do template do
  // Canva — mesma família do "achado 2" da Fase 28). As colunas de dia têm folga
  // de sobra (um número de 2 dígitos em 15pt dentro de ~122px).
  notasFracao: 0.34,         // coluna NOTAS = 34% da largura da tabela
  alturaCabecalho: 56.8,     // linha DOM…SAB
  semanas: 6,                // linhas de semana (grade sempre 6×7)
  // Cabeçalho da página (mês/ano/logo): do topo até o topo da tabela.
  mes:  { x: 24, baseline: 116, corpo: 80 },   // Questrial 80pt, esquerda
  ano:  { centro: 753, baseline: 122, corpo: 80 }, // Questrial 80pt
  logo: { direita: 1334.9, topo: 40, altura: 90 }, // alinhado à borda da tabela
  diaSemana: { corpo: 17 },  // KleinText-Bold 15,9pt → Inter, caixa alta
  numeroDia: { corpo: 15 },  // KleinText-Italic 14,5pt → Inter italic
  legenda: {
    corpoIntervalo: 19,      // dentro do chip (valor transcrito — não mexer)
    corpoNome: 21,           // à direita do chip (20,8pt — transcrito)
    padding: 18,
    chipLargura: 172,        // Fase 30: 118 → 172 (folga real sobre "18/06 - 25/06")
    chipRaio: 8,             // Fase 30: 6 → 8, proporcional à caixa maior
    // Fase 30 (M2): espaçamento vira TOKEN fixo, não mais o resto elástico
    // `Math.min(46, (alturaTotal-pad)/n)` que sobrepunha chips a partir de 16
    // entradas. Dois presets: `normal` e `compacto` (degradação previsível, um
    // degrau só — política A do plano-fase-30 §4.3). A altura de cada entrada
    // passa a ser função do conteúdo (ver planejarLegenda em ...Utils.js).
    presets: {
      normal:   { chipAltura: 36, espacamento: 14 },
      compacto: { chipAltura: 30, espacamento: 10 },
    },
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

// Paleta default das etapas. O gerador cicla por ela na ordem das etapas; o
// gerente pode sobrescrever por etapa dentro desta paleta (não um color picker
// livre — mantém o material dentro da identidade).
//
// Fase 30 (M3, ADR-034): ampliada de 6 → 15 cores. Motivo: o maior serviço do
// catálogo (Plano de Marketing, 13 etapas) esgotava as 6 cores e repetia cor na
// mesma legenda. 6 atuais + 9 novas transcritas de dois PDFs de kick-off (hex
// extraído dos objetos do PDF; os arquivos, material de cliente, NÃO entram no
// repo público). Excluídas 3 candidatas por duplicidade/conflito: #FF3131
// (d=28 de #FF3E4A), #B9CBCF (d=36 de #B4B4B4), #05345F (d=81 do azul do
// cabeçalho).
//
// A ORDEM é parte do contrato (a cor sai de PALETA_ETAPAS[indice % length]):
// reordenada para MAXIMIZAR o contraste entre vizinhos do ciclo — a menor
// distância entre vizinhos subiu de 60,7 para 192,0. Portar ao Hub (Fase 29)
// exige transcrever esta ordem 1:1, senão o mesmo projeto sai com cores
// diferentes nas duas stacks (passo 29d — paridade de cor).
export const PALETA_ETAPAS = [
  '#97826F', // taupe
  '#05FF8F', // verde-neon
  '#FF3E4A', // coral
  '#00BF63', // verde
  '#B4B4B4', // cinza
  '#373B37', // grafite
  '#E2A9F1', // lilás
  '#566869', // cinza-esverdeado
  '#FCFFB8', // amarelo-claro
  '#8C52FF', // roxo
  '#2A965C', // verde-escuro
  '#CB69FF', // orquídea
  '#0097B2', // ciano/petróleo
  '#C9E597', // verde-claro
  '#1800AD', // índigo
];

// Cor legível (texto) sobre um fundo hex — preto ou branco.
//
// Fase 30 (ADR-034): trocada a heurística de luminância simples (corte 0,6) pelo
// CONTRASTE WCAG real. A antiga errava em 6 das cores novas — p.ex. #00BF63
// recebia branco a 2,43:1, reprovando até no mínimo de texto grande (3:1). Agora
// calcula a razão de contraste contra preto e contra branco e escolhe a maior.
function _canalLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function textoSobre(hex) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const lum = 0.2126 * _canalLinear(r) + 0.7152 * _canalLinear(g) + 0.0722 * _canalLinear(b);
  const contrastePreto = (lum + 0.05) / 0.05;   // L do preto = 0
  const contrasteBranco = 1.05 / (lum + 0.05);  // L do branco = 1
  return contrastePreto >= contrasteBranco ? CORES.textoEscuro : '#FFFFFF';
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
