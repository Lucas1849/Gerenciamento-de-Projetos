// Arquivo: frontend/src/components/FormularioProjeto.jsx

import { useState, useEffect } from 'react';

export default function FormularioProjeto() {
  const [colaboradores, setColaboradores] = useState([]);

  // Detalhes Projeto e Equipe
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [gerenteId, setGerenteId] = useState('');
  const [consultor1Id, setConsultor1Id] = useState('');
  const [consultor2Id, setConsultor2Id] = useState('');
  const [consultor3Id, setConsultor3Id] = useState('');

  // Personalização Apoio
  const [tipoServico, setTipoServico] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [nomeContratante, setNomeContratante] = useState('');
  const [agregadosContratante, setAgregadosContratante] = useState('');
  const [kickoff, setKickoff] = useState('Não');
  const [tap, setTap] = useState('Não');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/trabalhadores/')
      .then(resposta => resposta.json())
      .then(dados => setColaboradores(dados))
      .catch(erro => console.error(erro));
  }, []);

  const salvarProjeto = (evento) => {
    evento.preventDefault();

    const novoProjeto = {
      nome: nome,
      descricao: descricao,
      status: "Em andamento",
      tipo_servico: tipoServico,
      objetivo: objetivo,
      nome_contratante: nomeContratante,
      agregados_contratante: agregadosContratante,
      kickoff_realizado: kickoff,
      tap_assinado: tap,
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
      // Limpa os campos após salvar
      setNome(''); setDescricao(''); setTipoServico(''); setObjetivo(''); 
      setNomeContratante(''); setAgregadosContratante('');
      setKickoff('Não'); setTap('Não');
    });
  };

  // ESTILOS PARA ORGANIZAR O FORMULÁRIO EM DUAS COLUNAS
  const estiloGrid = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'
  };
  const estiloInput = {
    width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'
  };
  const estiloLabel = {
    fontWeight: 'bold', fontSize: '14px', color: '#333', marginBottom: '5px', display: 'block'
  };

  return (
    <div>
      <h3 style={{ color: '#004080', borderBottom: '2px solid #17a2b8', paddingBottom: '10px', marginBottom: '20px' }}>
      Novo Projeto
      </h3>
      
      <form onSubmit={salvarProjeto}>
        
        {/* BLOCO 1: Informações Base projeto */}
        <div style={estiloGrid}>
          <div>
            <label style={estiloLabel}>Nome do Projeto</label>
            <input style={estiloInput} type="text" value={nome} onChange={e => setNome(e.target.value)} required />
          </div>
          <div>
            {/*Lembrar de Mudar o input abaixo para select com a cartela de serviços */}
            <label style={estiloLabel}>Tipo de Serviço</label>
            <input style={estiloInput} type="text" placeholder="Ex: Mapeamento de Processos" value={tipoServico} onChange={e => setTipoServico(e.target.value)} required />
          </div>
            {/*Caixa do objetivo do projeto */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={estiloLabel}>Objetivo do Projeto</label>
            <textarea style={{...estiloInput, height: '60px'}} value={objetivo} onChange={e => setObjetivo(e.target.value)} required />
          </div>
          {/* Caixa com descrição curta - Talvez possa ser retirada*/}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={estiloLabel}>Descrição Rápida</label>
            <input style={estiloInput} type="text" value={descricao} onChange={e => setDescricao(e.target.value)} required />
          </div>
        </div>

        {/* BLOCO 2: Cliente */}
        <h4 style={{ margin: '20px 0 10px 0', color: '#555' }}> Informações do Cliente</h4>
        <div style={estiloGrid}>
          <div>
            <label style={estiloLabel}>Nome do Contratante</label>
            <input style={estiloInput} type="text" value={nomeContratante} onChange={e => setNomeContratante(e.target.value)} required />
          </div>
          <div>
            <label style={estiloLabel}>Agregados (Separados por vírgula)</label>
            <input style={estiloInput} type="text" placeholder="Ex: João (CEO), Maria (CFO)" value={agregadosContratante} onChange={e => setAgregadosContratante(e.target.value)} />
          </div>
        </div>
        {/* BLOCO 3: Status Importante */}
        <h4 style={{ margin: '20px 0 10px 0', color: '#555' }}>Status etapas de iniciação</h4>
        <div style={estiloGrid}>
          <div>
            <label style={estiloLabel}>Reunião de Kick-Off Realizada?</label>
            <select style={estiloInput} value={kickoff} onChange={e => setKickoff(e.target.value)}>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
          <div>
            <label style={estiloLabel}>TAP Assinado pelo Cliente?</label>
            <select style={estiloInput} value={tap} onChange={e => setTap(e.target.value)}>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
        </div>
        {/* BLOCO 4: Equipe principal do projeto*/}
        <h4 style={{ margin: '20px 0 10px 0', color: '#555' }}>Equipe do Projeto</h4>
        <div style={estiloGrid}>
          {/* Gerente */}
          <div>
            <label style={estiloLabel}>Gerente</label>
            <select style={estiloInput} value={gerenteId} onChange={e => setGerenteId(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {/* Consultor 1 */}
          <div>
            <label style={estiloLabel}>Consultor 1</label>
            <select style={estiloInput} value={consultor1Id} onChange={e => setConsultor1Id(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {/* Consultor 2 */}
          <div>
            <label style={estiloLabel}>Consultor 2</label>
            <select style={estiloInput} value={consultor2Id} onChange={e => setConsultor2Id(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {/* Consultor 3 */}
          <div>
            <label style={estiloLabel}>Consultor 3</label>
            <select style={estiloInput} value={consultor3Id} onChange={e => setConsultor3Id(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" style={{ width: '100%', marginTop: '25px', padding: '12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          Criar Projeto
        </button>
      </form>
    </div>
  );
}