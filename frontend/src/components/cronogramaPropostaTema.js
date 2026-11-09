// Tema do slide "Cronograma de Execução" da proposta comercial (Fase 32,
// ADR-036; cores e caixas corrigidas no hotfix de 09/11/2026).
//
// Mesmo princípio do `calendarioKickoffTema.js` (Fase 28/30): TODAS as
// constantes visuais vivem aqui — geometria, paleta e fontes — para o
// componente SVG portar ao Hub numa edição só e para os valores oficiais não
// ficarem espalhados em literais. É um tema PRÓPRIO, distinto do calendário
// (nenhuma cor é compartilhada) — ver docs/features/cronograma-proposta.md.
//
// Geometria TRANSCRITA do PDF real (`Proposta Espaço da Mente.pdf`) via
// matrizes cm/Tm — ver cronograma-proposta.md §3. O número de linhas de prazo
// varia por projeto (este slide é gerado por projeto, não por catálogo),
// então a altura de cada linha é computada por conteúdo (D2, ADR-036, revisto
// no hotfix: esticada até preencher o painel) — só a moldura (painel, rodapé,
// cabeçalho, colunas) é fixa.
//
// Hotfix de 09/11/2026 (docs/features/hotfix-fase-32-cronograma.md, H6/H8/H9/
// H11/H12): a primeira transcrição (15/10) leu só a cor de preenchimento
// (`rg`) do PDF e tratou traços (`S`/`RG`/`LW`) e recortes (`re W n`) como se
// fossem preenchimento — por isso tinha o fundo, o painel e os separadores
// todos errados. A releitura de 09/11 corrigiu os três separadamente.

export const GEO = {
  largura: 1440,
  altura: 810,
  // Painel da tabela: card opaco #162136, raio 22,5, borda #253753 3,0 (H6).
  painel: { x: 127.6, y: 52.5, largura: 1185.5, altura: 668.6, raio: 22.5 },
  // Barra do rodapé: mesma construção do painel, raio menor (H6/H11).
  rodape: { x: 130.6, y: 739.9, largura: 1181.7, altura: 62.2, raio: 18.75 },
  espessuraBorda: 3.0,
  // Linha "Fase da Timeline" / "Fase da Timeline" / "Prazo Estimado".
  alturaCabecalho: 71.6, // 124.1 - 52.5
  // x onde a coluna de Fase termina e a de Etapa/Prazo começa — é também
  // onde o separador PARCIAL (dentro de uma fase) começa; o separador CHEIO
  // (entre fases) atravessa a largura toda do painel.
  fronteiraEtapaX: 460.0,
  espessuraSeparador: 2.25, // H11: /LW 3 × escala 0,75 no PDF
  // Posição (x) do texto de cada coluna de DADO, pela linha de base.
  colunas: {
    fase: 160.4,
    etapa: 486.8,
    prazo: 1096.6,
  },
  // Cabeçalho: posições e base próprias, diferentes das colunas de dado (H9).
  cabecalhoColunas: {
    fase: 164.0,
    etapa: 495.8,
    prazo: 1096.6,
  },
  cabecalhoBase: 108.1,
  // Caixa da marca "APOIO CONSULTORIA" no canto superior direito (H4).
  marca: { x: 1302.6, y: 3.8, largura: 113.2, altura: 38.2 },
  titulo: { x: 127.6, corpo: 44.2 },
  cabecalho: { corpo: 25.0 },
  rotuloFase: { corpo: 20.2 },
  nomeEtapa: { corpo: 20.2 },
  prazoValor: { corpo: 25.0 }, // H8: era 20,2 — erro de transcrição para o tema
  // Rodapé: rótulo à esquerda, total na coluna de prazo, numa linha só (H3).
  rodapeRotulo: { x: 160.4, base: 780.4, corpo: 20.2 },
  rodapeTotal: { x: 1088.8, base: 785.4, corpo: 25.0 },
  // D2 (ADR-036, revisto no hotfix H2): altura de linha por CONTEÚDO (nº de
  // nomes de etapa empilhados na mesma linha de prazo), com mínimo fixo —
  // depois esticada proporcionalmente até preencher o painel (nunca vão
  // vazio antes do rodapé). `normal` recalibrado pelos valores medidos no
  // PDF (nome ≈42, padding ≈4, mínima ≈48); valores antigos (16/64) eram bem
  // mais folgados que o modelo e causavam falso aviso de "conteúdo extenso".
  linha: {
    normal:   { alturaNome: 42, padding: 4, minima: 48 },
    compacto: { alturaNome: 30, padding: 10, minima: 44 },
  },
};

// ── Paleta (transcrita — tema PRÓPRIO, não compartilha nada com o
// calendário de kick-off) ───────────────────────────────────────────────────
export const CORES = {
  // D1 (ADR-036): gradiente SVG vetorial do fundo da página — H12: é um
  // gradiente real do PDF (`/P4`), não uma textura rasterizada; cores
  // corrigidas na releitura de 09/11 (iam de #1F2F47 a #253753, que são na
  // verdade cores de traço, não de fundo).
  fundoTopo: '#00063B',
  fundoBase: '#000000',
  // Painel e rodapé: card opaco, não a cor chapada que a 1ª transcrição deu
  // (H6/H11).
  painelFundo: '#162136',
  painelBorda: '#253753',
  // Separadores: cheio (cabeçalho + entre fases) é mais visível que o
  // parcial/interno (dentro da fase) — regra lida do modelo, não o deslize
  // de montagem do separador Fase1/Fase2 (H11).
  separadorFase: '#254D77',
  separadorInterno: '#1F2F47',
  textoClaro: '#FFFFFF',   // título, nomes das etapas, rótulo do rodapé, marca
  destaque: '#8FC6FF',     // cabeçalho da tabela, rótulos de fase, total
  textoPrazo: '#94A3B8',   // valores de prazo ("5 dias"…)
  // Marca "APOIO CONSULTORIA": branca sobre este fundo escuro — o arquivo
  // original (`marca-apoio.svg`) é azul-marinho (#03345F), que sumiria aqui;
  // aplicada via filtro CSS na montagem, sem gerar um arquivo novo (H4).
  marca: '#FFFFFF',
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
