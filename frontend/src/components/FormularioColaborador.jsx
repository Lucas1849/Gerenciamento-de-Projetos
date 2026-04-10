import { useState } from 'react';

export default function FormularioColaborador() {
  // Criamos 3 "caixinhas" para guardar o que o usuário digitar nos campos
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');

  // Esta função é chamada quando clicamos no botão "Salvar"
  const salvarColaborador = (evento) => {
    evento.preventDefault(); // Impede a página de recarregar (comportamento padrão do HTML)

    // Montamos o "pacote" exatamente como o nosso Schema do FastAPI exige
    const dadosParaEnviar = {
      nome: nome,
      cargo: cargo,
      emailInstitucional: email
    };

    // Fazemos o POST para o nosso servidor Python
    fetch('http://127.0.0.1:8000/trabalhadores/', {
      method: 'POST', // Avisamos que é um envio de dados
      headers: {
        'Content-Type': 'application/json' // Dizemos que estamos enviando no formato JSON
      },
      body: JSON.stringify(dadosParaEnviar) // Transformamos nosso pacote em texto para viajar pela rede
    })
    .then(resposta => resposta.json())
    .then(dados_salvos => {
      alert("Colaborador salvo com sucesso com o ID: " + dados_salvos.id);
      // Limpamos os campos do formulário para o próximo cadastro
      setNome('');
      setCargo('');
      setEmail('');
    })
    .catch(erro => console.error("Erro ao salvar:", erro));
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
      <h3>Cadastrar Novo Colaborador</h3>
      
      {/* O formulário aciona a nossa função salvarColaborador ao ser enviado */}
      <form onSubmit={salvarColaborador} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        
        <input 
          type="text" 
          placeholder="Nome completo" 
          value={nome}
          onChange={(e) => setNome(e.target.value)} // Atualiza a caixinha do nome
          required 
        />
        
        <input 
          type="text" 
          placeholder="Cargo (Ex: Assessor)" 
          value={cargo}
          onChange={(e) => setCargo(e.target.value)} 
          required 
        />
        
        <input 
          type="email" 
          placeholder="E-mail Institucional" 
          value={email}
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        
        <button type="submit" style={{ cursor: 'pointer', padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Salvar
        </button>
      </form>
    </div>
  );
}