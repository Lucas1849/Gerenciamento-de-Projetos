import { useState } from 'react';
import Kanban from './Kanban';

export default function PaginaProjeto({ projeto, aoVoltar }) {
  const [abaAtiva, setAbaAtiva] = useState('geral');

  if (!projeto) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Botão de Voltar Padronizado */}
      <button className="btn btn-secondary" onClick={aoVoltar} style={{ marginBottom: '16px' }}>
        ← Voltar para Galeria
      </button>

      <div className="ui-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 'var(--h1)', color: 'var(--primary)', marginBottom: '8px' }}>
              {projeto.nome}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>{projeto.objetivo}</p>
          </div>
          <span className="chip chip-status">{projeto.status}</span>
        </div>
      </div>

      {/* TABS DO STYLEGUIDE */}
      <div className="tabs-container">
        <div className={`tab ${abaAtiva === 'geral' ? 'active' : ''}`} onClick={() => setAbaAtiva('geral')}>
          Visão Geral
        </div>
        <div className={`tab ${abaAtiva === 'kanban' ? 'active' : ''}`} onClick={() => setAbaAtiva('kanban')}>
          Quadro Kanban
        </div>
      </div>

      {/* CONTEÚDO */}
      <div>
        {abaAtiva === 'geral' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div className="ui-card">
              <span style={{ fontSize: 'var(--caption)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cliente / Contratante</span>
              <h3 style={{ marginTop: '4px' }}>{projeto.nome_contratante}</h3>
              <p style={{ fontSize: 'var(--body2)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Agregados: {projeto.agregados_contratante || 'Nenhum'}
              </p>
            </div>

            <div className="ui-card">
              <span style={{ fontSize: 'var(--caption)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tipo de Serviço</span>
              <h3 style={{ marginTop: '4px' }}>{projeto.tipo_servico}</h3>
            </div>

            <div className="ui-card">
              <span style={{ fontSize: 'var(--caption)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Iniciação</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <span className={`chip ${projeto.kickoff_realizado === 'Sim' ? 'chip-success' : 'chip-status'}`}>
                  Kick-off: {projeto.kickoff_realizado}
                </span>
                <span className={`chip ${projeto.tap_assinado === 'Sim' ? 'chip-success' : 'chip-status'}`}>
                  TAP: {projeto.tap_assinado}
                </span>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'kanban' && (
          <Kanban projetoId={projeto.id} />
        )}
      </div>
    </div>
  );
}