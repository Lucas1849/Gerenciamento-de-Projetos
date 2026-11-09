// Gerador do slide "Cronograma de Execução" da proposta comercial (Fase 32,
// ADR-036).
//
// Mais simples que o gerador de calendário (Fase 28): página única, sempre
// (D6) — sem navegação por mês/ano, sem painel de cor por etapa (o tema é
// fixo, §7 da spec: "hoje não tem cor por fase a persistir"). O preview É a
// fonte da exportação (mesmo SVG), via o módulo `exportarSvg.js` extraído
// nesta mesma fase.

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Copy, Download, FileClock } from 'lucide-react';
import { planejarCronograma } from './cronogramaPropostaUtils';
import { FONTES, GEO } from './cronogramaPropostaTema';
import CronogramaProposta from './CronogramaProposta';
import { embutirFontes, svgParaPngBlob, copiarPng, baixarBlob } from './exportarSvg';

const FONTS_QUERY = `family=${FONTES.display.replace(/ /g, '+')}&family=${FONTES.texto}:wght@400;700`;

const nomeArquivo = (projetoNome) =>
  `cronograma-${(projetoNome || 'projeto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;

export default function GeradorCronogramaProposta({ projetoNome, etapas, toast, aoFechar }) {
  const [ocupado, setOcupado] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    // Preview precisa das fontes (não carregadas pelo app): injeta o link.
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${FONTS_QUERY}&display=swap`;
    document.head.appendChild(link);
    embutirFontes(FONTS_QUERY); // aquece o cache para a exportação
    return () => { document.head.removeChild(link); };
  }, []);

  const plano = useMemo(() => planejarCronograma(etapas), [etapas]);

  const exportar = async () => {
    if (!svgRef.current) return null;
    return svgParaPngBlob(svgRef.current, {
      largura: GEO.largura, altura: GEO.altura, escala: 2, fontsQuery: FONTS_QUERY,
    });
  };

  const copiar = async () => {
    setOcupado(true);
    try {
      const blob = await exportar();
      await copiarPng(blob);
      toast.success('Cronograma copiado — cole no material da proposta.');
    } catch (e) {
      toast.error(e.message || 'Não foi possível copiar.');
    } finally { setOcupado(false); }
  };

  const baixar = async () => {
    setOcupado(true);
    try {
      const blob = await exportar();
      baixarBlob(blob, nomeArquivo(projetoNome));
    } catch (e) {
      toast.error(e.message || 'Não foi possível baixar.');
    } finally { setOcupado(false); }
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Gerador de cronograma da proposta"
      style={{
        position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={aoFechar}
    >
      <div
        className="gerador-cal"
        style={{
          margin: 'auto', width: 'min(1000px, 96vw)', maxHeight: '94vh',
          background: 'var(--color-surface)', borderRadius: 'var(--radius-lg, 16px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: 'var(--shadow-3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-12)', padding: 'var(--sp-16) var(--sp-24)', borderBottom: '1px solid var(--color-border)' }}>
          <FileClock size={20} />
          <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, flex: 1 }}>
            Cronograma de execução — {projetoNome}
          </h3>
          <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={copiar}>
            <Copy size={14} /> Copiar
          </button>
          <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={baixar}>
            <Download size={14} /> Baixar
          </button>
          <button type="button" aria-label="Fechar" onClick={aoFechar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-24)', background: 'var(--color-bg)' }}>
          {plano.aviso && (
            <div style={{
              marginBottom: 'var(--sp-16)', padding: 'var(--sp-12) var(--sp-16)',
              borderRadius: 8, background: 'rgba(255,189,89,0.12)',
              border: '1px solid var(--color-warning, #FFBD59)', fontSize: 'var(--text-caption)',
              lineHeight: 1.5, color: 'var(--color-text)',
            }}>
              {plano.aviso}
            </div>
          )}
          <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-2)' }}>
            <CronogramaProposta ref={svgRef} plano={plano} nomeProjeto={projetoNome} />
          </div>
        </div>
      </div>
    </div>
  );
}
