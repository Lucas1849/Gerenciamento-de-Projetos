import { useState, useEffect } from 'react'
import "./App.css";
import FormularioColaborador from './components/FormularioColaborador'
import FormularioProjeto from './components/FormularioProjetos'
import Kanban from './components/Kanban'

function App() {
  // Criamos uma "caixa" (estado) no React para guardar os projetos que virão do banco
  // Defini a tela principal direto para a visualização dos projetos
  const [telaAtual, setTelaAtual] = useState('projetos'); 
  const [projetos, setProjetos] = useState([]);
  const [equipe, setEquipe] = useState([]);

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
    // Se um projeto foi clicado, mostra o Kanban dele
    if (projetoSelecionado) {
      return (
        <div>
          <button onClick={() => setProjetoSelecionado(null)} style={{ padding: '8px 15px', marginBottom: '20px', cursor: 'pointer' }}>
            ← Voltar para Galeria
          </button>
          <Kanban projetoId={projetoSelecionado} />
        </div>
      );
    }

 return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Galeria de Projetos</h2>
          {/* Aqui futuramente podemos colocar um botão bonito que abre um "Modal" para o Formulário */}
        </div>
        
        <FormularioProjeto />

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
              <button 
                onClick={() => setProjetoSelecionado(p.id)}
                style={{ marginTop: '20px', padding: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%' }}
              >
                Abrir Kanban
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderizarEquipe = () => {
    return (
      <div>
        <h2>Equipe Vigente</h2>
        <FormularioColaborador />

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

  // 3. A ESTRUTURA PRINCIPAL (Barra Lateral + Conteúdo)
  return (
    <div className="app-container">
      
      {/* BARRA LATERAL */}
      <aside className="sidebar">
        <h2>Painel de Consultoria</h2>
        <button 
          className={`menu-btn ${telaAtual === 'projetos' ? 'ativo' : ''}`}
          onClick={() => { setTelaAtual('projetos'); setProjetoSelecionado(null); }}
        >
          📁 Portfólio de Projetos
        </button>
        <button 
          className={`menu-btn ${telaAtual === 'equipe' ? 'ativo' : ''}`}
          onClick={() => { setTelaAtual('equipe'); setProjetoSelecionado(null); }}
        >
          👥 Equipe
        </button>
      </aside>

      {/* CONTEÚDO DINÂMICO */}
      <main className="main-content">
        {telaAtual === 'projetos' ? renderizarProjetos() : renderizarEquipe()}
      </main>

    </div>
  );
}

export default App;