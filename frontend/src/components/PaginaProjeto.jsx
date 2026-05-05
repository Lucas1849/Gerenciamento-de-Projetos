import { useState } from 'react';
import Kanban from './Kanban';

const STATUS_MAP = {
  'Em andamento': 'chip-brand',
  'Concluído':    'chip-success',
  'Pausado':      'chip-warning',
  'Cancelado':    'chip-error',
};

export default function PaginaProjeto({ projeto, aoVoltar, toast }) {
  const [abaAtiva, setAbaAtiva] = useState('geral');

  if (!projeto) return null;

  const chipClasse = STATUS_MAP[projeto.status] ?? 'chip-brand';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* Voltar */}
      <button className="btn btn-secondary" onClick={aoVoltar} style={{ marginBottom: 'var(--sp-16)' }}>
        ← Voltar para Galeria
      </button>

      {/* Header do projeto */}
      <div className="ui-card" style={{ marginBottom: 'var(--sp-24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', color: 'var(--color-brand)', marginBottom: 'var(--sp-8)' }}>
              {projeto.nome}
            </h1>
            <p style={{ fontSize: 'var(--text-body1)', color: 'var(--color-text-secondary)' }}>
              {projeto.objetivo}
            </p>
          </div>
          <span className={`chip ${chipClasse}`}>{projeto.status}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className={`tab ${abaAtiva === 'geral' ? 'active' : ''}`} onClick={() => setAbaAtiva('geral')}>
          Visão Geral
        </div>
        <div className={`tab ${abaAtiva === 'kanban' ? 'active' : ''}`} onClick={() => setAbaAtiva('kanban')}>
          Quadro Kanban
        </div>
      </div>

      {/* Conteúdo */}
      {abaAtiva === 'geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--sp-24)' }}>

          <div className="ui-card">
            <span className="field-label">Cliente / Contratante</span>
            <h3 style={{ fontSize: 'var(--text-h3)', marginTop: 'var(--sp-4)' }}>
              {projeto.nome_contratante}
            </h3>
            <p style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)', marginTop: 'var(--sp-8)' }}>
              Agregados: {projeto.agregados_contratante || 'Nenhum'}
            </p>
          </div>

          <div className="ui-card">
            <span className="field-label">Tipo de Serviço</span>
            <h3 style={{ fontSize: 'var(--text-h3)', marginTop: 'var(--sp-4)' }}>
              {projeto.tipo_servico}
            </h3>
          </div>

          <div className="ui-card">
            <span className="field-label">Iniciação</span>
            <div style={{ display: 'flex', gap: 'var(--sp-8)', marginTop: 'var(--sp-12)' }}>
              <span className={`chip ${projeto.kickoff_realizado === 'Sim' ? 'chip-success' : 'chip-warning'}`}>
                Kick-off: {projeto.kickoff_realizado}
              </span>
              <span className={`chip ${projeto.tap_assinado === 'Sim' ? 'chip-success' : 'chip-warning'}`}>
                TAP: {projeto.tap_assinado}
              </span>
            </div>
          </div>

        </div>
      )}

      {abaAtiva === 'kanban' && (
        <Kanban projetoId={projeto.id} toast={toast} />
      )}

    </div>
  );
}