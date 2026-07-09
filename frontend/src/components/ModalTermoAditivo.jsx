// ─── Modal de Termo Aditivo (Fase 17, ADR-019) ──────────────────────────────
// Formaliza dias adicionais na etapa/bloco: o compromisso original
// (dias_uteis_esperados / data_fim_original) fica intacto; a data efetiva
// passa a considerar o Σ de termos. Distinto da CORREÇÃO de planejamento
// (editar dias/data no ModalEditarEtapa) — aqui é formalização com o cliente.
// Histórico embutido: termo sem documento é excluível; anexar o documento
// formal trava o registro (DELETE → 409 no backend).

import { useState, useEffect } from 'react';
import { FilePlus, Trash2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import {
  criarTermoAditivo, excluirTermoAditivo, anexarDocumentoTermo, calcularDataFim,
} from '../services/api';
import { formatarData } from './datasUtils';

export default function ModalTermoAditivo({ membros, toast, aoFechar, aoSalvo }) {
  const ehBloco = membros.length > 1;
  const ref = membros[0]; // etapa de referência do bloco (decisão de 09/07/2026)
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [previa, setPrevia] = useState(null);
  const [salvando, setSalvando] = useState(false);
  // Links de documento em edição no histórico: { [termoId]: url }.
  const [anexos, setAnexos] = useState({});

  // Todos os termos do bloco (podem estar em membros diferentes após
  // desfazer/refazer blocos — a derivação soma tudo, ADR-019).
  const termos = membros.flatMap(m =>
    m.termos_aditivos.map(t => ({ ...t, etapaId: m.id }))
  );

  const urlInvalida = documentoUrl !== '' && !/^https?:\/\//.test(documentoUrl);

  // Prévia do efeito: entrega efetiva com os novos dias somados.
  useEffect(() => {
    const n = Number(dias);
    if (!dias || n <= 0 || !ref.data_inicio || ref.dias_uteis_esperados == null) {
      setPrevia(null);
      return;
    }
    let ativo = true;
    calcularDataFim(ref.data_inicio, ref.dias_uteis_esperados + ref.dias_aditivos + n)
      .then(r => { if (ativo) setPrevia(r.data_fim); })
      .catch(() => { if (ativo) setPrevia(null); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias]);

  const lancar = () => {
    setSalvando(true);
    criarTermoAditivo(ref.id, {
      dias_adicionais: Number(dias),
      motivo,
      documento_url: documentoUrl || null,
    })
      .then(() => {
        toast.success('Termo aditivo formalizado.');
        aoSalvo();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao lançar o termo aditivo.'))
      .finally(() => setSalvando(false));
  };

  const excluir = (termo) => {
    if (!window.confirm('Excluir este termo em rascunho? A data efetiva volta a desconsiderá-lo.')) return;
    excluirTermoAditivo(termo.etapaId, termo.id)
      .then(() => { toast.success('Termo excluído.'); aoSalvo(); })
      .catch(erro => toast.error(erro.message || 'Erro ao excluir o termo.'));
  };

  const anexar = (termo) => {
    const url = anexos[termo.id];
    anexarDocumentoTermo(termo.etapaId, termo.id, url)
      .then(() => { toast.success('Documento anexado — o termo está travado.'); aoSalvo(); })
      .catch(erro => toast.error(erro.message || 'Erro ao anexar o documento.'));
  };

  const labelEstilo = {
    fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)',
    display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Termo aditivo"
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
        style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--sp-24)', boxShadow: 'var(--shadow-3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 'var(--sp-8)' }}>
          <FilePlus size={18} /> Termo aditivo{ehBloco ? ' do bloco' : ''}
        </h3>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--sp-16)' }}>
          Formaliza dias adicionais acordados com o cliente — o prazo original fica registrado e a diferença alimenta os indicadores de atraso.
          {ehBloco && ' O termo vale para a entrega conjunta do bloco inteiro.'}
          {' '}Para corrigir o planejamento sem formalização, use a edição da etapa.
        </p>

        {ref.data_inicio && ref.dias_uteis_esperados != null && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 'var(--sp-16)' }}>
            Compromisso original: {formatarData(ref.data_fim_original)}
            {ref.dias_aditivos > 0 && ` · entrega efetiva atual: ${formatarData(ref.data_fim)} (+${ref.dias_aditivos} dia(s))`}
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-12)', flexWrap: 'wrap', marginBottom: 'var(--sp-12)' }}>
          <label style={labelEstilo}>
            Dias adicionais
            <input className="input-field" type="number" min="1" value={dias}
              onChange={e => setDias(e.target.value)} style={{ width: '120px' }} />
          </label>
          <label style={{ ...labelEstilo, flex: 1, minWidth: '200px' }}>
            Motivo (obrigatório)
            <input className="input-field" type="text" value={motivo}
              placeholder="Ex.: cliente atrasou o envio dos dados"
              onChange={e => setMotivo(e.target.value)} />
          </label>
        </div>
        <label style={{ ...labelEstilo, marginBottom: 'var(--sp-12)' }}>
          Link do documento formal (opcional — pode ser anexado depois)
          <input className="input-field" type="url" value={documentoUrl}
            placeholder="https://drive.google.com/..."
            onChange={e => setDocumentoUrl(e.target.value)} />
        </label>

        {urlInvalida && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)', marginBottom: 'var(--sp-12)' }}>
            URL inválida: deve começar com http:// ou https://.
          </p>
        )}

        {previa && (
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-warning)', fontWeight: 600, marginBottom: 'var(--sp-16)' }}>
            A entrega{ehBloco ? ' conjunta do bloco' : ''} passa de {formatarData(ref.data_fim)} para {formatarData(previa)}.
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-8)', justifyContent: 'flex-end', marginBottom: termos.length > 0 ? 'var(--sp-24)' : 0 }}>
          <button type="button" className="btn btn-secondary" onClick={aoFechar}>
            Fechar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={salvando || !dias || Number(dias) <= 0 || !motivo.trim() || urlInvalida}
            onClick={lancar}
          >
            {salvando ? 'Formalizando...' : 'Formalizar termo'}
          </button>
        </div>

        {termos.length > 0 && (
          <div>
            <span className="field-label">Histórico de termos</span>
            {termos.map(t => (
              <div key={t.id} style={{ borderTop: '1px solid var(--color-border-subtle)', padding: 'var(--sp-12) 0', display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)' }}>
                  <span className="chip chip-warning">+{t.dias_adicionais} dia(s)</span>
                  <span style={{ flex: 1, fontSize: 'var(--text-body2)' }}>{t.motivo}</span>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-disabled)' }}>
                    {formatarData(t.criado_em.slice(0, 10))}
                  </span>
                </div>
                {t.documento_url ? (
                  <a href={t.documento_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-4)', fontSize: 'var(--text-caption)', color: 'var(--color-brand-glow)' }}>
                    <ExternalLink size={13} /> Documento formal (registro travado)
                  </a>
                ) : (
                  <div style={{ display: 'flex', gap: 'var(--sp-8)', alignItems: 'center' }}>
                    <input className="input-field" type="url" style={{ flex: 1, padding: '6px 10px' }}
                      placeholder="Anexe o documento para travar o registro"
                      value={anexos[t.id] ?? ''}
                      onChange={e => setAnexos(prev => ({ ...prev, [t.id]: e.target.value }))} />
                    <button type="button" className="btn btn-secondary btn-sm"
                      disabled={!/^https?:\/\//.test(anexos[t.id] ?? '')}
                      title="Anexar documento formal"
                      onClick={() => anexar(t)}>
                      <LinkIcon size={14} />
                    </button>
                    <button type="button" className="btn-ghost-danger" style={{ height: 30, minWidth: 30, padding: '0 8px' }}
                      title="Excluir termo em rascunho" onClick={() => excluir(t)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
