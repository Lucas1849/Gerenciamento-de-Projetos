// Tema do slide "Cronograma de Execução" da proposta comercial (Fase 32,
// ADR-036).
//
// Mesmo princípio do `calendarioKickoffTema.js` (Fase 28/30): TODAS as
// constantes visuais vivem aqui — geometria, paleta e fontes — para o
// componente SVG portar ao Hub numa edição só e para os valores oficiais não
// ficarem espalhados em literais. É um tema PRÓPRIO, distinto do calendário
// (nenhuma cor é compartilhada) — ver docs/features/cronograma-proposta.md.
//
// Geometria TRANSCRITA do PDF real (`Proposta Espaço da Mente.pdf`,
// 15/10/2026) via matrizes cm/Tm — ver cronograma-proposta.md §3. O número de
// linhas de prazo varia por projeto (este slide é gerado por projeto, não por
// catálogo), então a altura de cada linha é computada por conteúdo (D2,
// ADR-036), não transcrita do exemplar — só a moldura (painel, rodapé,
// cabeçalho, colunas) é fixa.

export const GEO = {
  largura: 1440,
  altura: 810,
  // Painel da tabela (fundo escuro translúcido sobre o gradiente de página).
  painel: { x: 127.6, y: 52.5, largura: 1185.5, altura: 668.6 },
  // Barra do rodapé ("Duração Total do Projeto" · "N Dias Úteis").
  rodape: { x: 130.6, y: 739.9, largura: 1181.7, altura: 62.2 },
  // Linha "Fase da Timeline" / "Fase da Timeline" / "Prazo Estimado".
  alturaCabecalho: 71.6, // 124.1 - 52.5
  // x onde a coluna de Fase termina e a de Etapa/Prazo começa — é também
  // onde o separador PARCIAL (dentro de uma fase) começa; o separador CHEIO
  // (entre fases) atravessa a largura toda do painel.
  fronteiraEtapaX: 460.0,
  espessuraSeparador: 2.2,
  // Posição (x) do texto de cada coluna, pela linha de base.
  colunas: {
    fase: 160.4,
    etapa: 486.8,
    prazo: 1096.6,
  },
  titulo: { x: 127.6, corpo: 44.2 },
  cabecalho: { corpo: 25.0 },
  rotuloFase: { corpo: 20.2 },
  nomeEtapa: { corpo: 20.2 },
  prazoValor: { corpo: 20.2 },
  rodapeRotulo: { corpo: 20.2 },
  rodapeTotal: { corpo: 25.0 },
  // D2 (ADR-036): altura de linha por CONTEÚDO (nº de nomes de etapa
  // empilhados na mesma linha de prazo — bloco de N etapas = N nomes), com
  // mínimo fixo — não a irregularidade de montagem manual do PDF (82·48·100…).
  // D3/D6: dois presets (política A da Fase 30); página única sempre.
  linha: {
    normal:   { alturaNome: 42, padding: 16, minima: 64 },
    compacto: { alturaNome: 30, padding: 10, minima: 44 },
  },
};

// ── Paleta (transcrita — tema PRÓPRIO, não compartilha nada com o
// calendário de kick-off) ───────────────────────────────────────────────────
export const CORES = {
  // D1 (ADR-036): gradiente SVG vetorial aproximando as duas camadas do PDF
  // (que tem imagem rasterizada + /Pattern) — mantém o componente leve e
  // portável, ao custo de não ser pixel-a-pixel idêntico ao original.
  fundoTopo: '#1F2F47',
  fundoBase: '#253753',
  painel: '#254D77',       // painel da tabela, barra do rodapé, separadores
  textoClaro: '#FFFFFF',   // título, nomes das etapas, rótulo do rodapé
  destaque: '#8FC6FF',     // cabeçalho da tabela, rótulos de fase, total
  textoPrazo: '#94A3B8',   // valores de prazo ("5 dias"…)
};

// ── Tipografia ──────────────────────────────────────────────────────────────
// DM Serif Display e Poppins: as duas Google Fonts sob licença OFL, portanto
// EMBUTÍVEIS — fidelidade tipográfica total, sem o trade-off do Klein Text
// que a Fase 28 teve de assumir (ADR-032).
export const FONTES = {
  display: 'DM Serif Display', // título, cabeçalho da tabela
  displayFallback: 'Georgia, serif',
  texto: 'Poppins',             // rótulos de fase, prazos, rodapé, nomes de etapa
  textoFallback: 'system-ui, sans-serif',
};

// ── Derivados ────────────────────────────────────────────────────────────────
export function alturaConteudoDisponivel() {
  return GEO.painel.altura - GEO.alturaCabecalho;
}
