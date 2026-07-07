import { Pencil } from 'lucide-react';
import { formatarData } from './datasUtils';
import { numerosDosBlocos, STATUS_LABEL } from './etapasUtils';

// Visão "Tabela": todas as etapas em linhas planas, ordenadas por `ordem`.
// O <select> de status usa o mesmo handler do Kanban (aoMover); o ✏️ abre o
// modal de edição (Fase 12) — em linha de membro de bloco, edita o bloco.
export default function TabelaEtapas({ etapas, aoMover, aoEditar }) {
  const numeros = numerosDosBlocos(etapas);
  const linhas = [...etapas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="tabela-wrapper">
      <table className="tabela-etapas">
        <thead>
          <tr>
            <th>Etapa</th>
            <th>Status</th>
            <th>Início</th>
            <th>Término</th>
            <th>Prazo</th>
            <th>Equipe</th>
            <th>Bloco</th>
            <th aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(e => (
            <tr key={e.id}>
              <td className="tabela-nome">{e.ordem}. {e.nome}</td>
              <td>
                <select
                  className="input-field tabela-status"
                  value={e.status}
                  onChange={ev => aoMover(e.id, ev.target.value)}
                >
                  {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                  ))}
                </select>
              </td>
              <td>{e.data_inicio ? formatarData(e.data_inicio) : '—'}</td>
              <td>{e.data_fim ? formatarData(e.data_fim) : '—'}</td>
              <td>{e.dias_uteis_esperados != null ? `${e.dias_uteis_esperados} dia(s) útil(eis)` : '—'}</td>
              <td>
                {e.consultores.length === 0 ? '—' : (
                  <div className="tabela-chips">
                    {e.consultores.map(c => (
                      <span key={c.id} className="chip chip-brand">{c.nome}</span>
                    ))}
                  </div>
                )}
              </td>
              <td>
                {e.bloco_entrega
                  ? <span className="chip tabela-chip-bloco">📦 Bloco {numeros.get(e.bloco_entrega)}</span>
                  : '—'}
              </td>
              <td>
                <button
                  type="button"
                  title={e.bloco_entrega ? 'Editar bloco' : 'Editar etapa'}
                  aria-label={e.bloco_entrega ? 'Editar bloco' : 'Editar etapa'}
                  style={{ background: 'none', border: 'none', padding: 'var(--sp-4)', cursor: 'pointer', color: 'var(--color-text-disabled)' }}
                  onClick={() =>
                    aoEditar(
                      e.bloco_entrega
                        ? etapas.filter(x => x.bloco_entrega === e.bloco_entrega)
                        : [e]
                    )
                  }
                >
                  <Pencil size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
