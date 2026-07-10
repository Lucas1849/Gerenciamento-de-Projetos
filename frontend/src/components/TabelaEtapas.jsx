import { useState } from 'react';
import { Pencil, Paperclip } from 'lucide-react';
import { formatarData } from './datasUtils';
import { numerosDosBlocos, STATUS_LABEL } from './etapasUtils';

// Célula de dependência (Fase 13, ADR-015): chips das etapas relacionadas com
// × para remover e um <select> para adicionar. Usada nas duas colunas
// ("Bloqueado por" e "Bloqueando"), só com semântica invertida nos handlers.
function CelulaDependencia({ atuais, candidatas, aoAdicionar, aoRemover }) {
  const [sel, setSel] = useState('');
  return (
    <td>
      <div className="tabela-chips">
        {atuais.length === 0 && <span style={{ color: 'var(--color-text-secondary)' }}>—</span>}
        {atuais.map(d => (
          <span key={d.id} className="chip chip-servico" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            {d.nome}
            <button
              type="button"
              className="btn-ghost-danger"
              title="Remover dependência"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              onClick={() => aoRemover(d.id)}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      {candidatas.length > 0 && (
        <select
          className="input-field tabela-status"
          value={sel}
          onChange={ev => {
            const id = Number(ev.target.value);
            if (id) { aoAdicionar(id); setSel(''); }
          }}
        >
          <option value="">+ adicionar…</option>
          {candidatas.map(c => (
            <option key={c.id} value={c.id}>{c.ordem}. {c.nome}</option>
          ))}
        </select>
      )}
    </td>
  );
}

// Visão "Tabela": todas as etapas em linhas planas, ordenadas por `ordem`.
// O <select> de status usa o mesmo handler do Kanban (aoMover); o ✏️ abre o
// modal de edição (Fase 12) — em linha de membro de bloco, edita o bloco.
// As colunas "Bloqueado por"/"Bloqueando" gerenciam dependências (Fase 13).
export default function TabelaEtapas({ etapas, aoMover, aoEditar, aoCriarDependencia, aoRemoverDependencia }) {
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
            <th>Links</th>
            <th>Bloqueado por</th>
            <th>Bloqueando</th>
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
              <td>
                {e.dias_uteis_esperados != null ? `${e.dias_uteis_esperados} dia(s) útil(eis)` : '—'}
                {e.dias_aditivos > 0 && (
                  <span
                    className="chip chip-warning"
                    style={{ marginLeft: 'var(--sp-8)' }}
                    title={`Entrega efetiva com termo aditivo; compromisso original: ${e.data_fim_original ? formatarData(e.data_fim_original) : '—'}`}
                  >
                    +{e.dias_aditivos} · termo aditivo
                  </span>
                )}
              </td>

              {/* Links de entregas/demandas (Fase 19): contagem compacta —
                  o ✏️ abre o modal, onde vive a seção de links. */}
              <td>
                {(e.links?.length ?? 0) === 0 ? '—' : (
                  <span className="chip chip-links-contagem" style={{ cursor: 'default' }}>
                    <Paperclip size={11} /> {e.links.length}
                  </span>
                )}
              </td>

              {/* Bloqueado por: quem bloqueia esta etapa (esta é a bloqueada). */}
              <CelulaDependencia
                atuais={e.bloqueada_por}
                candidatas={etapas
                  .filter(x => x.id !== e.id && !e.bloqueada_por.some(d => d.id === x.id))
                  .sort((a, b) => a.ordem - b.ordem)}
                aoAdicionar={outraId => aoCriarDependencia(e.id, outraId)}
                aoRemover={outraId => aoRemoverDependencia(e.id, outraId)}
              />

              {/* Bloqueando: quem esta etapa bloqueia (esta é a bloqueadora). */}
              <CelulaDependencia
                atuais={e.bloqueando}
                candidatas={etapas
                  .filter(x => x.id !== e.id && !e.bloqueando.some(d => d.id === x.id))
                  .sort((a, b) => a.ordem - b.ordem)}
                aoAdicionar={outraId => aoCriarDependencia(outraId, e.id)}
                aoRemover={outraId => aoRemoverDependencia(outraId, e.id)}
              />

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
