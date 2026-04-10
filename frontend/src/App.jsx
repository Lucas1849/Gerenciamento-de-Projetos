import { useState, useEffect } from 'react'
import FormularioColaborador from './components/FormularioColaborador'
import FormularioProjeto from './components/FormularioProjetos'
import Kanban from './components/Kanban'

function App() {
  // Criamos uma "caixa" (estado) no React para guardar os projetos que virão do banco
  const [projetos, setProjetos] = useState([])

  // Caixa para saber em qual projeto o usuário clicou
  const [projetoSelecionado, setProjetoSelecionado] = useState(null)

  // O useEffect é uma função que roda automaticamente assim que a tela abre
  useEffect(() => {
    // É AQUI QUE TESTAMOS O CORS! 
    // O React (5173) está batendo na porta do FastAPI (8000) pedindo um GET
    fetch('http://127.0.0.1:8000/projetos/')
      .then(resposta => resposta.json()) // Transforma a resposta em um formato que o JavaScript entende
      .then(dados => {
        console.log("Sucesso! Dados recebidos do backend:", dados);
        setProjetos(dados); // Guarda os dados na nossa "caixa"
      })
      .catch(erro => {
        console.error("Ops! Tivemos um erro de comunicação ou de CORS:", erro);
      })
  }, []) // Os colchetes vazios significam: "faça isso apenas uma vez ao carregar a página"

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Piloto: Sistema de Projetos</h1>

      {/*Formulários */}
      <div style={{ display: 'flex', gap: '20px' }}>
      <FormularioProjeto />
      <FormularioColaborador />
      </div>

      <h2 style={{ marginTop: '40px' }}>Meus Projetos Cadastrados:</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {projetos.map(projeto => (
          <li key={projeto.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
            <strong>{projeto.nome}</strong> — Status: {projeto.status}
            
            {/* 3. Botão para abrir o Kanban deste projeto */}
            <button 
              onClick={() => setProjetoSelecionado(projeto.id)}
              style={{ marginLeft: '15px', padding: '5px 10px', cursor: 'pointer' }}
            >
              Abrir Quadro Kanban
            </button>
          </li>
        ))}
      </ul>

      {/*Esclarecer que só deve mostrar um kanban se um projeto for selecionado*/}
      {projetoSelecionado && (
        <Kanban projetoId={projetoSelecionado} />
      )}
      
      {projetos.length === 0 && (
        <p>Nenhum projeto encontrado.</p>
      )}
    </div>
  )
}

export default App