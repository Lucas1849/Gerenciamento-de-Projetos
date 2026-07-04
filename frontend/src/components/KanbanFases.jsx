import { atualizarProjeto } from '../services/api';
import { FASES, FASE_LABEL } from './fases';

export default function KanbanFases({ projetos, aoAbrirProjeto, aoAtualizarProjeto, toast }) {
  const moverProjeto = (projetoId, novaFase) => {
    atualizarProjeto(projetoId, { fase: novaFase })
      .then(projetoAtualizado => {
        aoAtualizarProjeto(projetoAtualizado);
        toast.success(`Projeto movido para "${FASE_LABEL[novaFase]}".`);
      })
      .catch(() => toast.error('Erro ao mover o projeto de fase.'));
  };

  return (
    <div className="kanban-board" style={{ gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))', overflowX: 'auto' }}>
      {FASES.map((fase, i) => {
        const projetosFase = projetos.filter(p => p.fase === fase.valor);
        const anterior = FASES[i - 1]?.valor;
        const proxima  = FASES[i + 1]?.valor;

        return (
          <div key={fase.valor} className="kanban-column" style={{ borderTopColor: fase.cor }}>
            <h3>{fase.titulo} ({projetosFase.length})</h3>

            {projetosFase.map(p => (
              <div
                key={p.id}
                className="ui-card kanban-card"
                style={{ cursor: 'pointer' }}
                onClick={() => aoAbrirProjeto(p.id)}
              >
                <h4 style={{ fontSize: 'var(--text-h4)', fontWeight: 600 }}>{p.nome}</h4>
                {p.nome_contratante && (
                  <p style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)', margin: 'var(--sp-8) 0' }}>
                    🏢 {p.nome_contratante}
                  </p>
                )}
                <span className={`chip ${p.tap_assinado ? 'chip-success' : 'chip-warning'}`} style={{ marginBottom: 'var(--sp-8)', display: 'inline-flex' }}>
                  TAP: {p.tap_assinado ? 'Assinado' : 'Pendente'}
                </span>

                <div style={{ display: 'flex', gap: 'var(--sp-8)', marginTop: 'var(--sp-8)' }}>
                  {anterior && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={e => { e.stopPropagation(); moverProjeto(p.id, anterior); }}
                    >
                      ←
                    </button>
                  )}
                  {proxima && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={e => { e.stopPropagation(); moverProjeto(p.id, proxima); }}
                    >
                      →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
