// ─── Modal de edição pós-criação de etapa/bloco (Fase 12 / ADR-014) ─────────
// Acionado pelo ✏️ no Kanban e na Tabela (handlers vêm do container
// EtapasProjeto). Etapa avulsa: nome, descrição, dias úteis e data de início.
// Bloco: dias/data compartilhados (o PATCH em um membro propaga a todos,
// ADR-009), nome individual por membro e reordenação dos membros. A equipe
// continua sendo editada nos cards do Kanban (rotas próprias).

import { useState } from 'react';
import { Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { atualizarEtapa, reordenarEtapas } from '../services/api';
import { janelaDatas, dataPlausivel, formatarData } from './datasUtils';
import { DataFimPreview } from './EtapasEditor';

export default function ModalEditarEtapa({ projetoId, membros, etapas, toast, aoFechar, aoSalvo }) {
  const ehBloco = membros.length > 1;
  const [dias, setDias] = useState(membros[0].dias_uteis_esperados ?? '');
  const [dataInicio, setDataInicio] = useState(membros[0].data_inicio ?? '');
  const [nomes, setNomes] = useState(
    Object.fromEntries(membros.map(m => [m.id, m.nome]))
  );
  const [descricao, setDescricao] = useState(membros[0].descricao ?? '');
  const [ordemIds, setOrdemIds] = useState(membros.map(m => m.id));
  const [salvando, setSalvando] = useState(false);

  // Fase 10: pré-validação de UX; a regra vive no backend (422).
  const dataImplausivel = dataInicio !== '' && !dataPlausivel(dataInicio);

  const moverMembro = (indice, delta) =>
    setOrdemIds(prev => {
      const nova = [...prev];
      [nova[indice], nova[indice + delta]] = [nova[indice + delta], nova[indice]];
      return nova;
    });

  const salvar = async () => {
    setSalvando(true);
    try {
      // Campos individuais: nome (e descrição na avulsa) por membro alterado.
      for (const m of membros) {
        const dados = {};
        if (nomes[m.id] !== m.nome) dados.nome = nomes[m.id];
        if (!ehBloco && descricao !== (m.descricao ?? '')) dados.descricao = descricao || null;
        if (Object.keys(dados).length > 0) await atualizarEtapa(m.id, dados);
      }

      // Campos compartilhados: um PATCH basta — o backend propaga ao bloco.
      const compartilhados = {};
      if (String(dias) !== String(membros[0].dias_uteis_esperados ?? '')) {
        compartilhados.dias_uteis_esperados = dias === '' ? null : Number(dias);
      }
      if (dataInicio !== (membros[0].data_inicio ?? '')) {
        compartilhados.data_inicio = dataInicio || null;
      }
      if (Object.keys(compartilhados).length > 0) {
        await atualizarEtapa(membros[0].id, compartilhados);
      }

      // Reordenação dos membros do bloco: reencaixa a nova ordem dos membros
      // nas posições que eles já ocupavam na lista completa do projeto.
      if (ehBloco && ordemIds.some((id, i) => id !== membros[i].id)) {
        const idsProjeto = [...etapas].sort((a, b) => a.ordem - b.ordem).map(e => e.id);
        const posicoes = idsProjeto
          .map((id, i) => (ordemIds.includes(id) ? i : -1))
          .filter(i => i >= 0);
        posicoes.forEach((pos, k) => { idsProjeto[pos] = ordemIds[k]; });
        await reordenarEtapas(projetoId, idsProjeto);
      }

      toast.success(ehBloco ? 'Bloco atualizado.' : 'Etapa atualizada.');
      aoSalvo();
    } catch (erro) {
      toast.error(erro.message || 'Erro ao salvar a edição.');
    } finally {
      setSalvando(false);
    }
  };

  const labelEstilo = {
    fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)',
    display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ehBloco ? 'Editar bloco de entrega' : 'Editar etapa'}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-16)',
      }}
      onClick={aoFechar}
    >
      <div
        className="ui-card"
        style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--sp-24)', boxShadow: 'var(--shadow-3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 'var(--sp-12)' }}>
          <Pencil size={18} /> {ehBloco ? 'Editar bloco de entrega' : 'Editar etapa'}
        </h3>

        {ehBloco ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)', marginBottom: 'var(--sp-16)' }}>
            <span className="field-label">Etapas do bloco (nome individual; use as setas para reordenar)</span>
            {ordemIds.map((id, i) => (
              <div key={id} style={{ display: 'flex', gap: 'var(--sp-8)', alignItems: 'center' }}>
                <input
                  className="input-field"
                  type="text"
                  value={nomes[id]}
                  onChange={e => setNomes(prev => ({ ...prev, [id]: e.target.value }))}
                  style={{ flex: 1, padding: '6px 10px' }}
                />
                <button type="button" className="btn btn-secondary btn-sm" disabled={i === 0}
                  aria-label="Mover para cima" onClick={() => moverMembro(i, -1)}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={i === ordemIds.length - 1}
                  aria-label="Mover para baixo" onClick={() => moverMembro(i, 1)}>
                  <ArrowDown size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-12)', marginBottom: 'var(--sp-16)' }}>
            <label style={labelEstilo}>
              Nome
              <input
                className="input-field"
                type="text"
                value={nomes[membros[0].id]}
                onChange={e => setNomes({ [membros[0].id]: e.target.value })}
              />
            </label>
            <label style={labelEstilo}>
              Descrição
              <textarea
                className="input-field"
                style={{ minHeight: '60px', resize: 'vertical' }}
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
              />
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-12)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--sp-16)' }}>
          <label style={labelEstilo}>
            {ehBloco ? 'Dias úteis do bloco' : 'Dias úteis'}
            <input className="input-field" type="number" min="0" value={dias}
              onChange={e => setDias(e.target.value)} style={{ width: '120px' }} />
          </label>
          <label style={labelEstilo}>
            Data de início
            <input className="input-field" type="date" value={dataInicio}
              min={janelaDatas().min} max={janelaDatas().max}
              onChange={e => setDataInicio(e.target.value)} />
          </label>
          <DataFimPreview dias={dias} dataInicio={dataInicio} />
        </div>

        {ehBloco && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--sp-16)' }}>
            Dias úteis e data de início são compartilhados: a alteração vale para todas as etapas do bloco.
          </p>
        )}

        {dataImplausivel && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)', marginBottom: 'var(--sp-12)' }}>
            Data implausível: use uma data entre {formatarData(janelaDatas().min)} e {formatarData(janelaDatas().max)}.
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-8)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={salvando || dataImplausivel || Object.values(nomes).some(n => !n.trim())}
            onClick={salvar}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
