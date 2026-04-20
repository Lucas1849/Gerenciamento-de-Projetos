import { useState, useEffect } from 'react';

export default function Kanban({ projetoId }) {
  const [tarefas, setTarefas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [diasUteis, setDiasUteis] = useState(1);
  const [blocoEntrega, setBlocoEntrega] = useState('');
  
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

  const criarNovaTarefa = (evento) => {
    evento.preventDefault();
    const novaTarefa = {
      titulo: titulo, 
      descricao: descricao, 
      projeto_id: parseInt(projetoId), // Garante que é número
      trabalhador_id: parseInt(responsavelId), // Garante que é número
      dias_uteis_esperados: parseInt(diasUteis) || 1, // Se falhar, envia 1 por padrão
      // Se o bloco estiver vazio, enviamos null para o banco de dados
      bloco_entrega: blocoEntrega.trim() === '' ? null : blocoEntrega,
      depende_de_id: null // Por enquanto enviamos nulo até criarmos a interface de dependências
    };

    fetch('http://127.0.0.1:8000/tarefas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaTarefa)
    })
    .then(async (resposta) => {
      // Se o servidor retornar um erro (ex: 422 Unprocessable Entity ou 500 Internal Server Error)
      if (!resposta.ok) {
        let erroDetalhado;
        try {
          erroDetalhado = await resposta.json();
        } catch {
          erroDetalhado = await resposta.text();
        }
        console.error("O Backend recusou o pacote. Detalhes:", erroDetalhado);
        alert("Erro na validação ou erro interno! Olhe o console (F12).");
        throw new Error("Falha no POST");
      }
      return resposta.json();
    })
    .then(tarefaSalva => {
      // Sucesso! Adiciona na tela e limpa o formulário
      setTarefas([...tarefas, tarefaSalva]);
      setTitulo(''); 
      setDescricao(''); 
      setResponsavelId(''); 
      setDiasUteis(1); 
      setBlocoEntrega('');
      setMostrarForm(false);
    })
    .catch(erro => console.error("Erro na requisição:", erro));
  };

  const moverTarefa = (tarefaId, novoStatus) => {
    fetch(`http://127.0.0.1:8000/tarefas/${tarefaId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coluna_status: novoStatus })
    }).then(res => res.json()).then(tarefaAtualizada => {
      setTarefas(tarefas.map(t => t.id === tarefaId ? tarefaAtualizada : t));
    });
  };

  const tarefasTodo = tarefas.filter(t => t.coluna_status === 'TODO');
  const tarefasDoing = tarefas.filter(t => t.coluna_status === 'DOING');
  const tarefasDone = tarefas.filter(t => t.coluna_status === 'DONE');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--h2)' }}>Quadro Operacional</h2>
        <button className={mostrarForm ? "btn btn-secondary" : "btn btn-primary"} onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? '✕ Cancelar' : 'Nova Tarefa'}
        </button>
      </div>

      {mostrarForm && (
        <div className="ui-card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--primary)' }}>
          <form onSubmit={criarNovaTarefa} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <input className="input-field" type="text" placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} required />
            <input className="input-field" type="text" placeholder="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} style={{ gridColumn: 'span 2' }} required />
            
            {/* Novos Campos no Formulário */}
            <input className="input-field" type="number" min="1" placeholder="Dias Úteis (ex: 5)" value={diasUteis} onChange={e => setDiasUteis(e.target.value)} required />
            <input className="input-field" type="text" placeholder="Bloco (Ex: Fase 1)" value={blocoEntrega} onChange={e => setBlocoEntrega(e.target.value)} />
            
            <select className="input-field" value={responsavelId} onChange={e => setResponsavelId(e.target.value)} required>
              <option value="">Atribuir para...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            
            <div style={{ gridColumn: 'span 3', textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary">Salvar no Quadro</button>
            </div>
          </form>
        </div>
      )}
      
      {/* KANBAN COLUNAS */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {[
          { titulo: 'A Fazer', tarefas: tarefasTodo, cor: '#6B7280', next: 'DOING', nextLabel: 'Iniciar →' },
          { titulo: 'Em Andamento', tarefas: tarefasDoing, cor: 'var(--primary)', next: 'DONE', nextLabel: 'Concluir ✓', prev: 'TODO' },
          { titulo: 'Concluído', tarefas: tarefasDone, cor: 'var(--success)', prev: 'DOING', nextLabel: '← Reabrir' }
        ].map(coluna => (
          <div key={coluna.titulo} style={{ flex: 1, backgroundColor: '#F9FAFB', padding: '16px', borderRadius: 'var(--rad-lg)', borderTop: `4px solid ${coluna.cor}` }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>{coluna.titulo} ({coluna.tarefas.length})</h3>
            
            {coluna.tarefas.map(t => (
              <div key={t.id} className="ui-card" style={{ padding: '16px', marginBottom: '16px', borderRadius: 'var(--rad-md)' }}>
                
                {/* Mostrando o Bloco de Entrega (Se existir) */}
                {t.bloco_entrega && (
                  <span className="chip" style={{ backgroundColor: '#E5E7EB', color: '#374151', fontSize: '10px', marginBottom: '8px' }}>
                    📦 {t.bloco_entrega}
                  </span>
                )}
                
                <h4 style={{ textDecoration: t.coluna_status === 'DONE' ? 'line-through' : 'none' }}>{t.titulo}</h4>
                <p style={{ fontSize: 'var(--body2)', color: 'var(--text-secondary)', margin: '8px 0' }}>{t.descricao}</p>
                
                {/* Mostrando os Dias Úteis */}
                <p style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '12px' }}>
                  ⏳ Prazo: {t.dias_uteis_esperados} dia(s) útil(eis)
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {coluna.prev && <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', flex: 1 }} onClick={() => moverTarefa(t.id, coluna.prev)}>Voltar</button>}
                  {coluna.next && <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px', flex: 1, backgroundColor: coluna.cor }} onClick={() => moverTarefa(t.id, coluna.next)}>{coluna.nextLabel}</button>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}