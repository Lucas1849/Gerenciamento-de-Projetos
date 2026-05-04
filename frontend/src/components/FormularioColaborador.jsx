import { useState } from 'react';
 
const API = 'http://127.0.0.1:8000';
 
export default function FormularioColaborador({ toast }) {
  const [nome,  setNome]  = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [salvando, setSalvando] = useState(false);
 
  const limpar = () => { setNome(''); setCargo(''); setEmail(''); };
 
  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch(`${API}/trabalhadores/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cargo, emailInstitucional: email }),
      });
      if (!res.ok) throw new Error();
      toast.success('Colaborador salvo com sucesso!');
      limpar();
    } catch {
      toast.error('Erro ao salvar colaborador.');
    } finally {
      setSalvando(false);
    }
  };
 
  return (
    <div className="ui-card" style={{ maxWidth: '500px', borderTop: `4px solid var(--color-brand)` }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', marginBottom: 'var(--sp-24)' }}>
        Novo Colaborador
      </h3>
 
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
        <div>
          <label className="field-label">Nome Completo</label>
          <input className="input-field" type="text" placeholder="Ex: João da Silva"
            value={nome} onChange={e => setNome(e.target.value)} required />
        </div>
 
        <div>
          <label className="field-label">Cargo na Empresa</label>
          <input className="input-field" type="text" placeholder="Ex: Assessor de Projetos"
            value={cargo} onChange={e => setCargo(e.target.value)} required />
        </div>
 
        <div>
          <label className="field-label">E-mail Institucional</label>
          <input className="input-field" type="email" placeholder="joao@apoioconsultoria.com.br"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
 
        <button type="submit" className="btn btn-primary" disabled={salvando}
          style={{ marginTop: 'var(--sp-8)', justifyContent: 'center' }}>
          {salvando ? 'Salvando...' : 'Salvar Colaborador'}
        </button>
      </form>
    </div>
  );
}