import { forwardRef } from 'react';
import {
  GEO, CORES, FONTES, LOGO_URL, LOGO_RATIO,
  larguraColunaDia, larguraColunaNotas, alturaLinhaSemana, textoSobre,
} from './calendarioKickoffTema';
import { rotuloMes } from './datasUtils';

const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

// Quebra um nome em até `maxLinhas` linhas que caibam em `larguraMax` (px),
// estimando ~0,55·corpo por caractere (Inter). Layout SVG não tem wrap de CSS
// (ADR-032), então a quebra é manual — helper próprio, como previsto no plano.
function quebrarTexto(texto, larguraMax, corpo, maxLinhas = 2) {
  const porChar = corpo * 0.55;
  const maxChars = Math.max(4, Math.floor(larguraMax / porChar));
  const palavras = texto.split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (tentativa.length <= maxChars) atual = tentativa;
    else { if (atual) linhas.push(atual); atual = p; }
    if (linhas.length === maxLinhas) break;
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual);
  // Se sobrou texto, reticências na última linha.
  if (linhas.length === maxLinhas) {
    const usado = linhas.join(' ').length;
    if (usado < texto.length) linhas[maxLinhas - 1] = linhas[maxLinhas - 1].replace(/.{1}$/, '…');
  }
  return linhas;
}

// Componente SVG de UMA página do calendário de kick-off (ADR-032). O mesmo SVG
// é o preview na tela e a fonte da exportação (rasterizado em canvas 2×). Cores
// e fontes vêm do tema (calendarioKickoffTema.js) — sem custom properties do app
// dentro do SVG, o que faz o componente portar para o Hub. Fundo sempre claro.
//
// `estiloFontes` (opcional): bloco <style> com @font-face embutidos, injetado só
// na exportação para a rasterização enxergar as fontes (o preview usa as fontes
// já carregadas no documento).
const CalendarioKickoff = forwardRef(function CalendarioKickoff(
  { pagina, estiloFontes = null }, ref
) {
  const { tabela, alturaCabecalho } = GEO;
  const colDia = larguraColunaDia();
  const colNotas = larguraColunaNotas();
  const rowH = alturaLinhaSemana();
  const gridY = tabela.y + alturaCabecalho;
  const notasX = tabela.x + 7 * colDia;

  const familiaDisplay = `${FONTES.display}, ${FONTES.displayFallback}`;
  const familiaTexto = `${FONTES.texto}, ${FONTES.textoFallback}`;

  const nomeMes = rotuloMes(pagina.ano, pagina.mes).split(' ')[0].toUpperCase();

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${GEO.largura} ${GEO.altura}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {estiloFontes && <defs dangerouslySetInnerHTML={{ __html: `<style>${estiloFontes}</style>` }} />}
      <rect x="0" y="0" width={GEO.largura} height={GEO.altura} fill={CORES.celulaDia} />

      {/* Cabeçalho: mês à esquerda, ano ao centro, logo à direita */}
      <text
        x={GEO.mes.x} y={GEO.mes.baseline}
        fontFamily={familiaDisplay} fontSize={GEO.mes.corpo}
        fill={CORES.textoEscuro} letterSpacing="6"
      >{nomeMes}</text>
      <text
        x={GEO.ano.centro} y={GEO.ano.baseline} textAnchor="middle"
        fontFamily={familiaDisplay} fontSize={GEO.ano.corpo} fill={CORES.textoEscuro}
      >{pagina.ano}</text>
      <image
        href={LOGO_URL} xlinkHref={LOGO_URL}
        x={GEO.logo.direita - GEO.logo.altura * LOGO_RATIO}
        y={GEO.logo.topo} height={GEO.logo.altura}
        preserveAspectRatio="xMinYMin meet"
      />

      {/* Linha de cabeçalho da grade (azul) */}
      <rect x={tabela.x} y={tabela.y} width={tabela.largura} height={alturaCabecalho} fill={CORES.azulCabecalho} />
      {DIAS_SEMANA.map((d, i) => (
        <text
          key={d} x={tabela.x + i * colDia + colDia / 2}
          y={tabela.y + alturaCabecalho / 2 + 6} textAnchor="middle"
          fontFamily={familiaTexto} fontSize={GEO.diaSemana.corpo} fontWeight="700"
          letterSpacing="2" fill="#FFFFFF"
        >{d}</text>
      ))}
      <text
        x={notasX + colNotas / 2} y={tabela.y + alturaCabecalho / 2 + 6}
        textAnchor="middle" fontFamily={familiaTexto} fontSize={GEO.diaSemana.corpo}
        fontWeight="700" letterSpacing="2" fill="#FFFFFF"
      >NOTAS</text>

      {/* Fundo da coluna NOTAS */}
      <rect x={notasX} y={gridY} width={colNotas} height={rowH * GEO.semanas} fill={CORES.fundoNotas} />

      {/* Células dos dias */}
      {pagina.celulas.map((c, i) => {
        const row = Math.floor(i / 7), col = i % 7;
        const x = tabela.x + col * colDia, y = gridY + row * rowH;
        const faixas = c.faixas || [];
        return (
          <g key={i}>
            <rect x={x} y={y} width={colDia} height={rowH} fill={CORES.celulaDia}
              stroke={CORES.gradeLinha} strokeWidth="1" />
            {/* Sobreposição = faixas horizontais divididas (uma banda por etapa) */}
            {faixas.map((f, k) => (
              <rect
                key={k} x={x + 1} y={y + 1 + (rowH - 2) * (k / faixas.length)}
                width={colDia - 2} height={(rowH - 2) / faixas.length} fill={f.cor}
              />
            ))}
            {!c.vazia && (
              <text
                x={x + colDia - 8} y={y + 20} textAnchor="end"
                fontFamily={familiaTexto} fontSize={GEO.numeroDia.corpo}
                fontStyle="italic" fill={CORES.textoEscuro}
              >{c.dia}</text>
            )}
          </g>
        );
      })}

      {/* Grade: linhas verticais/horizontais da área de dias */}
      {Array.from({ length: 6 }, (_, k) => (
        <line key={`v${k}`} x1={tabela.x + (k + 1) * colDia} y1={gridY}
          x2={tabela.x + (k + 1) * colDia} y2={gridY + rowH * GEO.semanas}
          stroke={CORES.gradeLinha} strokeWidth="1" />
      ))}

      {/* Legenda na coluna NOTAS */}
      <Legenda entradas={pagina.legenda} x={notasX} y={gridY} largura={colNotas}
        alturaTotal={rowH * GEO.semanas} familia={familiaTexto} />
    </svg>
  );
});

function Legenda({ entradas, x, y, largura, alturaTotal, familia }) {
  const pad = GEO.legenda.padding;
  const { chipLargura, chipAltura, corpoIntervalo, corpoNome } = GEO.legenda;
  // Altura por entrada ajustada para caber tudo (mínimo 40, evita estouro).
  const alturaEntrada = Math.min(
    GEO.legenda.alturaEntrada,
    entradas.length ? (alturaTotal - pad) / entradas.length : GEO.legenda.alturaEntrada
  );
  const nomeX = x + pad + chipLargura + 12;
  const nomeLargura = largura - pad * 2 - chipLargura - 12;

  return (
    <g>
      {entradas.map((e, i) => {
        const ey = y + pad + i * alturaEntrada;
        const chipY = ey + (alturaEntrada - chipAltura) / 2;
        const linhas = quebrarTexto(e.nome, nomeLargura, corpoNome, 2);
        const nomeY = ey + alturaEntrada / 2 - (linhas.length - 1) * (corpoNome * 0.55);
        return (
          <g key={i}>
            <rect x={x + pad} y={chipY} width={chipLargura} height={chipAltura}
              rx="6" fill={e.cor} />
            <text
              x={x + pad + chipLargura / 2} y={chipY + chipAltura / 2 + corpoIntervalo / 3}
              textAnchor="middle" fontFamily={familia} fontSize={corpoIntervalo}
              fontWeight="700" fill={textoSobre(e.cor)}
            >{e.intervalo}</text>
            {linhas.map((ln, k) => (
              <text
                key={k} x={nomeX} y={nomeY + k * (corpoNome * 1.1) + corpoNome / 3}
                fontFamily={familia} fontSize={corpoNome} fontWeight="700"
                fill={CORES.textoEscuro}
              >{ln}</text>
            ))}
          </g>
        );
      })}
    </g>
  );
}

export default CalendarioKickoff;
