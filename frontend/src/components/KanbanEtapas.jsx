import { useState, useEffect } from 'react';
import {
  listarEtapasDoProjeto,
  listarTrabalhadores,
  atualizarStatusEtapa,
  adicionarConsultorEtapa,
  removerConsultorEtapa,
} from '../services/api';

const COLUNAS = [
  { status: 'nao_iniciada', titulo: 'Não Iniciada', cor: 'var(--color-text-secondary)', next: 'em_andamento', nextLabel: 'Iniciar →' },
  { status: 'em_andamento', titulo: 'Em Andamento', cor: 'var(--color-accent)',          prev: 'nao_iniciada', next: 'concluida', nextLabel: 'Concluir ✓' },
  { status: 'concluida',    titulo: 'Concluída',     cor: 'var(--color-success)',         prev: 'em_andamento' },
];

function EquipeEtapa({ etapa, colaboradores, aoAdicionar, aoRemover }) {
  const [novoId, setNovoId] = useState('');

  const disponiveis = colaboradores.filter(
    c => !etapa.consultores.some(e => e.id === c.id)
  );

  return (
    <div style={{ marginTop: 'var(--sp-12)' }}>
      <span className="field-label">Equipe da etapa</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-8)', margin: 'var(--sp-8) 0' }}>
        {etapa.consultores.length === 0 && (
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)' }}>
            Nenhum consultor alocado.
          </span>
        )}
        {etapa.consultores.map(c => (
          <span key={c.id} className="chip chip-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            {c.nome}
            <button
              type="button"
              className="btn-ghost-danger"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              title="Remover da etapa"
              onClick={() => aoRemover(etapa.id, c.id)}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--sp-8)' }}>
        <select
          className="input-field"
          value={novoId}
          onChange={e => setNovoId(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">Adicionar consultor...</option>
          {disponiveis.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!novoId}
          onClick={() => { aoAdicionar(etapa.id, parseInt(novoId)); setNovoId(''); }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function KanbanEtapas({ projetoId, toast }) {
  const [etapas, setEtapas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);

  const recarregarEtapas = () => {
    return listarEtapasDoProjeto(projetoId)
      .then(setEtapas)
      .catch(() => toast.error('Erro ao carregar as etapas do projeto.'));
  };

  useEffect(() => {
    if (!projetoId) return;
    recarregarEtapas();
    listarTrabalhadores()
      .then(setColaboradores)
      .catch(() => toast.error('Erro ao carregar a equipe.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  const moverEtapa = (etapaId, novoStatus) => {
    atualizarStatusEtapa(etapaId, novoStatus)
      .then(etapaAtualizada => {
        setEtapas(prev => prev.map(e => (e.id === etapaId ? etapaAtualizada : e)));
      })
      .catch(() => toast.error('Erro ao mover a etapa.'));
  };

  const adicionarConsultor = (etapaId, trabalhadorId) => {
    adicionarConsultorEtapa(etapaId, trabalhadorId)
      .then(() => {
        toast.success('Consultor adicionado à etapa.');
        recarregarEtapas();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao adicionar consultor.'));
  };

  const removerConsultor = (etapaId, trabalhadorId) => {
    removerConsultorEtapa(etapaId, trabalhadorId)
      .then(() => {
        toast.success('Consultor removido da etapa.');
        recarregarEtapas();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao remover consultor.'));
  };

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 700 }}>
          Etapas do Projeto
        </h2>
      </div>

      <div className="kanban-board">
        {COLUNAS.map(coluna => {
          const etapasColuna = etapas
            .filter(e => e.status === coluna.status)
            .sort((a, b) => a.ordem - b.ordem);

          return (
            <div key={coluna.status} className="kanban-column" style={{ borderTopColor: coluna.cor }}>
              <h3>{coluna.titulo} ({etapasColuna.length})</h3>

              {etapasColuna.map(etapa => (
                <div key={etapa.id} className="ui-card kanban-card">
                  {etapa.bloco_entrega && (
                    <span className="chip" style={{ backgroundColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)', fontSize: '10px', marginBottom: 'var(--sp-8)', display: 'inline-flex' }}>
                      📦 {etapa.bloco_entrega}
                    </span>
                  )}

                  <h4 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, textDecoration: etapa.status === 'concluida' ? 'line-through' : 'none', opacity: etapa.status === 'concluida' ? 0.6 : 1 }}>
                    {etapa.ordem}. {etapa.nome}
                  </h4>
                  {etapa.descricao && (
                    <p style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)', margin: 'var(--sp-8) 0', lineHeight: 1.5 }}>
                      {etapa.descricao}
                    </p>
                  )}

                  {etapa.dias_uteis_esperados != null && (
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-accent)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
                      ⏳ Prazo: {etapa.dias_uteis_esperados} dia(s) útil(eis)
                    </p>
                  )}

                  <EquipeEtapa
                    etapa={etapa}
                    colaboradores={colaboradores}
                    aoAdicionar={adicionarConsultor}
                    aoRemover={removerConsultor}
                  />

                  <div style={{ display: 'flex', gap: 'var(--sp-8)', marginTop: 'var(--sp-12)' }}>
                    {coluna.prev && (
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => moverEtapa(etapa.id, coluna.prev)}>
                        ← Voltar
                      </button>
                    )}
                    {coluna.next && (
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => moverEtapa(etapa.id, coluna.next)}>
                        {coluna.nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
