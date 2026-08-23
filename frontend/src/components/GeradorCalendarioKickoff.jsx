// Gerador do calendário de kick-off (Fase 28, ADR-031/032/033).
//
// Overlay dentro do projeto: painel de estilização (cor por etapa, dentro da
// paleta do template) ao lado do preview paginado por mês. O preview É a fonte
// da exportação (mesmo SVG rasterizado 2×). Copiar é por mês (limitação da área
// de transferência); baixar por mês ou tudo num zip. Fundo do artefato sempre
// claro, independente do tema escuro do app.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Copy, Download, Archive, CalendarRange } from 'lucide-react';
import { listarFeriados, obterCalendarioConfig, salvarCalendarioConfig } from '../services/api';
import { montarPaginas, anosDoProjeto } from './calendarioKickoffUtils';
import { PALETA_ETAPAS } from './calendarioKickoffTema';
import { rotuloMes } from './datasUtils';
import CalendarioKickoff from './CalendarioKickoff';
import { svgParaPngBlob, copiarPng, baixarBlob, zipStore, embutirFontes } from './calendarioKickoffExport';

const nomeArquivo = (projetoNome, ano, mes) =>
  `calendario-${(projetoNome || 'projeto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${ano}-${String(mes).padStart(2, '0')}.png`;

export default function GeradorCalendarioKickoff({ projetoId, projetoNome, etapas, toast, aoFechar }) {
  const [feriados, setFeriados] = useState([]);
  const [cores, setCores] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const svgRefs = useRef(new Map());

  useEffect(() => {
    // Preview precisa da Questrial (não carregada pelo app): injeta o link.
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Questrial&display=swap';
    document.head.appendChild(link);
    embutirFontes(); // aquece o cache das fontes embutidas para a exportação
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const anos = anosDoProjeto(etapas);
    Promise.all([
      Promise.all(anos.map(a => listarFeriados(a).then(r => r.feriados))),
      obterCalendarioConfig(projetoId).then(r => r.cores).catch(() => ({})),
    ])
      .then(([listas, coresSalvas]) => {
        setFeriados(listas.flat());
        setCores(coresSalvas || {});
      })
      .catch(() => toast.error('Erro ao carregar feriados/estilização.'))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  const { itens, paginas } = useMemo(
    () => montarPaginas(etapas, feriados, cores),
    [etapas, feriados, cores]
  );

  const mudarCor = useCallback((key, cor) => {
    setCores(prev => {
      const novo = { ...prev, [key]: cor };
      salvarCalendarioConfig(projetoId, novo)
        .catch(() => toast.error('Erro ao salvar a cor (mudança mantida só nesta sessão).'));
      return novo;
    });
  }, [projetoId, toast]);

  const exportarPagina = useCallback(async (idx) => {
    const svg = svgRefs.current.get(idx);
    if (!svg) return null;
    return svgParaPngBlob(svg);
  }, []);

  const copiar = async (idx) => {
    setOcupado(true);
    try {
      const blob = await exportarPagina(idx);
      await copiarPng(blob);
      toast.success('Mês copiado — cole no slide do Canva (uma imagem por cópia).');
    } catch (e) {
      toast.error(e.message || 'Não foi possível copiar.');
    } finally { setOcupado(false); }
  };

  const baixar = async (idx, pagina) => {
    setOcupado(true);
    try {
      const blob = await exportarPagina(idx);
      baixarBlob(blob, nomeArquivo(projetoNome, pagina.ano, pagina.mes));
    } catch (e) {
      toast.error(e.message || 'Não foi possível baixar.');
    } finally { setOcupado(false); }
  };

  const baixarTodos = async () => {
    setOcupado(true);
    try {
      const arquivos = [];
      for (let i = 0; i < paginas.length; i++) {
        const blob = await exportarPagina(i);
        if (blob) arquivos.push({ nome: nomeArquivo(projetoNome, paginas[i].ano, paginas[i].mes), blob });
      }
      const zip = await zipStore(arquivos);
      baixarBlob(zip, `calendario-${(projetoNome || 'projeto').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`);
      toast.success('Zip baixado — arraste os PNGs de uma vez no painel de uploads do Canva.');
    } catch (e) {
      toast.error(e.message || 'Não foi possível gerar o zip.');
    } finally { setOcupado(false); }
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Gerador de calendário de kick-off"
      style={{
        position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={aoFechar}
    >
      <div
        className="gerador-cal"
        style={{
          margin: 'auto', width: 'min(1180px, 96vw)', height: '94vh',
          background: 'var(--color-surface)', borderRadius: 'var(--radius-lg, 16px)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: 'var(--shadow-3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Barra de topo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-12)', padding: 'var(--sp-16) var(--sp-24)', borderBottom: '1px solid var(--color-border)' }}>
          <CalendarRange size={20} />
          <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, flex: 1 }}>
            Calendário de kick-off — {projetoNome}
          </h3>
          <button type="button" className="btn-primary btn-sm" disabled={ocupado || !paginas.length} onClick={baixarTodos}>
            <Archive size={15} /> Baixar todos (.zip)
          </button>
          <button type="button" aria-label="Fechar" onClick={aoFechar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Painel de estilização */}
          <aside style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--color-border)', overflowY: 'auto', padding: 'var(--sp-16)' }}>
            <h4 style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--color-text-secondary)', marginBottom: 'var(--sp-12)' }}>
              Cor por etapa
            </h4>
            {itens.length === 0 && (
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)' }}>
                Nenhuma etapa com datas definidas — defina data de início e prazo nas etapas para gerar o calendário.
              </p>
            )}
            {itens.map((it) => (
              <div key={it.key} style={{ marginBottom: 'var(--sp-16)' }}>
                <div style={{ fontSize: 'var(--text-caption)', fontWeight: 600, marginBottom: 'var(--sp-6)' }}>
                  {it.rotuloBloco ? `${it.rotuloBloco}: ${it.nome}` : it.nome}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PALETA_ETAPAS.map(cor => (
                    <button
                      key={cor} type="button" aria-label={`Cor ${cor}`}
                      onClick={() => mudarCor(it.key, cor)}
                      style={{
                        width: 24, height: 24, borderRadius: 6, background: cor, cursor: 'pointer',
                        border: it.cor.toLowerCase() === cor.toLowerCase() ? '3px solid var(--color-text)' : '1px solid var(--color-border)',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <p style={{ marginTop: 'var(--sp-16)', fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Feriado (laranja) e termo aditivo têm cores fixas. Para vários meses, use “Baixar todos (.zip)” e arraste os PNGs de uma vez no Canva — o “Copiar” é uma imagem por vez (limite do sistema).
            </p>
          </aside>

          {/* Preview paginado */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-24)', background: 'var(--color-bg)' }}>
            {carregando && <p style={{ color: 'var(--color-text-secondary)' }}>Carregando…</p>}
            {!carregando && paginas.length === 0 && (
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Sem páginas para exibir — as etapas do projeto precisam de datas.
              </p>
            )}
            {paginas.map((pagina, i) => (
              <div key={`${pagina.ano}-${pagina.mes}`} style={{ marginBottom: 'var(--sp-24)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-12)', marginBottom: 'var(--sp-8)' }}>
                  <strong style={{ flex: 1, textTransform: 'capitalize' }}>{rotuloMes(pagina.ano, pagina.mes)}</strong>
                  <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={() => copiar(i)}>
                    <Copy size={14} /> Copiar
                  </button>
                  <button type="button" className="btn-primary btn-sm" disabled={ocupado} onClick={() => baixar(i, pagina)}>
                    <Download size={14} /> Baixar
                  </button>
                </div>
                <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-2)', background: '#fff' }}>
                  <CalendarioKickoff
                    ref={(el) => { if (el) svgRefs.current.set(i, el); else svgRefs.current.delete(i); }}
                    pagina={pagina}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
