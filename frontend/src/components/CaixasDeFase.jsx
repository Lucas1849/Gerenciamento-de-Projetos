// ─── Quatro caixas de fase — reclassificação pós-criação (Fase 31d, ADR-035) ─
// Reclassifica a fase do escopo de várias etapas/blocos de uma vez, num só
// round-trip (PUT /projetos/{id}/etapas/fases). Cada card tem um seletor de
// fase (em vez de arrasto entre colunas, como no editor de criação — aqui o
// ganho real é reclassificar vários cards antes de um Salvar só; arrasto
// seria custo de implementação sem ganho de produto equivalente nesta tela).
// Bloco move inteiro (P2): o card do bloco tem um seletor só, aplicado a
// todos os membros.

import { useState } from 'react';
import { FASES_ESCOPO, corFaseEscopo } from './fasesEscopo';
import { cardsParaCaixas } from './etapasUtils';

export default function CaixasDeFase({ cards, toast, aoSalvar }) {
  const iniciais = cardsParaCaixas(cards);
  const [estado, setEstado] = useState(
    Object.fromEntries(iniciais.map(c => [c.chave, c.faseEscopo]))
  );
  const [salvando, setSalvando] = useState(false);

  const sujo = iniciais.some(c => estado[c.chave] !== c.faseEscopo);

  const mudarFase = (chave, novaFase) =>
    setEstado(prev => ({ ...prev, [chave]: novaFase || null }));

  const salvar = async () => {
    const alterados = iniciais.filter(c => estado[c.chave] !== c.faseEscopo);
    if (alterados.length === 0) return;
    const fases = {};
    alterados.forEach(c => {
      c.idsMembros.forEach(id => { fases[id] = estado[c.chave]; });
    });
    setSalvando(true);
    try {
      await aoSalvar(fases);
      toast.success(`Fase reatribuída em ${alterados.length} etapa(s)/bloco(s).`);
    } catch (erro) {
      toast.error(erro.message || 'Erro ao reatribuir fases.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--sp-16)', marginBottom: 'var(--sp-16)',
      }}>
        {FASES_ESCOPO.map(fase => {
          const docaixas = iniciais.filter(c => estado[c.chave] === fase.valor);
          return (
            <div key={fase.valor} className="ui-card" style={{
              borderTop: `3px solid ${fase.cor}`, padding: 'var(--sp-12)', minHeight: '160px',
            }}>
              <strong style={{ display: 'block', marginBottom: 'var(--sp-8)', fontSize: 'var(--text-caption)' }}>
                {fase.titulo} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>· {docaixas.length}</span>
              </strong>
              {docaixas.length === 0 && (
                <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-disabled)' }}>
                  Nenhuma etapa nesta fase.
                </p>
              )}
              {docaixas.map(c => (
                <div key={c.chave} className="chip chip-servico" style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-8)',
                  marginBottom: 'var(--sp-8)', padding: 'var(--sp-8)', width: '100%',
                }}>
                  <span style={{ flex: 1, fontSize: 'var(--text-caption)' }}>{c.titulo}</span>
                  <select
                    className="input-field"
                    aria-label={`Mover "${c.titulo}" para outra fase`}
                    value={estado[c.chave] ?? ''}
                    onChange={e => mudarFase(c.chave, e.target.value)}
                    style={{ width: '130px', padding: '4px 6px', fontSize: 'var(--text-caption)' }}
                  >
                    <option value="">Não classificada</option>
                    {FASES_ESCOPO.map(f => (
                      <option key={f.valor} value={f.valor}>{f.titulo}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {(() => {
        const naoClassificadas = iniciais.filter(c => !estado[c.chave]);
        if (naoClassificadas.length === 0) return null;
        return (
          <div className="ui-card" style={{ borderTop: `3px solid ${corFaseEscopo(null)}`, padding: 'var(--sp-12)', marginBottom: 'var(--sp-16)' }}>
            <strong style={{ display: 'block', marginBottom: 'var(--sp-8)', fontSize: 'var(--text-caption)' }}>
              Não classificada <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>· {naoClassificadas.length}</span>
            </strong>
            {naoClassificadas.map(c => (
              <div key={c.chave} className="chip chip-servico" style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-8)',
                marginBottom: 'var(--sp-8)', padding: 'var(--sp-8)', width: '100%',
              }}>
                <span style={{ flex: 1, fontSize: 'var(--text-caption)' }}>{c.titulo}</span>
                <select
                  className="input-field"
                  aria-label={`Mover "${c.titulo}" para uma fase`}
                  value={estado[c.chave] ?? ''}
                  onChange={e => mudarFase(c.chave, e.target.value)}
                  style={{ width: '130px', padding: '4px 6px', fontSize: 'var(--text-caption)' }}
                >
                  <option value="">Não classificada</option>
                  {FASES_ESCOPO.map(f => (
                    <option key={f.valor} value={f.valor}>{f.titulo}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );
      })()}

      <button type="button" className="btn btn-primary" disabled={!sujo || salvando} onClick={salvar}>
        {salvando ? 'Salvando...' : 'Salvar reclassificação'}
      </button>
    </div>
  );
}
