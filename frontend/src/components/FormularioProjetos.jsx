import { useState, useEffect } from 'react';

export default function FormularioProjeto() {
  const [colaboradores, setColaboradores] = useState([]);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [gerenteId, setGerenteId] = useState('');
  const [consultor1Id, setConsultor1Id] = useState('');
  const [consultor2Id, setConsultor2Id] = useState('');
  const [consultor3Id, setConsultor3Id] = useState('');
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
      nome, descricao, tipo_servico: tipoServico, objetivo,
      nome_contratante: nomeContratante, agregados_contratante: agregadosContratante,
      kickoff_realizado: kickoff, tap_assinado: tap,
      status: "Em andamento",
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
    .then(() => {
      alert("Projeto criado com sucesso!");
      setNome(''); setDescricao(''); setTipoServico(''); setObjetivo(''); 
      setNomeContratante(''); setAgregadosContratante('');
      setKickoff('Não'); setTap('Não');
    });
  };

  // Um pequeno estilo local para as labels ficarem padronizadas e bonitas
  const LabelComponent = ({ children }) => (
    <label style={{ display: 'block', marginBottom: 'var(--sp-4)', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
      {children}
    </label>
  );

  return (
    <div className="ui-card" style={{ borderTop: '4px solid var(--primary)', maxWidth: '900px', margin: '0 auto' }}>
      <h3 style={{ color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-16)', marginBottom: 'var(--sp-24)' }}>
        📝 Cadastrar Novo Projeto
      </h3>
      
      <form onSubmit={salvarProjeto}>
        
        {/* BLOCO 1: Informações Base */}
        <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--sp-16)' }}>Informações Principais</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-16)', marginBottom: 'var(--sp-32)' }}>
          <div>
            <LabelComponent>Nome do Projeto</LabelComponent>
            <input className="input-field" type="text" placeholder="Ex: Plano de Negócios 2024" value={nome} onChange={e => setNome(e.target.value)} required />
          </div>
          <div>
            <LabelComponent>Tipo de Serviço</LabelComponent>
            <input className="input-field" type="text" placeholder="Ex: Pesquisa de Mercado" value={tipoServico} onChange={e => setTipoServico(e.target.value)} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <LabelComponent>Objetivo do Projeto</LabelComponent>
            <textarea className="input-field" placeholder="Descreva o objetivo principal..." style={{ minHeight: '80px', resize: 'vertical' }} value={objetivo} onChange={e => setObjetivo(e.target.value)} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <LabelComponent>Descrição Curta</LabelComponent>
            <input className="input-field" type="text" placeholder="Uma frase que resuma o projeto" value={descricao} onChange={e => setDescricao(e.target.value)} required />
          </div>
        </div>

        {/* BLOCO 2: Cliente e Iniciação */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-32)', marginBottom: 'var(--sp-32)', backgroundColor: 'var(--background)', padding: 'var(--sp-24)', borderRadius: 'var(--rad-md)' }}>
          
          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--sp-16)' }}>Cliente / Contratante</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
              <div>
                <LabelComponent>Nome Principal</LabelComponent>
                <input className="input-field" type="text" placeholder="Empresa ou Responsável" value={nomeContratante} onChange={e => setNomeContratante(e.target.value)} required />
              </div>
              <div>
                <LabelComponent>Agregados (Separados por vírgula)</LabelComponent>
                <input className="input-field" type="text" placeholder="Ex: João (CEO), Maria (CFO)" value={agregadosContratante} onChange={e => setAgregadosContratante(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--sp-16)' }}>Status de Iniciação</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
              <div>
                <LabelComponent>Reunião de Kick-Off Realizada?</LabelComponent>
                <select className="input-field" value={kickoff} onChange={e => setKickoff(e.target.value)}>
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
              <div>
                <LabelComponent>TAP Assinado pelo Cliente?</LabelComponent>
                <select className="input-field" value={tap} onChange={e => setTap(e.target.value)}>
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* BLOCO 3: Equipe */}
        <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--sp-16)' }}>Equipe Alocada</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-16)', marginBottom: 'var(--sp-32)' }}>
          <div>
            <LabelComponent>Gerente</LabelComponent>
            <select className="input-field" value={gerenteId} onChange={e => setGerenteId(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <LabelComponent>Consultor 1</LabelComponent>
            <select className="input-field" value={consultor1Id} onChange={e => setConsultor1Id(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <LabelComponent>Consultor 2</LabelComponent>
            <select className="input-field" value={consultor2Id} onChange={e => setConsultor2Id(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <LabelComponent>Consultor 3</LabelComponent>
            <select className="input-field" value={consultor3Id} onChange={e => setConsultor3Id(e.target.value)} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-24)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '1rem' }}>
            Criar Projeto
          </button>
        </div>
      </form>
    </div>
  );
}