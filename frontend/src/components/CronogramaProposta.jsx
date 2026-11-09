import { forwardRef } from 'react';
import { GEO, CORES, FONTES, MARCA_TEXTO_URL } from './cronogramaPropostaTema';

// Componente SVG do slide "Cronograma de Execução" da proposta comercial
// (Fase 32, ADR-036; corrigido no hotfix de 09/11/2026 —
// docs/features/hotfix-fase-32-cronograma.md). Mesmo princípio do
// `CalendarioKickoff.jsx` (Fase 28, ADR-032): o mesmo SVG é o preview na tela
// e a fonte da exportação (rasterizado em canvas pelo `exportarSvg.js`).
// Cores/fontes vêm do tema (`cronogramaPropostaTema.js`) — sem custom
// properties do app dentro do SVG, para portar ao Hub.
//
// `plano` é o resultado de `planejarCronograma(etapas)`
// (`cronogramaPropostaUtils.js`): fases já com y/altura resolvidos (linhas
// esticadas para preencher o painel, H2), numeração já na ordem de desenho
// (H1), linhas já quebradas em sub-linhas de texto (D5: nunca truncar).
const CronogramaProposta = forwardRef(function CronogramaProposta(
  { plano, estiloFontes = null }, ref
) {
  const { painel, rodape, marca } = GEO;
  const familiaDisplay = `${FONTES.display}, ${FONTES.displayFallback}`;
  const familiaTexto = `${FONTES.texto}, ${FONTES.textoFallback}`;

  const yBaseLinhaNome = (linha, i) => {
    // Centraliza o bloco de sub-linhas de etapa na altura da linha, uma
    // etapa após a outra quando a linha é um bloco de N etapas.
    const totalSub = linha.etapas.reduce((s, e) => s + e.linhasNome.length, 0);
    const alturaTexto = totalSub * GEO.linha[plano.preset].alturaNome;
    let y = linha.y + (linha.altura - alturaTexto) / 2 + GEO.linha[plano.preset].alturaNome * 0.75;
    for (let k = 0; k < i; k++) y += linha.etapas[k].linhasNome.length * GEO.linha[plano.preset].alturaNome;
    return y;
  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${GEO.largura} ${GEO.altura}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {estiloFontes && <style dangerouslySetInnerHTML={{ __html: estiloFontes }} />}
        {/* D1 (ADR-036): gradiente vetorial do fundo — H12: é o gradiente
            real do PDF, vertical, do azul quase preto ao preto. */}
        <linearGradient id="cp-fundo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CORES.fundoTopo} />
          <stop offset="1" stopColor={CORES.fundoBase} />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={GEO.largura} height={GEO.altura} fill="url(#cp-fundo)" />

      {/* Título */}
      <text
        x={GEO.titulo.x} y={painel.y - 17}
        fontFamily={familiaDisplay} fontSize={GEO.titulo.corpo} fill={CORES.textoClaro}
      >
        Cronograma de Execução
      </text>

      {/* Marca "APOIO CONSULTORIA" (H4, revisão 5' — só o texto, já branco
          nativo em marca-apoio-texto.svg, sem filtro) — nunca o nome interno
          do projeto (H5, removido: o slide vai para o cliente). */}
      <image
        href={MARCA_TEXTO_URL} xlinkHref={MARCA_TEXTO_URL}
        x={marca.x} y={marca.y} width={marca.largura} height={marca.altura}
      />

      {/* Painel da tabela: card opaco com borda e cantos arredondados (H6) —
          medido no PDF, não o retângulo translúcido da primeira spec. */}
      <rect x={painel.x} y={painel.y} width={painel.largura} height={painel.altura}
        rx={painel.raio} fill={CORES.painelFundo} stroke={CORES.painelBorda} strokeWidth={GEO.espessuraBorda} />

      {/* Cabeçalho (rótulos das três colunas) — "Fase da Timeline" repetido
          é do modelo aprovado e fica (H9, decisão do responsável). */}
      <text x={GEO.cabecalhoColunas.fase} y={GEO.cabecalhoBase}
        fontFamily={familiaDisplay} fontSize={GEO.cabecalho.corpo} fill={CORES.destaque}>Fase da Timeline</text>
      <text x={GEO.cabecalhoColunas.etapa} y={GEO.cabecalhoBase}
        fontFamily={familiaDisplay} fontSize={GEO.cabecalho.corpo} fill={CORES.destaque}>Fase da Timeline</text>
      <text x={GEO.cabecalhoColunas.prazo} y={GEO.cabecalhoBase}
        fontFamily={familiaDisplay} fontSize={GEO.cabecalho.corpo} fill={CORES.destaque}>Prazo Estimado</text>

      {/* Separador cheio abaixo do cabeçalho — mesma cor do separador entre
          fases (H10/H11). */}
      <rect x={painel.x} y={painel.y + GEO.alturaCabecalho} width={painel.largura}
        height={GEO.espessuraSeparador} fill={CORES.separadorFase} />

      {plano.fases.map((f, fi) => (
        <g key={f.fase ?? `nc-${fi}`}>
          {/* Separador cheio entre fases (não antes da primeira, que já tem
              o separador do cabeçalho) — H11: #254D77, mais visível. */}
          {fi > 0 && (
            <rect x={painel.x} y={f.yInicio} width={painel.largura}
              height={GEO.espessuraSeparador} fill={CORES.separadorFase} />
          )}

          {/* Rótulo da fase, centrado na banda, com "Fase N:" (H7) — a
              numeração é a posição canônica (1-4); a faixa "não classificada"
              fica sem número. */}
          <text x={GEO.colunas.fase} y={(f.yInicio + f.yFim) / 2 + 7}
            fontFamily={familiaTexto} fontWeight="700" fontSize={GEO.rotuloFase.corpo} fill={CORES.destaque}>
            {f.fase ? `Fase ${fi + 1}: ${FASE_TITULO[f.fase]}` : 'Não classificada'}
          </text>

          {f.linhas.length === 0 && (
            <text x={GEO.colunas.etapa} y={(f.yInicio + f.yFim) / 2 + 5}
              fontFamily={familiaTexto} fontSize={GEO.nomeEtapa.corpo} fill={CORES.textoPrazo} fontStyle="italic">
              Nenhuma etapa nesta fase.
            </text>
          )}

          {f.linhas.map((linha, li) => (
            <g key={linha.chave}>
              {/* Separador parcial entre linhas da mesma fase (não antes da
                  primeira linha, cuja borda superior é a da própria fase) —
                  H11: #1F2F47, discreto. */}
              {li > 0 && (
                <rect x={GEO.fronteiraEtapaX} y={linha.y} width={painel.x + painel.largura - GEO.fronteiraEtapaX}
                  height={GEO.espessuraSeparador} fill={CORES.separadorInterno} />
              )}

              {linha.etapas.map((e, ei) => (
                <g key={ei}>
                  {e.linhasNome.map((texto, li2) => (
                    <text key={li2}
                      x={GEO.colunas.etapa} y={yBaseLinhaNome(linha, ei) + li2 * GEO.linha[plano.preset].alturaNome}
                      fontFamily={familiaTexto} fontSize={GEO.nomeEtapa.corpo} fill={CORES.textoClaro}>
                      {li2 === 0 ? `${e.numero}ª ${texto}` : texto}
                    </text>
                  ))}
                </g>
              ))}

              <text x={GEO.colunas.prazo} y={(linha.y + linha.y + linha.altura) / 2 + 7}
                fontFamily={familiaTexto} fontWeight="700" fontSize={GEO.prazoValor.corpo} fill={CORES.textoPrazo}>
                {linha.dias} dia{linha.dias === 1 ? '' : 's'}
              </text>
            </g>
          ))}
        </g>
      ))}

      {/* Rodapé: card igual ao painel (H6/H11), rótulo à esquerda e total na
          coluna de prazo, numa linha só (H3). */}
      <rect x={rodape.x} y={rodape.y} width={rodape.largura} height={rodape.altura}
        rx={rodape.raio} fill={CORES.painelFundo} stroke={CORES.painelBorda} strokeWidth={GEO.espessuraBorda} />
      <text x={GEO.rodapeRotulo.x} y={GEO.rodapeRotulo.base}
        fontFamily={familiaTexto} fontWeight="700" fontSize={GEO.rodapeRotulo.corpo} fill={CORES.textoClaro}>
        Duração Total do Projeto
      </text>
      <text x={GEO.rodapeTotal.x} y={GEO.rodapeTotal.base}
        fontFamily={familiaTexto} fontWeight="700" fontSize={GEO.rodapeTotal.corpo} fill={CORES.destaque}>
        {plano.total} Dias ÚTEIS
      </text>
    </svg>
  );
});

const FASE_TITULO = {
  alinhamento: 'Alinhamento',
  diagnostico: 'Diagnóstico',
  estrategia: 'Estratégia',
  acao: 'Ação',
};

export default CronogramaProposta;
