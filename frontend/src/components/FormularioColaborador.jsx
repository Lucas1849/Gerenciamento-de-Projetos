import { useState } from 'react';

export default function FormularioColaborador() {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');

  const salvarColaborador = (evento) => {
    evento.preventDefault();

    const dadosParaEnviar = {
      nome: nome,
      cargo: cargo,
      emailInstitucional: email
    };

    fetch('http://127.0.0.1:8000/trabalhadores/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosParaEnviar)
    })
    .then(resposta => resposta.json())
    .then(dados_salvos => {
      alert("Colaborador salvo com sucesso!");
      setNome(''); setCargo(''); setEmail('');
    })
    .catch(erro => console.error("Erro ao salvar:", erro));
  };

  return (
    <div className="ui-card" style={{ maxWidth: '500px', margin: '0 auto', borderTop: '4px solid var(--primary)' }}>
      <h3 style={{ color: 'var(--primary)', marginBottom: 'var(--sp-24)' }}>👥 Novo Colaborador</h3>
      
      <form onSubmit={salvarColaborador} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--sp-4)', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>
            NOME COMPLETO
          </label>
          <input className="input-field" type="text" placeholder="Ex: João da Silva" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--sp-4)', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>
            CARGO NA EMPRESA
          </label>
          <input className="input-field" type="text" placeholder="Ex: Assessor de Projetos" value={cargo} onChange={(e) => setCargo(e.target.value)} required />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--sp-4)', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>
            E-MAIL INSTITUCIONAL
          </label>
          <input className="input-field" type="email" placeholder="joao@apoioconsultoria.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--sp-8)', justifyContent: 'center' }}>
          Salvar Colaborador
        </button>
      </form>
    </div>
  );
}