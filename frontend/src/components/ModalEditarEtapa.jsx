// ─── Modal de edição pós-criação de etapa/bloco (Fase 12 / ADR-014) ─────────
// Acionado pelo ✏️ no Kanban e na Tabela (handlers vêm do container
// EtapasProjeto). Etapa avulsa: nome, descrição, dias úteis e data de início.
// Bloco: dias/data compartilhados (o PATCH em um membro propaga a todos,
// ADR-009), nome individual por membro e reordenação dos membros. A equipe
// continua sendo editada nos cards do Kanban (rotas próprias).

import { useState, useRef } from 'react';
import { Pencil, ArrowUp, ArrowDown, Paperclip, Plus, Trash2 } from 'lucide-react';
import { atualizarEtapa, reordenarEtapas, calcularDataFim, contarDiasUteis, criarEtapaLink, excluirEtapaLink } from '../services/api';
import { janelaDatas, dataPlausivel, formatarData } from './datasUtils';

export default function ModalEditarEtapa({ projetoId, membros, etapas, toast, aoFechar, aoSalvo, aoAtualizar }) {
  const ehBloco = membros.length > 1;
  const [dias, setDias] = useState(membros[0].dias_uteis_esperados ?? '');
  const [dataInicio, setDataInicio] = useState(membros[0].data_inicio ?? '');
  // Fase 16b (ADR-018): data final editável — açúcar de UI sobre o reverse-
  // calendar. A data final continua derivada (ADR-008): no salvar viaja só
  // dias_uteis_esperados. Guarda de sequência contra respostas fora de ordem
  // (mesmo padrão da cascata da Fase 12).
  const [dataFim, setDataFim] = useState(membros[0].data_fim ?? '');
  const [avisoFim, setAvisoFim] = useState('');
  const seqRef = useRef(0);

  const recalcularFim = async (d, di) => {
    setAvisoFim('');
    if (d === '' || d == null || !di) { setDataFim(''); return; }
    const seq = ++seqRef.current;
    try {
      const r = await calcularDataFim(di, Number(d));
      if (seq === seqRef.current) setDataFim(r.data_fim);
    } catch { /* preview; erro real aparece no salvar */ }
  };

  const aoMudarDias = (v) => { setDias(v); recalcularFim(v, dataInicio); };
  const aoMudarInicio = (v) => { setDataInicio(v); recalcularFim(dias, v); };

  // Editar a data final converte em dias úteis (contagem inclusiva) e, se ela
  // cair em fim de semana/feriado nacional, ajusta para o dia útil que cobre.
  const aoMudarFim = async (v) => {
    setDataFim(v);
    setAvisoFim('');
    if (!v || !dataInicio || v < dataInicio) return;
    const seq = ++seqRef.current;
    try {
      const { dias_uteis } = await contarDiasUteis(dataInicio, v);
      if (seq !== seqRef.current) return;
      setDias(String(dias_uteis));
      const r = await calcularDataFim(dataInicio, dias_uteis);
      if (seq !== seqRef.current) return;
      if (r.data_fim !== v) {
        setDataFim(r.data_fim);
        setAvisoFim(`A data caiu em fim de semana/feriado — ajustada para ${formatarData(r.data_fim)}.`);
      }
    } catch { /* erro real aparece no salvar */ }
  };
  const [nomes, setNomes] = useState(
    Object.fromEntries(membros.map(m => [m.id, m.nome]))
  );
  const [descricao, setDescricao] = useState(membros[0].descricao ?? '');
  const [ordemIds, setOrdemIds] = useState(membros.map(m => m.id));
  const [salvando, setSalvando] = useState(false);

  // Fase 19 (ADR-021): links de entregas/demandas — SEMPRE da etapa
  // individual, mesmo em bloco (cada membro com os seus). Ações imediatas
  // (fora do Salvar): o container recarrega e `membros` chega atualizado.
  const [linkForm, setLinkForm] = useState(null); // { membroId, tipo, nome, url }
  const [linkSalvando, setLinkSalvando] = useState(false);
  const linkUrlInvalida = linkForm && linkForm.url !== '' && !/^https?:\/\//.test(linkForm.url);

  const adicionarLink = async () => {
    setLinkSalvando(true);
    try {
      await criarEtapaLink(linkForm.membroId, linkForm);
      toast.success('Link anexado.');
      setLinkForm(null);
      aoAtualizar?.();
    } catch (erro) {
      toast.error(erro.message || 'Erro ao anexar o link.');
    } finally {
      setLinkSalvando(false);
    }
  };

  const removerLink = async (membroId, link) => {
    if (!window.confirm(`Excluir o link "${link.nome}"? O arquivo no Drive não é afetado.`)) return;
    try {
      await excluirEtapaLink(membroId, link.id);
      toast.success('Link excluído.');
      aoAtualizar?.();
    } catch (erro) {
      toast.error(erro.message || 'Erro ao excluir o link.');
    }
  };

  // Fase 10: pré-validação de UX; a regra vive no backend (422).
  const dataImplausivel = dataInicio !== '' && !dataPlausivel(dataInicio);
  const fimInvalido = dataFim !== '' && dataInicio !== '' && dataFim < dataInicio;

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
              onChange={e => aoMudarDias(e.target.value)} style={{ width: '120px' }} />
          </label>
          <label style={labelEstilo}>
            Data de início
            <input className="input-field" type="date" value={dataInicio}
              min={janelaDatas().min} max={janelaDatas().max}
              onChange={e => aoMudarInicio(e.target.value)} />
          </label>
          <label style={labelEstilo}>
            Data final
            <input className="input-field" type="date" value={dataFim}
              min={dataInicio || janelaDatas().min} max={janelaDatas().max}
              disabled={!dataInicio}
              title={dataInicio ? undefined : 'Defina a data de início primeiro'}
              onChange={e => aoMudarFim(e.target.value)} />
          </label>
        </div>

        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-disabled)', marginTop: 'calc(var(--sp-12) * -1)', marginBottom: 'var(--sp-16)' }}>
          Os três campos ficam sincronizados: editar a data final recalcula os dias úteis (correção de planejamento — termo aditivo é outro fluxo).
        </p>

        {avisoFim && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-warning)', marginBottom: 'var(--sp-12)' }}>
            {avisoFim}
          </p>
        )}

        {fimInvalido && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)', marginBottom: 'var(--sp-12)' }}>
            A data final não pode ser anterior à data de início.
          </p>
        )}

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

        {/* Fase 19 (ADR-021): links de entregas/demandas — utilitários do dia
            a dia, distintos do termo aditivo (formalização) e dos Documentos
            da área. Em bloco, cada membro tem os seus. */}
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--sp-16)', marginBottom: 'var(--sp-16)' }}>
          <span className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-8)' }}>
            <Paperclip size={13} /> Entregas e demandas (links)
          </span>
          {membros.map(m => (
            <div key={m.id} style={{ marginBottom: 'var(--sp-12)' }}>
              {ehBloco && (
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--sp-4)' }}>
                  {m.nome}
                </span>
              )}
              {(m.links ?? []).length === 0 && linkForm?.membroId !== m.id && (
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-disabled)' }}>
                  Nenhum link anexado.
                </span>
              )}
              {(m.links ?? []).map(link => (
                <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', marginBottom: 'var(--sp-4)' }}>
                  <span className={`chip chip-link-${link.tipo}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
                    {link.tipo === 'entrega' ? 'Entrega' : 'Demanda'}
                  </span>
                  <a href={link.url} target="_blank" rel="noreferrer"
                    style={{ flex: 1, fontSize: 'var(--text-body2)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {link.nome}
                  </a>
                  <button type="button" className="btn-ghost-danger" title="Excluir link"
                    aria-label={`Excluir o link ${link.nome}`} onClick={() => removerLink(m.id, link)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {linkForm?.membroId === m.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)', marginTop: 'var(--sp-8)' }}>
                  <div style={{ display: 'flex', gap: 'var(--sp-8)', flexWrap: 'wrap' }}>
                    <select className="input-field" value={linkForm.tipo} aria-label="Tipo do link"
                      onChange={e => setLinkForm(f => ({ ...f, tipo: e.target.value }))} style={{ width: '110px' }}>
                      <option value="entrega">Entrega</option>
                      <option value="demanda">Demanda</option>
                    </select>
                    <input className="input-field" type="text" placeholder="Nome do link" value={linkForm.nome}
                      onChange={e => setLinkForm(f => ({ ...f, nome: e.target.value }))} style={{ flex: '1 1 140px' }} />
                  </div>
                  <input className="input-field" type="url" placeholder="https://drive.google.com/..." value={linkForm.url}
                    onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} />
                  {linkUrlInvalida && (
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)' }}>
                      URL inválida: deve começar com http:// ou https://.
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--sp-8)' }}>
                    <button type="button" className="btn btn-primary btn-sm"
                      disabled={linkSalvando || !linkForm.nome.trim() || !linkForm.url || linkUrlInvalida}
                      onClick={adicionarLink}>
                      {linkSalvando ? 'Anexando...' : 'Anexar'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLinkForm(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-4)' }}
                  onClick={() => setLinkForm({ membroId: m.id, tipo: 'entrega', nome: '', url: '' })}>
                  <Plus size={13} /> Adicionar link
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-8)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={salvando || dataImplausivel || fimInvalido || Object.values(nomes).some(n => !n.trim())}
            onClick={salvar}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
