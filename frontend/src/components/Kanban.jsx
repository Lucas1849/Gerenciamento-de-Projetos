import { useState, useEffect } from 'react';

export default function Kanban({ projetoId }) {
  const [tarefas, setTarefas] = useState([]);
  // Colaborador que será responsabilizado pela tarefa
  const [colaboradores, setColaboradores] = useState([]); 
  
  // Controles do Formulário de Nova Tarefa
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');

  // Busca as tarefas E a equipe assim que o componente abre
  useEffect(() => {
    if (projetoId) {
      // Busca as Tarefas
      fetch(`http://127.0.0.1:8000/projetos/${projetoId}/tarefas`)
        .then(resposta => resposta.json())
        .then(dados => setTarefas(dados))
        .catch(erro => console.error("Erro ao carregar Kanban:", erro));
        
      // Busca os Colaboradores (Para o select da nova tarefa)
      fetch('http://127.0.0.1:8000/trabalhadores/')
        .then(resposta => resposta.json())
        .then(dados => setColaboradores(dados))
        .catch(erro => console.error("Erro ao carregar equipe:", erro));
    }
  }, [projetoId]);

  // Criar nova tarefa
  const criarNovaTarefa = (evento) => {
    evento.preventDefault();

    const novaTarefa = {
      titulo: titulo,
      descricao: descricao,
      projeto_id: projetoId,
      trabalhador_id: parseInt(responsavelId)
    };

    fetch('http://127.0.0.1:8000/tarefas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaTarefa)
    })
    .then(resposta => resposta.json())
    .then(tarefaSalva => {
      // Pega as tarefas que já existem e adiciona a nova na lista
      setTarefas([...tarefas, tarefaSalva]);
      
      // Limpa e esconde o formulário
      setTitulo('');
      setDescricao('');
      setResponsavelId('');
      setMostrarForm(false);
    })
    .catch(erro => console.error("Erro ao criar tarefa:", erro));
  };

  // Mover as tarefas entre o Kanban
  const moverTarefa = (tarefaId, novoStatus) => {
    fetch(`http://127.0.0.1:8000/tarefas/${tarefaId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coluna_status: novoStatus })
    })
    .then(resposta => resposta.json())
    .then(tarefaAtualizada => {
      setTarefas(tarefasAtuais => 
        tarefasAtuais.map(t => t.id === tarefaId ? tarefaAtualizada : t)
      );
    })
    .catch(erro => console.error("Erro ao mover tarefa:", erro));
  };

  const tarefasTodo = tarefas.filter(t => t.coluna_status === 'TODO');
  const tarefasDoing = tarefas.filter(t => t.coluna_status === 'DOING');
  const tarefasDone = tarefas.filter(t => t.coluna_status === 'DONE');

  const estiloColuna = { flex: 1, backgroundColor: '#f4f5f7', padding: '15px', borderRadius: '8px', minHeight: '300px' };
  const estiloCartao = { backgroundColor: 'white', padding: '10px', marginBottom: '10px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' };
  const estiloInput = { width: '100%', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' };

  return (
    <div style={{ marginTop: '10px' }}>
      
      {/* CABEÇALHO DO KANBAN COM BOTÃO DE NOVA TAREFA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#004080' }}>Nova Etapa</h2>
        <button 
          onClick={() => setMostrarForm(!mostrarForm)}
          style={{ backgroundColor: mostrarForm ? '#dc3545' : '#28a745', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {mostrarForm ? '✕ Cancelar' : 'Nova Tarefa'}
        </button>
      </div>

      {/* FORMULÁRIO DE NOVA TAREFA (RENDERIZAÇÃO CONDICIONAL) */}
      {mostrarForm && (
        <div style={{ backgroundColor: '#e9ecef', padding: '20px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #28a745' }}>
          <h4 style={{ marginBottom: '15px', color: '#333' }}>Descrição da Etapa</h4>
          <form onSubmit={criarNovaTarefa} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input type="text" placeholder="Título da Tarefa" value={titulo} onChange={e => setTitulo(e.target.value)} required style={estiloInput} />
            </div>
            <div style={{ flex: 2, minWidth: '300px' }}>
              <input type="text" placeholder="Descrição rápida..." value={descricao} onChange={e => setDescricao(e.target.value)} required style={estiloInput} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <select value={responsavelId} onChange={e => setResponsavelId(e.target.value)} required style={estiloInput}>
                <option value="">Atribuir para...</option>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.cargo})</option>)}
              </select>
            </div>
            <div>
              <button type="submit" style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Adicionar
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* COLUNAS DO KANBAN */}
      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* A FAZER */}
        <div style={estiloColuna}>
          <h3 style={{ color: '#6b778c', marginBottom: '15px', borderBottom: '2px solid #ccc', paddingBottom: '5px' }}>A Fazer ({tarefasTodo.length})</h3>
          {tarefasTodo.map(t => (
            <div key={t.id} style={estiloCartao}>
              <strong>{t.titulo}</strong>
              <p style={{ fontSize: '14px', color: '#555', margin: '5px 0' }}>{t.descricao}</p>
              <button onClick={() => moverTarefa(t.id, 'DOING')} style={{ cursor: 'pointer', backgroundColor: '#0052cc', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', width: '100%', marginTop: '5px' }}>
                Iniciar →
              </button>
            </div>
          ))}
        </div>

        {/* EM ANDAMENTO */}
        <div style={estiloColuna}>
          <h3 style={{ color: '#ff991f', marginBottom: '15px', borderBottom: '2px solid #ff991f', paddingBottom: '5px' }}>Em Andamento ({tarefasDoing.length})</h3>
          {tarefasDoing.map(t => (
            <div key={t.id} style={{...estiloCartao, borderLeft: '4px solid #ff991f'}}>
              <strong>{t.titulo}</strong>
              <p style={{ fontSize: '14px', color: '#555', margin: '5px 0' }}>{t.descricao}</p>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                <button onClick={() => moverTarefa(t.id, 'TODO')} style={{ cursor: 'pointer', flex: 1 }}>← Voltar</button>
                <button onClick={() => moverTarefa(t.id, 'DONE')} style={{ cursor: 'pointer', backgroundColor: '#36b37e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', flex: 1 }}>
                  Concluir ✓
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CONCLUÍDO */}
        <div style={estiloColuna}>
          <h3 style={{ color: '#00875a', marginBottom: '15px', borderBottom: '2px solid #00875a', paddingBottom: '5px' }}>Concluído ({tarefasDone.length})</h3>
          {tarefasDone.map(t => (
            <div key={t.id} style={{...estiloCartao, opacity: 0.7, borderLeft: '4px solid #00875a'}}>
              <strong style={{ textDecoration: 'line-through' }}>{t.titulo}</strong>
              <p style={{ fontSize: '14px', color: '#555', margin: '5px 0' }}>{t.descricao}</p>
              <button onClick={() => moverTarefa(t.id, 'DOING')} style={{ cursor: 'pointer', width: '100%', marginTop: '5px' }}>← Reabrir</button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}