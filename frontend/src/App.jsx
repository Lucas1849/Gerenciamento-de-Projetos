import { useState, useEffect } from 'react'
import "./App.css";
import FormularioColaborador from './components/FormularioColaborador'
import FormularioProjeto from './components/FormularioProjetos'
import Kanban from './components/Kanban'
import PaginaProjeto from './components/PaginaProjeto';

function App() {
  // Criamos uma "caixa" (estado) no React para guardar os projetos que virão do banco
  // Defini a tela principal direto para a visualização dos projetos
  const [telaAtual, setTelaAtual] = useState('projetos'); 
  const [projetos, setProjetos] = useState([]);
  const [equipe, setEquipe] = useState([]);

  // Método para ocultar o formulário enquanto não clicarmos no botão
  const [mostrarFormProjeto, setMostrarFormProjeto] = useState(false);
  const [mostrarFormEquipe, setMostrarFormEquipe] = useState(false);

  // Caixa para saber em qual projeto o usuário clicou
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);


  // O useEffect é uma função que roda automaticamente assim que a tela abre
  // Faz a busca dos cadastros de projetos e equipe presentes 
  useEffect(() => {
    fetch('http://127.0.0.1:8000/projetos/').then(res => res.json()).then(setProjetos);
    fetch('http://127.0.0.1:8000/trabalhadores/').then(res => res.json()).then(setEquipe);
  }, []);

  // 2. FUNÇÕES DE RENDERIZAÇÃO (O que mostrar em cada tela)
 const renderizarProjetos = () => {
   if (projetoSelecionado) {
      // Procuramos o objeto completo do projeto na nossa lista
      const projeto = projetos.find(p => p.id === projetoSelecionado);
      
      return (
        <PaginaProjeto 
            projeto={projeto} 
            aoVoltar={() => setProjetoSelecionado(null)} 
        />
      );
    }
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Galeria de Projetos</h2>
          
          {/* BOTÃO PARA MOSTRAR/ESCONDER O FORMULÁRIO */}
          <button 
            className="btn-adicionar" 
            onClick={() => setMostrarFormProjeto(!mostrarFormProjeto)}
          >
            {mostrarFormProjeto ? '✕ Cancelar Cadastro' : '➕ Novo Projeto'}
          </button>
        </div>
        
        {/* RENDERIZAÇÃO CONDICIONAL: Só desenha o form se a variável for "true" */}
        {mostrarFormProjeto && (
          <div className="form-container">
            <FormularioProjeto />
          </div>
        )}

        <div className="card-grid">
          {projetos.map(p => (
            <div key={p.id} className="card">
              <div>
                <h3 style={{ marginBottom: '10px', color: '#004080' }}>{p.nome}</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>{p.descricao}</p>
                <span style={{ backgroundColor: '#e6f2ff', color: '#0059b3', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  {p.status}
                </span>
              </div>
              <button onClick={() => setProjetoSelecionado(p.id)} style={{ marginTop: '20px', padding: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}>
                Abrir Kanban
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- TELA DA EQUIPE ---
  const renderizarEquipe = () => {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Equipe Vigente</h2>
          
          {/* BOTÃO PARA MOSTRAR/ESCONDER O FORMULÁRIO */}
          <button 
            className="btn-adicionar" 
            onClick={() => setMostrarFormEquipe(!mostrarFormEquipe)}
          >
            {mostrarFormEquipe ? '✕ Cancelar Cadastro' : '➕ Novo Colaborador'}
          </button>
        </div>

        {/* RENDERIZAÇÃO CONDICIONAL */}
        {mostrarFormEquipe && (
          <div className="form-container">
            <FormularioColaborador />
          </div>
        )}

        <div className="card-grid">
          {equipe.map(pessoa => (
            <div key={pessoa.id} className="card" style={{ borderTopColor: '#28a745' }}>
              <h3 style={{ marginBottom: '5px' }}>{pessoa.nome}</h3>
              <p style={{ color: '#555', fontWeight: 'bold' }}>{pessoa.cargo}</p>
              <p style={{ fontSize: '14px', color: '#777', marginTop: '10px' }}>📧 {pessoa.emailInstitucional}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Painel de Consultoria</h2>
        <button className={`menu-btn ${telaAtual === 'projetos' ? 'ativo' : ''}`} onClick={() => { setTelaAtual('projetos'); setProjetoSelecionado(null); }}>
          📁 Portfólio
        </button>
        <button className={`menu-btn ${telaAtual === 'equipe' ? 'ativo' : ''}`} onClick={() => { setTelaAtual('equipe'); setProjetoSelecionado(null); }}>
          👥 Equipe
        </button>
      </aside>

      <main className="main-content">
        {telaAtual === 'projetos' ? renderizarProjetos() : renderizarEquipe()}
      </main>
    </div>
  );
}

export default App;