import { useState, useEffect } from 'react';
 
const API = 'http://127.0.0.1:8000';
 
const CAMPO_VAZIO = {
  nome: '', descricao: '', tipoServico: '', objetivo: '',
  nomeContratante: '', agregadosContratante: '',
  kickoff: 'Não', tap: 'Não',
  gerenteId: '', consultor1Id: '', consultor2Id: '', consultor3Id: '',
};
 
export default function FormularioProjeto({ toast }) {
  const [campos,        setCampos]        = useState(CAMPO_VAZIO);
  const [colaboradores, setColaboradores] = useState([]);
  const [salvando,      setSalvando]      = useState(false);
 
  useEffect(() => {
    fetch(`${API}/trabalhadores/`)
      .then(res => res.json())
      .then(setColaboradores)
      .catch(() => toast.error('Erro ao carregar colaboradores.'));
  }, []);
 
  const set = (campo) => (e) => setCampos(prev => ({ ...prev, [campo]: e.target.value }));
 
  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch(`${API}/projetos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:                   campos.nome,
          descricao:              campos.descricao,
          tipo_servico:           campos.tipoServico,
          objetivo:               campos.objetivo,
          nome_contratante:       campos.nomeContratante,
          agregados_contratante:  campos.agregadosContratante,
          kickoff_realizado:      campos.kickoff,
          tap_assinado:           campos.tap,
          status:                 'Em andamento',
          gerente_id:             parseInt(campos.gerenteId),
          consultor1_id:          parseInt(campos.consultor1Id),
          consultor2_id:          parseInt(campos.consultor2Id),
          consultor3_id:          parseInt(campos.consultor3Id),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Projeto criado com sucesso!');
      setCampos(CAMPO_VAZIO);
    } catch {
      toast.error('Erro ao criar projeto.');
    } finally {
      setSalvando(false);
    }
  };
 
  const SelectColaborador = ({ label, campo }) => (
    <div>
      <label className="field-label">{label}</label>
      <select className="input-field" value={campos[campo]} onChange={set(campo)} required>
        <option value="">Selecione...</option>
        {colaboradores.map(c => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>
    </div>
  );
 
  return (
    <div className="ui-card" style={{ borderTop: `4px solid var(--color-brand)`, maxWidth: '900px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', color: 'var(--color-brand)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: 'var(--sp-16)', marginBottom: 'var(--sp-24)' }}>
        Cadastrar Novo Projeto
      </h3>
 
      <form onSubmit={salvar}>
 
        {/* Bloco 1 — Informações principais */}
        <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--sp-16)' }}>Informações Principais</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-16)', marginBottom: 'var(--sp-32)' }}>
          <div>
            <label className="field-label">Nome do Projeto</label>
            <input className="input-field" type="text" placeholder="Ex: Plano de Negócios 2024"
              value={campos.nome} onChange={set('nome')} required />
          </div>
          <div>
            <label className="field-label">Tipo de Serviço</label>
            <input className="input-field" type="text" placeholder="Ex: Pesquisa de Mercado"
              value={campos.tipoServico} onChange={set('tipoServico')} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label">Objetivo do Projeto</label>
            <textarea className="input-field" placeholder="Descreva o objetivo principal..."
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={campos.objetivo} onChange={set('objetivo')} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="field-label">Descrição Curta</label>
            <input className="input-field" type="text" placeholder="Uma frase que resuma o projeto"
              value={campos.descricao} onChange={set('descricao')} required />
          </div>
        </div>
 
        {/* Bloco 2 — Cliente e iniciação */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-32)', marginBottom: 'var(--sp-32)', backgroundColor: 'var(--color-background)', padding: 'var(--sp-24)', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--sp-16)' }}>Cliente / Contratante</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
              <div>
                <label className="field-label">Nome Principal</label>
                <input className="input-field" type="text" placeholder="Empresa ou Responsável"
                  value={campos.nomeContratante} onChange={set('nomeContratante')} required />
              </div>
              <div>
                <label className="field-label">Agregados (separados por vírgula)</label>
                <input className="input-field" type="text" placeholder="Ex: João (CEO), Maria (CFO)"
                  value={campos.agregadosContratante} onChange={set('agregadosContratante')} />
              </div>
            </div>
          </div>
 
          <div>
            <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--sp-16)' }}>Status de Iniciação</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-16)' }}>
              <div>
                <label className="field-label">Reunião de Kick-Off Realizada?</label>
                <select className="input-field" value={campos.kickoff} onChange={set('kickoff')}>
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
              <div>
                <label className="field-label">TAP Assinado pelo Cliente?</label>
                <select className="input-field" value={campos.tap} onChange={set('tap')}>
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
            </div>
          </div>
        </div>
 
        {/* Bloco 3 — Equipe */}
        <h4 style={{ fontSize: 'var(--text-h4)', marginBottom: 'var(--sp-16)' }}>Equipe Alocada</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-16)', marginBottom: 'var(--sp-32)' }}>
          <SelectColaborador label="Gerente"     campo="gerenteId"    />
          <SelectColaborador label="Consultor 1" campo="consultor1Id" />
          <SelectColaborador label="Consultor 2" campo="consultor2Id" />
          <SelectColaborador label="Consultor 3" campo="consultor3Id" />
        </div>
 
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--sp-24)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={salvando}
            style={{ padding: '12px 32px' }}>
            {salvando ? 'Criando...' : 'Criar Projeto'}
          </button>
        </div>
      </form>
    </div>
  );
}