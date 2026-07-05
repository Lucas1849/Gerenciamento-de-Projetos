// ─── Modal de confirmação de bloco de entrega (Fase 6 / ADR-009) ─────────────
// Usado nos dois contextos do gesto de ligação: Kanban de etapas (chama a API)
// e editor de criação (só mescla itens locais). Prazo pré-preenchido com o
// maior entre os membros; data de início com a mais cedo.

import { useState } from 'react';
import { Link2 } from 'lucide-react';

export default function ModalBloco({ nomes, diasInicial, dataInicial, onConfirmar, onCancelar }) {
  const [dias, setDias] = useState(diasInicial ?? '');
  const [dataInicio, setDataInicio] = useState(dataInicial ?? '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Formar bloco de entrega"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-16)',
      }}
      onClick={onCancelar}
    >
      <div
        className="ui-card"
        style={{ maxWidth: '420px', width: '100%', padding: 'var(--sp-24)', boxShadow: 'var(--shadow-3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 'var(--sp-12)' }}>
          <Link2 size={18} /> Formar bloco de entrega
        </h3>
        <p style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)', marginBottom: 'var(--sp-8)' }}>
          As etapas abaixo passam a ter um único prazo e data de início. O status continua individual por etapa.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', marginBottom: 'var(--sp-16)' }}>
          {nomes.map((n, i) => <span key={i} className="chip chip-servico">{n}</span>)}
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-12)', flexWrap: 'wrap', marginBottom: 'var(--sp-24)' }}>
          <label style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            Dias úteis do bloco
            <input className="input-field" type="number" min="0" value={dias}
              onChange={e => setDias(e.target.value)} style={{ width: '120px' }} />
          </label>
          <label style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            Data de início
            <input className="input-field" type="date" value={dataInicio}
              onChange={e => setDataInicio(e.target.value)} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-8)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={dias === ''}
            onClick={() => onConfirmar({ dias: Number(dias), dataInicio: dataInicio || null })}
          >
            Formar bloco
          </button>
        </div>
      </div>
    </div>
  );
}
