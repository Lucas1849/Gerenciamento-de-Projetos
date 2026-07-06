import { useState, useEffect, useCallback } from 'react';
import EtapasProjeto from './EtapasProjeto';
import { FASE_LABEL } from './fases';
import { obterProjeto, atualizarProjeto } from '../services/api';

const FASE_CHIP = {
  kickoff:     'chip-warning',
  andamento:   'chip-brand',
  finalizacao: 'chip-brand',
  ajustes:     'chip-warning',
  concluido:   'chip-success',
};

export default function PaginaProjeto({ projetoId, aoVoltar, toast }) {
  const [abaAtiva, setAbaAtiva] = useState('etapas');
  const [projeto,  setProjeto]  = useState(null);
  const [erro,     setErro]     = useState(null);

  const carregar = useCallback(() => {
    obterProjeto(projetoId)
      .then(p => { setProjeto(p); setErro(null); })
      .catch(e => setErro(e.message || 'Erro ao carregar o projeto.'));
  }, [projetoId]);

  useEffect(() => { carregar(); }, [carregar]);

  // O TAP é assinado pelo cliente via Clicksign fora do sistema; aqui o status
  // é atualizado manualmente (gatilho automático é item de roadmap).
  const alternarTap = () => {
    const novoValor = !projeto.tap_assinado;
    if (!novoValor && !window.confirm('Reverter o TAP para pendente?')) return;
    atualizarProjeto(projeto.id, { tap_assinado: novoValor })
      .then(resp => {
        // Merge parcial: o PUT devolve equipe mas não etapas; o detalhe local tem mais campos.
        setProjeto(prev => ({ ...prev, tap_assinado: resp.tap_assinado }));
        toast.success(novoValor ? 'TAP marcado como assinado.' : 'TAP revertido para pendente.');
      })
      .catch(() => toast.error('Erro ao atualizar o status do TAP.'));
  };

  if (erro) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <h3>Erro ao carregar o projeto</h3>
        <p style={{ fontSize: 'var(--text-body2)', marginBottom: 'var(--sp-16)' }}>{erro}</p>
        <div style={{ display: 'flex', gap: 'var(--sp-8)', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={aoVoltar}>← Voltar</button>
          <button className="btn btn-primary" onClick={carregar}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (!projeto) return null;

  const chipClasse = FASE_CHIP[projeto.fase] ?? 'chip-brand';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Voltar */}
      <button className="btn btn-secondary" onClick={aoVoltar} style={{ marginBottom: 'var(--sp-16)' }}>
        ← Voltar para a Gestão
      </button>

      {/* Header do projeto */}
      <div className="ui-card" style={{ marginBottom: 'var(--sp-24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', color: 'var(--color-text-primary)', marginBottom: 'var(--sp-8)' }}>
              {projeto.nome}
            </h1>
            <p style={{ fontSize: 'var(--text-body1)', color: 'var(--color-text-secondary)' }}>
              {projeto.objetivo}
            </p>
          </div>
          <span className={`chip ${chipClasse}`}>{FASE_LABEL[projeto.fase] ?? projeto.fase}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className={`tab ${abaAtiva === 'etapas' ? 'active' : ''}`} onClick={() => setAbaAtiva('etapas')}>
          Etapas
        </div>
        <div className={`tab ${abaAtiva === 'geral' ? 'active' : ''}`} onClick={() => setAbaAtiva('geral')}>
          Visão Geral
        </div>
      </div>

      {/* Conteúdo */}
      {abaAtiva === 'geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--sp-24)' }}>

          <div className="ui-card">
            <span className="field-label">Cliente / Contratante</span>
            <h3 style={{ fontSize: 'var(--text-h3)', marginTop: 'var(--sp-4)' }}>
              {projeto.nome_contratante || '—'}
            </h3>
            <p style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)', marginTop: 'var(--sp-8)' }}>
              Agregados: {projeto.agregados_contratante || 'Nenhum'}
            </p>
          </div>

          <div className="ui-card">
            <span className="field-label">Iniciação</span>
            <div style={{ display: 'flex', gap: 'var(--sp-8)', marginTop: 'var(--sp-12)', flexWrap: 'wrap' }}>
              <span className={`chip ${projeto.tap_assinado ? 'chip-success' : 'chip-warning'}`}>
                TAP: {projeto.tap_assinado ? 'Assinado' : 'Pendente'}
              </span>
              <span className={`chip ${chipClasse}`}>
                Fase: {FASE_LABEL[projeto.fase] ?? projeto.fase}
              </span>
            </div>
            <div style={{ marginTop: 'var(--sp-16)' }}>
              {projeto.tap_assinado ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={alternarTap}>
                  Reverter para pendente
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={alternarTap}>
                  ✓ Marcar TAP como assinado
                </button>
              )}
            </div>
          </div>

          <div className="ui-card">
            <span className="field-label">Equipe do Projeto</span>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--sp-4)' }}>
              Derivada dos consultores ativos das etapas.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-8)', marginTop: 'var(--sp-12)' }}>
              {projeto.equipe.length === 0 ? (
                <span style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)' }}>
                  Nenhum consultor ativo.
                </span>
              ) : (
                projeto.equipe.map(t => (
                  <span key={t.id} className="chip chip-brand">{t.nome}</span>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {abaAtiva === 'etapas' && (
        <EtapasProjeto projetoId={projeto.id} toast={toast} />
      )}

    </div>
  );
}
