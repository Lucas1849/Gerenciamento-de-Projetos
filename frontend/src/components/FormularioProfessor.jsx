import { useState } from 'react';
import { criarProfessor } from '../services/api';

export default function FormularioProfessor({ toast, aoCriar }) {
  const [nome,     setNome]     = useState('');
  const [email,    setEmail]    = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const professor = await criarProfessor({ nome, email });
      toast.success('Professor cadastrado com sucesso!');
      setNome('');
      setEmail('');
      if (aoCriar) aoCriar(professor);
    } catch (erro) {
      toast.error(erro.message || 'Erro ao cadastrar professor.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="ui-card" style={{ borderTop: '4px solid var(--color-brand)', maxWidth: '500px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', color: 'var(--color-brand)', marginBottom: 'var(--sp-16)' }}>
        Novo Professor Orientador
      </h3>
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
        <div>
          <label className="field-label">Nome</label>
          <input className="input-field" type="text" placeholder="Nome do professor"
            value={nome} onChange={e => setNome(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">E-mail (opcional)</label>
          <input className="input-field" type="email" placeholder="professor@universidade.br"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? 'Cadastrando...' : 'Cadastrar Professor'}
          </button>
        </div>
      </form>
    </div>
  );
}
