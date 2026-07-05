import { Plus } from 'lucide-react';
import { atualizarProjeto } from '../services/api';
import { FASES, FASE_LABEL } from './fases';
import AvatarIniciais from './AvatarIniciais';

export default function KanbanFases({
  projetos, servicos = [], equipe = [],
  aoAbrirProjeto, aoAtualizarProjeto, aoNovoProjeto, toast,
}) {
  const servicoPorId     = new Map(servicos.map(s => [s.id, s]));
  const trabalhadorPorId = new Map(equipe.map(t => [t.id, t]));

  const moverProjeto = (projetoId, novaFase) => {
    atualizarProjeto(projetoId, { fase: novaFase })
      .then(projetoAtualizado => {
        aoAtualizarProjeto(projetoAtualizado);
        toast.success(`Projeto movido para "${FASE_LABEL[novaFase]}".`);
      })
      .catch(() => toast.error('Erro ao mover o projeto de fase.'));
  };

  return (
    <div className="kanban-board">
      {FASES.map((fase, i) => {
        const projetosFase = projetos.filter(p => p.fase === fase.valor);
        const anterior = FASES[i - 1]?.valor;
        const proxima  = FASES[i + 1]?.valor;

        return (
          <div key={fase.valor} className="kanban-column">
            <div className="kanban-col-header">
              <span className="kanban-dot" style={{ backgroundColor: fase.cor }} />
              <h3>{fase.titulo}</h3>
              <span className="kanban-count">{projetosFase.length}</span>
            </div>

            {projetosFase.map(p => {
              const servico = servicoPorId.get(p.servico_id);
              const gerente = trabalhadorPorId.get(p.gerente_id);
              const consultores = p.equipe ?? [];

              return (
                <div
                  key={p.id}
                  className="ui-card kanban-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => aoAbrirProjeto(p.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', flexWrap: 'wrap', marginBottom: 'var(--sp-12)' }}>
                    <h4 style={{ fontSize: 'var(--text-h4)', fontWeight: 700, flex: '0 1 auto' }}>{p.nome}</h4>
                    {servico && <span className="chip chip-servico">{servico.nome}</span>}
                  </div>

                  {gerente && (
                    <div className="card-gerente-bloco" style={{ marginBottom: 'var(--sp-12)' }}>
                      <AvatarIniciais nome={gerente.nome} tamanho={36} />
                      <div>
                        <div className="card-gerente-rotulo">Gerente</div>
                        <div className="card-gerente-nome">{gerente.nome}</div>
                      </div>
                    </div>
                  )}

                  <div className="card-consultores-row" style={{ marginBottom: 'var(--sp-12)' }}>
                    <span className="card-consultores-rotulo">Consultores</span>
                    {consultores.length === 0 ? (
                      <span className="card-consultores-rotulo">—</span>
                    ) : (
                      <span className="avatar-fileira">
                        {consultores.slice(0, 5).map(c => (
                          <AvatarIniciais key={c.id} nome={c.nome} tamanho={26} />
                        ))}
                        {consultores.length > 5 && (
                          <span className="card-consultores-rotulo" style={{ marginLeft: 'var(--sp-4)' }}>
                            +{consultores.length - 5}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <span className={`chip ${p.tap_assinado ? 'chip-success' : 'chip-warning'}`}>
                    TAP: {p.tap_assinado ? 'Assinado' : 'Pendente'}
                  </span>

                  <div style={{ display: 'flex', gap: 'var(--sp-8)', marginTop: 'var(--sp-12)' }}>
                    {anterior && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        title={`Mover para ${FASE_LABEL[anterior]}`}
                        onClick={e => { e.stopPropagation(); moverProjeto(p.id, anterior); }}
                      >
                        ←
                      </button>
                    )}
                    {proxima && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                        title={`Mover para ${FASE_LABEL[proxima]}`}
                        onClick={e => { e.stopPropagation(); moverProjeto(p.id, proxima); }}
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {projetosFase.length === 0 && aoNovoProjeto && (
              <button type="button" className="kanban-ghost" onClick={aoNovoProjeto}>
                <Plus size={16} /> Novo projeto
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
