import { forwardRef } from 'react';
import { GEO, CORES, FONTES } from './cronogramaPropostaTema';

// Componente SVG do slide "Cronograma de Execução" da proposta comercial
// (Fase 32, ADR-036). Mesmo princípio do `CalendarioKickoff.jsx` (Fase 28,
// ADR-032): o mesmo SVG é o preview na tela e a fonte da exportação
// (rasterizado em canvas pelo `exportarSvg.js`, extraído na própria Fase 32).
// Cores/fontes vêm do tema (`cronogramaPropostaTema.js`) — sem custom
// properties do app dentro do SVG, para portar ao Hub.
//
// `plano` é o resultado de `planejarCronograma(etapas)`
// (`cronogramaPropostaUtils.js`): fases já com y/altura resolvidos, linhas já
// quebradas em sub-linhas de texto (D5: nunca truncar).
const CronogramaProposta = forwardRef(function CronogramaProposta(
  { plano, nomeProjeto, estiloFontes = null }, ref
) {
  const { painel, rodape } = GEO;
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
        {/* D1 (ADR-036): gradiente vetorial aproximando o fundo texturizado
            do PDF original — mantém o componente 100% vetorial e portável. */}
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
      {nomeProjeto && (
        <text
          x={GEO.titulo.x + 520} y={painel.y - 17}
          fontFamily={familiaTexto} fontSize={18} fill={CORES.textoPrazo}
        >
          {nomeProjeto}
        </text>
      )}

      {/* Sem fundo sólido para o painel: a tabela fica sobre o gradiente da
          página (fundo), e a estrutura visual vem só dos separadores e da
          barra do rodapé — os três compartilham a mesma cor no original
          (CORES.painel), coerente com a leitura de que a tabela não tem
          card de fundo próprio. */}

      {/* Cabeçalho (rótulos das três colunas) */}
      <text x={GEO.colunas.fase} y={painel.y + GEO.alturaCabecalho / 2 + 8}
        fontFamily={familiaDisplay} fontSize={GEO.cabecalho.corpo} fill={CORES.destaque}>Fase</text>
      <text x={GEO.colunas.etapa} y={painel.y + GEO.alturaCabecalho / 2 + 8}
        fontFamily={familiaDisplay} fontSize={GEO.cabecalho.corpo} fill={CORES.destaque}>Etapa</text>
      <text x={GEO.colunas.prazo} y={painel.y + GEO.alturaCabecalho / 2 + 8}
        fontFamily={familiaDisplay} fontSize={GEO.cabecalho.corpo} fill={CORES.destaque}>Prazo Estimado</text>

      {/* Separador cheio abaixo do cabeçalho */}
      <rect x={painel.x} y={painel.y + GEO.alturaCabecalho} width={painel.largura}
        height={GEO.espessuraSeparador} fill={CORES.painel === CORES.textoClaro ? CORES.textoClaro : '#1B3A5C'} />

      {plano.fases.map((f, fi) => (
        <g key={f.fase ?? `nc-${fi}`}>
          {/* Separador cheio entre fases (não antes da primeira, que já tem
              o separador do cabeçalho). */}
          {fi > 0 && (
            <rect x={painel.x} y={f.yInicio} width={painel.largura}
              height={GEO.espessuraSeparador} fill={CORES.painel} />
          )}

          {/* Rótulo da fase, centrado na banda. */}
          <text x={GEO.colunas.fase} y={(f.yInicio + f.yFim) / 2 + 7}
            fontFamily={familiaTexto} fontWeight="700" fontSize={GEO.rotuloFase.corpo} fill={CORES.destaque}>
            {f.fase ? FASE_TITULO[f.fase] : 'Não classificada'}
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
                  primeira linha, cuja borda superior é a da própria fase). */}
              {li > 0 && (
                <rect x={GEO.fronteiraEtapaX} y={linha.y} width={painel.x + painel.largura - GEO.fronteiraEtapaX}
                  height={GEO.espessuraSeparador} fill={CORES.painel} />
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

      {/* Rodapé */}
      <rect x={rodape.x} y={rodape.y} width={rodape.largura} height={rodape.altura} fill={CORES.painel} />
      <text x={GEO.titulo.x + 3} y={rodape.y + rodape.altura / 2 - 2}
        fontFamily={familiaTexto} fontWeight="700" fontSize={GEO.rodapeRotulo.corpo} fill={CORES.textoClaro}>
        Duração Total do Projeto
      </text>
      <text x={GEO.titulo.x + 3} y={rodape.y + rodape.altura / 2 + 22}
        fontFamily={familiaTexto} fontWeight="700" fontSize={GEO.rodapeTotal.corpo} fill={CORES.destaque}>
        {plano.total} Dias Úteis
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
