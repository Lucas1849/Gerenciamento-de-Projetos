import { useState, useEffect } from 'react';
import { listarTarefasDoProjeto, listarTrabalhadores, criarTarefa, atualizarStatusTarefa } from '../services/api';

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
      listarTarefasDoProjeto(projetoId)
        .then(dados => setTarefas(dados))
        .catch(erro => console.error("Erro ao carregar Kanban:", erro));
        
      // Busca os Colaboradores (Para o select da nova tarefa)
      listarTrabalhadores()
        .then(dados => setColaboradores(dados))
        .catch(erro => console.error("Erro ao carregar equipe:", erro));
    }
  }, [projetoId]);

  const criarNovaTarefa = (evento) => {
    evento.preventDefault();
    const novaTarefa = {
      titulo: titulo, 
      descricao: descricao, 
      projeto_id: parseInt(projetoId),
      trabalhador_id: parseInt(responsavelId),
      dias_uteis_esperados: parseInt(diasUteis) || 1,
      bloco_entrega: blocoEntrega.trim() === '' ? null : blocoEntrega,
      depende_de_id: null
    };

    criarTarefa(novaTarefa)
    .then(tarefaSalva => {
      setTarefas([...tarefas, tarefaSalva]);
      setTitulo(''); 
      setDescricao(''); 
      setResponsavelId(''); 
      setDiasUteis(1); 
      setBlocoEntrega('');
      setMostrarForm(false);
    })
    .catch(erro => {
      console.error("Erro na requisição:", erro);
      alert("Erro na validação ou erro interno! Olhe o console (F12).");
    });
  };

  const moverTarefa = (tarefaId, novoStatus) => {
    atualizarStatusTarefa(tarefaId, novoStatus)
      .then(tarefaAtualizada => {
        setTarefas(tarefas.map(t => t.id === tarefaId ? tarefaAtualizada : t));
      });
  };

  const tarefasTodo = tarefas.filter(t => t.coluna_status === 'TODO');
  const tarefasDoing = tarefas.filter(t => t.coluna_status === 'DOING');
  const tarefasDone = tarefas.filter(t => t.coluna_status === 'DONE');

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 700 }}>Quadro Operacional</h2>
        <button className={mostrarForm ? "btn btn-secondary" : "btn btn-primary"} onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? '✕ Cancelar' : '+ Nova Tarefa'}
        </button>
      </div>

      {mostrarForm && (
        <div className="form-container">
          <div className="ui-card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
            <form onSubmit={criarNovaTarefa} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-16)' }}>
              <div>
                <label className="field-label">Título</label>
                <input className="input-field" type="text" placeholder="Nome da tarefa" value={titulo} onChange={e => setTitulo(e.target.value)} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="field-label">Descrição</label>
                <input className="input-field" type="text" placeholder="O que precisa ser feito?" value={descricao} onChange={e => setDescricao(e.target.value)} required />
              </div>
              
              <div>
                <label className="field-label">Dias Úteis</label>
                <input className="input-field" type="number" min="1" placeholder="5" value={diasUteis} onChange={e => setDiasUteis(e.target.value)} required />
              </div>
              <div>
                <label className="field-label">Bloco de Entrega</label>
                <input className="input-field" type="text" placeholder="Ex: Fase 1" value={blocoEntrega} onChange={e => setBlocoEntrega(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Responsável</label>
                <select className="input-field" value={responsavelId} onChange={e => setResponsavelId(e.target.value)} required>
                  <option value="">Atribuir para...</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              
              <div style={{ gridColumn: 'span 3', textAlign: 'right', paddingTop: 'var(--sp-8)' }}>
                <button type="submit" className="btn btn-primary">Salvar no Quadro</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* KANBAN COLUNAS */}
      <div className="kanban-board">
        {[
          { titulo: 'A Fazer',       tarefas: tarefasTodo,  cor: 'var(--color-text-secondary)', next: 'DOING', nextLabel: 'Iniciar →' },
          { titulo: 'Em Andamento',  tarefas: tarefasDoing, cor: 'var(--color-accent)',          next: 'DONE',  nextLabel: 'Concluir ✓', prev: 'TODO' },
          { titulo: 'Concluído',     tarefas: tarefasDone,  cor: 'var(--color-success)',         prev: 'DOING', nextLabel: '← Reabrir' }
        ].map(coluna => (
          <div key={coluna.titulo} className="kanban-column" style={{ borderTopColor: coluna.cor }}>
            <h3>{coluna.titulo} ({coluna.tarefas.length})</h3>
            
            {coluna.tarefas.map(t => (
              <div key={t.id} className="ui-card kanban-card">
                
                {/* Mostrando o Bloco de Entrega (Se existir) */}
                {t.bloco_entrega && (
                  <span className="chip" style={{ backgroundColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)', fontSize: '10px', marginBottom: 'var(--sp-8)', display: 'inline-flex' }}>
                    📦 {t.bloco_entrega}
                  </span>
                )}
                
                <h4 style={{ fontSize: 'var(--text-h4)', fontWeight: 600, textDecoration: t.coluna_status === 'DONE' ? 'line-through' : 'none', opacity: t.coluna_status === 'DONE' ? 0.6 : 1 }}>{t.titulo}</h4>
                <p style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)', margin: 'var(--sp-8) 0', lineHeight: 1.5 }}>{t.descricao}</p>
                
                {/* Mostrando os Dias Úteis */}
                <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-accent)', fontWeight: 600, marginBottom: 'var(--sp-12)' }}>
                  ⏳ Prazo: {t.dias_uteis_esperados} dia(s) útil(eis)
                </p>

                <div style={{ display: 'flex', gap: 'var(--sp-8)' }}>
                  {coluna.prev && <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => moverTarefa(t.id, coluna.prev)}>← Voltar</button>}
                  {coluna.next && <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => moverTarefa(t.id, coluna.next)}>{coluna.nextLabel}</button>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}