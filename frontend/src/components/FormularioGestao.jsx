import { useState } from 'react';
import { criarGestao } from '../services/api';

export default function FormularioGestao({ toast, aoCriar }) {
  const [nome,     setNome]     = useState('');
  const [ativa,    setAtiva]    = useState(false);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const gestao = await criarGestao({ nome, ativa });
      toast.success('Gestão criada com sucesso!');
      setNome('');
      setAtiva(false);
      if (aoCriar) aoCriar(gestao);
    } catch (erro) {
      toast.error(erro.message || 'Erro ao criar gestão.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="ui-card" style={{ borderTop: '4px solid var(--color-brand)', maxWidth: '500px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', color: 'var(--color-brand-glow)', marginBottom: 'var(--sp-16)' }}>
        Nova Gestão
      </h3>
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
        <div>
          <label className="field-label">Nome da Gestão</label>
          <input className="input-field" type="text" placeholder="Ex: 2026.2"
            value={nome} onChange={e => setNome(e.target.value)} required />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', cursor: 'pointer', fontSize: 'var(--text-body2)' }}>
          <input type="checkbox" checked={ativa} onChange={e => setAtiva(e.target.checked)} />
          Gestão ativa
        </label>
        <div style={{ textAlign: 'right' }}>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar Gestão'}
          </button>
        </div>
      </form>
    </div>
  );
}
