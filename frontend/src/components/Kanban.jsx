import { useState, useEffect } from 'react';

// ProjetoId como parâmetro para relacionar as tarefas apenas com os respectivos projetos
export default function Kanban({ projetoId }) {
  const [tarefas, setTarefas] = useState([]);

  // Busca as tarefas assim que o componente abre ou se o projetoId mudar
  useEffect(() => {
    if (projetoId) {
      fetch(`http://127.0.0.1:8000/projetos/${projetoId}/tarefas`)
        .then(resposta => resposta.json())
        .then(dados => setTarefas(dados))
        .catch(erro => console.error("Erro ao carregar Kanban:", erro));
    }
  }, [projetoId]);

  // Função mágica que faz o PUT para mover a tarefa
  const moverTarefa = (tarefaId, novoStatus) => {
    fetch(`http://127.0.0.1:8000/tarefas/${tarefaId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coluna_status: novoStatus })
    })
    .then(resposta => resposta.json())
    .then(tarefaAtualizada => {
      // Atualiza a tela instantaneamente sem precisar recarregar a página
      setTarefas(tarefasAtuais => 
        tarefasAtuais.map(t => t.id === tarefaId ? tarefaAtualizada : t)
      );
    })
    .catch(erro => console.error("Erro ao mover tarefa:", erro));
  };

  // Filtramos as tarefas para cada coluna
  const tarefasTodo = tarefas.filter(t => t.coluna_status === 'TODO');
  const tarefasDoing = tarefas.filter(t => t.coluna_status === 'DOING');
  const tarefasDone = tarefas.filter(t => t.coluna_status === 'DONE');

  // Estilo base para as colunas
  const estiloColuna = {
    flex: 1, backgroundColor: '#f4f5f7', padding: '15px', borderRadius: '8px', minHeight: '300px'
  };

  // Estilo base para o "post-it"
  const estiloCartao = {
    backgroundColor: 'white', padding: '10px', marginBottom: '10px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
  };

  return (
    <div style={{ marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
      <h2>Quadro Kanban do Projeto #{projetoId}</h2>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* COLUNA 1: A FAZER */}
        <div style={estiloColuna}>
          <h3 style={{ color: '#6b778c' }}>A Fazer ({tarefasTodo.length})</h3>
          {tarefasTodo.map(t => (
            <div key={t.id} style={estiloCartao}>
              <strong>{t.titulo}</strong>
              <p style={{ fontSize: '14px', color: '#555' }}>{t.descricao}</p>
              <button onClick={() => moverTarefa(t.id, 'DOING')} style={{ cursor: 'pointer', backgroundColor: '#0052cc', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>
                Iniciar →
              </button>
            </div>
          ))}
        </div>

        {/* COLUNA 2: EM ANDAMENTO */}
        <div style={estiloColuna}>
          <h3 style={{ color: '#ff991f' }}>Em Andamento ({tarefasDoing.length})</h3>
          {tarefasDoing.map(t => (
            <div key={t.id} style={estiloCartao}>
              <strong>{t.titulo}</strong>
              <p style={{ fontSize: '14px', color: '#555' }}>{t.descricao}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => moverTarefa(t.id, 'TODO')} style={{ cursor: 'pointer' }}>← Voltar</button>
                <button onClick={() => moverTarefa(t.id, 'DONE')} style={{ cursor: 'pointer', backgroundColor: '#36b37e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px' }}>
                  Concluir ✓
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* COLUNA 3: CONCLUÍDO */}
        <div style={estiloColuna}>
          <h3 style={{ color: '#00875a' }}>Concluído ({tarefasDone.length})</h3>
          {tarefasDone.map(t => (
            <div key={t.id} style={{...estiloCartao, opacity: 0.7}}>
              <strong style={{ textDecoration: 'line-through' }}>{t.titulo}</strong>
              <p style={{ fontSize: '14px', color: '#555' }}>{t.descricao}</p>
              <button onClick={() => moverTarefa(t.id, 'DOING')} style={{ cursor: 'pointer' }}>← Reabrir</button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}