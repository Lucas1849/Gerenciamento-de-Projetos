// ─── Aba "Documentos importantes" da galeria de gestões (Fase 18, ADR-020) ──
// Links nomeados para o Drive, da ÁREA (sem vínculo com gestão/projeto) —
// replica a página de documentos que a área mantém no Notion. Sem upload e
// sem editor: para corrigir, exclui e recria (piloto).

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Trash2, Plus } from 'lucide-react';
import { listarDocumentos, criarDocumento, excluirDocumento } from '../services/api';

export default function DocumentosImportantes({ toast }) {
  const [documentos, setDocumentos] = useState([]);
  const [nome, setNome] = useState('');
  const [url, setUrl] = useState('');
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(() => {
    listarDocumentos()
      .then(setDocumentos)
      .catch(() => toast.error('Erro ao carregar os documentos.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const urlInvalida = url !== '' && !/^https?:\/\//.test(url);

  const adicionar = (e) => {
    e.preventDefault();
    setSalvando(true);
    criarDocumento({ nome, url })
      .then(() => {
        toast.success('Documento adicionado.');
        setNome('');
        setUrl('');
        recarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao adicionar o documento.'))
      .finally(() => setSalvando(false));
  };

  const excluir = (doc) => {
    if (!window.confirm(`Excluir o link "${doc.nome}"? O arquivo no Drive não é afetado.`)) return;
    excluirDocumento(doc.id)
      .then(() => { toast.success('Documento excluído.'); recarregar(); })
      .catch(erro => toast.error(erro.message || 'Erro ao excluir o documento.'));
  };

  return (
    <div>
      <form onSubmit={adicionar} style={{ display: 'flex', gap: 'var(--sp-8)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--sp-24)' }}>
        <label style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', flex: '1 1 180px' }}>
          Nome
          <input className="input-field" type="text" required value={nome}
            placeholder="Ex.: Base de Dados" onChange={e => setNome(e.target.value)} />
        </label>
        <label style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', flex: '2 1 260px' }}>
          Link (Drive)
          <input className="input-field" type="url" required value={url}
            placeholder="https://drive.google.com/..." onChange={e => setUrl(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={salvando || !nome.trim() || !url || urlInvalida}>
          <Plus size={15} /> Adicionar documento
        </button>
      </form>
      {urlInvalida && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-error)', marginTop: 'calc(var(--sp-16) * -1)', marginBottom: 'var(--sp-16)' }}>
          URL inválida: deve começar com http:// ou https://.
        </p>
      )}

      {documentos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <h3>Nenhum documento cadastrado</h3>
          <p style={{ fontSize: 'var(--text-body2)' }}>
            Adicione os links importantes da área (Base de Dados, EAPs, Escopos...).
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {documentos.map(doc => (
            <div key={doc.id} className="ui-card card-projeto">
              <h3 className="card-projeto-nome">{doc.nome}</h3>
              <div className="card-projeto-footer">
                <button
                  type="button"
                  className="btn-ghost-danger"
                  title="Excluir documento"
                  aria-label={`Excluir o documento ${doc.nome}`}
                  onClick={() => excluir(doc)}
                >
                  <Trash2 size={15} />
                </button>
                <a
                  className="btn btn-primary btn-sm"
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Abrir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
