import { useState, useEffect } from 'react';

export default function FormularioProjeto() {
  // 1. Caixinha para guardar a lista de pessoas vindas do banco
  const [colaboradores, setColaboradores] = useState([]);

  // 2. Caixinhas para os dados do novo projeto
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [gerenteId, setGerenteId] = useState('');
  const [consultor1Id, setConsultor1Id] = useState('');
  const [consultor2Id, setConsultor2Id] = useState('');
  const [consultor3Id, setConsultor3Id] = useState('');

  // Busca os colaboradores assim que o componente aparece na tela
  useEffect(() => {
    fetch('http://127.0.0.1:8000/trabalhadores/')
      .then(resposta => resposta.json())
      .then(dados => setColaboradores(dados))
      .catch(erro => console.error("Erro ao buscar colaboradores:", erro));
  }, []);

  const salvarProjeto = (evento) => {
    evento.preventDefault();

    const novoProjeto = {
      nome: nome,
      descricao: descricao,
      status: "Em andamento",
      // O React guarda como texto, então convertemos para número (int) para o Python não reclamar
      gerente_id: parseInt(gerenteId),
      consultor1_id: parseInt(consultor1Id),
      consultor2_id: parseInt(consultor2Id),
      consultor3_id: parseInt(consultor3Id)
    };

    fetch('http://127.0.0.1:8000/projetos/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoProjeto)
    })
    .then(resposta => resposta.json())
    .then(dados => {
      alert("Projeto criado com sucesso! ID: " + dados.id);
      setNome('');
      setDescricao('');
      // Dica: num sistema real, recarregaríamos a lista de projetos da tela principal aqui!
    });
  };

  return (
    <div style={{ border: '1px solid #17a2b8', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
      <h3>Criar Novo Projeto</h3>
      
      <form onSubmit={salvarProjeto} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
        <input type="text" placeholder="Nome do Projeto" value={nome} onChange={e => setNome(e.target.value)} required />
        <input type="text" placeholder="Descrição rápida" value={descricao} onChange={e => setDescricao(e.target.value)} required />
        
        {/* Campo de Seleção do Gerente */}
        <label>Gerente do Projeto:</label>
        <select value={gerenteId} onChange={e => setGerenteId(e.target.value)} required>
          <option value="">Selecione um colaborador...</option>
          {colaboradores.map(c => (
            <option key={c.id} value={c.id}>{c.nome} - {c.cargo}</option>
          ))}
        </select>

        {/* Campos dos Consultores (repetimos a lógica do gerente) */}
        <label>Consultor 1:</label>
        <select value={consultor1Id} onChange={e => setConsultor1Id(e.target.value)} required>
          <option value="">Selecione...</option>
          {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label>Consultor 2:</label>
        <select value={consultor2Id} onChange={e => setConsultor2Id(e.target.value)} required>
          <option value="">Selecione...</option>
          {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <label>Consultor 3:</label>
        <select value={consultor3Id} onChange={e => setConsultor3Id(e.target.value)} required>
          <option value="">Selecione...</option>
          {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <button type="submit" style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}>
          Criar Projeto
        </button>
      </form>
    </div>
  );
}