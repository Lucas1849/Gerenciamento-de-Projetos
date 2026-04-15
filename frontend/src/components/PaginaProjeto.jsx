import { useState } from 'react';
import Kanban from './Kanban';

export default function PaginaProjeto({ projeto, aoVoltar }) {
  const [abaAtiva, setAbaAtiva] = useState('geral');

  // Se o projeto ainda não carregou, não mostra nada
  if (!projeto) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. Imagem de Fundo*/}
      <div className="project-banner"></div>

      {/* 2. Barra de Navegação Horizontal */}
      <div className="tab-container">
        <div 
          className={`tab-item ${abaAtiva === 'geral' ? 'active' : ''}`} 
          onClick={() => setAbaAtiva('geral')}
        >
          Visão Geral
        </div>
        <div 
          className={`tab-item ${abaAtiva === 'kanban' ? 'active' : ''}`} 
          onClick={() => setAbaAtiva('kanban')}
        >
          Atividades
        </div>
        <div 
          className={`tab-item ${abaAtiva === 'arquivos' ? 'active' : ''}`} 
          onClick={() => setAbaAtiva('arquivos')}
        >
          Arquivos (Em breve)
        </div>
        <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
            <button onClick={aoVoltar} style={{ cursor: 'pointer', padding: '5px 10px' }}>✕ Fechar</button>
        </div>
      </div>

      {/* 3. Conteúdo Dinâmico baseado na Aba */}
      <div style={{ padding: '20px' }}>
        
        {abaAtiva === 'geral' && (
          <div className="info-grid">
            <div style={{ gridColumn: 'span 2' }}>
                <h1 style={{ color: '#004080' }}>{projeto.nome}</h1>
                <p style={{ fontSize: '18px', color: '#555', marginTop: '10px' }}>{projeto.objetivo}</p>
            </div>

            <div className="info-box">
              <label>Cliente / Contratante</label>
              <strong>{projeto.nome_contratante}</strong>
              <p style={{ fontSize: '13px', color: '#777' }}>Agregados: {projeto.agregados_contratante || 'Nenhum'}</p>
            </div>

            <div className="info-box">
              <label>Tipo de Serviço</label>
              <strong>{projeto.tipo_servico}</strong>
            </div>

            <div className="info-box">
              <label>Status de Iniciação</label>
              <p>🏁 Kick-off: <strong>{projeto.kickoff_realizado}</strong></p>
              <p>✍️ TAP Assinado: <strong>{projeto.tap_assinado}</strong></p>
            </div>

            <div className="info-box" style={{ borderLeftColor: '#17a2b8' }}>
              <label>Status Atual</label>
              <strong style={{ color: '#17a2b8' }}>{projeto.status}</strong>
            </div>
          </div>
        )}

        {abaAtiva === 'kanban' && (
          <Kanban projetoId={projeto.id} />
        )}

        {abaAtiva === 'arquivos' && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
            <h3>Módulo de Arquivos</h3>
            <p>Em breve você poderá integrar aqui documentos do SharePoint ou Drive.</p>
          </div>
        )}

      </div>
    </div>
  );
}