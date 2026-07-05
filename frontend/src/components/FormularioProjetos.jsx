import { useState, useEffect } from 'react';
import {
  listarTrabalhadores,
  listarGestoes,
  listarProfessores,
  listarServicos,
  obterServico,
  criarProjeto,
} from '../services/api';

const CAMPO_VAZIO = {
  nome: '', descricao: '', objetivo: '',
  nomeContratante: '', agregadosContratante: '',
  tapAssinado: false,
  servicoId: '', gestaoId: '', diretorId: '', gerenteId: '', professorId: '',
};

export default function FormularioProjeto({ toast, gestaoInicialId, aoCriar }) {
  const [campos,        setCampos]        = useState({
    ...CAMPO_VAZIO,
    gestaoId: gestaoInicialId ? String(gestaoInicialId) : '',
  });
  const [colaboradores, setColaboradores] = useState([]);
  const [gestoes,       setGestoes]       = useState([]);
  const [professores,   setProfessores]   = useState([]);
  const [servicos,      setServicos]      = useState([]);
  const [etapasTemplate, setEtapasTemplate] = useState([]);
  const [consultoresIds, setConsultoresIds] = useState(['']);
  const [salvando,      setSalvando]      = useState(false);

  useEffect(() => {
    Promise.all([listarTrabalhadores(), listarGestoes(), listarProfessores(), listarServicos()])
      .then(([trab, gest, prof, serv]) => {
        setColaboradores(trab);
        setGestoes(gest);
        setProfessores(prof);
        setServicos(serv);
      })
      .catch(() => toast.error('Erro ao carregar dados do formulário.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao trocar o serviço, carrega as etapas-template para pré-visualização.
  useEffect(() => {
    if (!campos.servicoId) {
      setEtapasTemplate([]);
      return;
    }
    obterServico(campos.servicoId)
      .then(s => setEtapasTemplate(s.etapas_template ?? []))
      .catch(() => toast.error('Erro ao carregar as etapas do serviço.'));
  }, [campos.servicoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (campo) => (e) => setCampos(prev => ({ ...prev, [campo]: e.target.value }));

  const setConsultor = (indice) => (e) => {
    setConsultoresIds(prev => prev.map((v, i) => (i === indice ? e.target.value : v)));
  };

  const adicionarConsultor = () => setConsultoresIds(prev => [...prev, '']);
  const removerConsultor = (indice) =>
    setConsultoresIds(prev => prev.filter((_, i) => i !== indice));

  const salvar = async (e) => {
    e.preventDefault();
    const idsValidos = [...new Set(
      consultoresIds.filter(v => v !== '').map(v => parseInt(v))
    )];

    setSalvando(true);
    try {
      const projeto = await criarProjeto({
        nome:                     campos.nome,
        descricao:                campos.descricao || null,
        objetivo:                 campos.objetivo || null,
        nome_contratante:         campos.nomeContratante || null,
        agregados_contratante:    campos.agregadosContratante || null,
        tap_assinado:             campos.tapAssinado,
        servico_id:               parseInt(campos.servicoId),
        gestao_id:                parseInt(campos.gestaoId),
        diretor_id:               parseInt(campos.diretorId),
        gerente_id:               parseInt(campos.gerenteId),
        professor_orientador_id:  campos.professorId ? parseInt(campos.professorId) : null,
        consultores_iniciais_ids: idsValidos,
      });
      toast.success('Projeto criado com sucesso!');
      setCampos({ ...CAMPO_VAZIO, gestaoId: gestaoInicialId ? String(gestaoInicialId) : '' });
      setConsultoresIds(['']);
      if (aoCriar) aoCriar(projeto);
    } catch (erro) {
      toast.error(erro.message || 'Erro ao criar projeto.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="ui-card form-card">
      <h3 className="form-titulo">Cadastrar Novo Projeto</h3>

      <form onSubmit={salvar}>

        {/* Bloco 1 — Informações principais */}
        <h4 className="form-secao-titulo">Informações Principais</h4>
        <div className="form-grid-2">
          <div>
            <label className="field-label">Nome do Projeto</label>
            <input className="input-field" type="text" placeholder="Ex: Plano de Negócios 2026"
              value={campos.nome} onChange={set('nome')} required />
          </div>
          <div>
            <label className="field-label">Serviço</label>
            <select className="input-field" value={campos.servicoId} onChange={set('servicoId')} required>
              <option value="">Selecione o serviço...</option>
              {servicos.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-span-2">
            <label className="field-label">Objetivo do Projeto</label>
            <textarea className="input-field" placeholder="Descreva o objetivo principal..."
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={campos.objetivo} onChange={set('objetivo')} />
          </div>
          <div className="form-span-2">
            <label className="field-label">Descrição Curta</label>
            <input className="input-field" type="text" placeholder="Uma frase que resuma o projeto"
              value={campos.descricao} onChange={set('descricao')} />
          </div>
        </div>

        {/* Pré-visualização das etapas do serviço escolhido */}
        {etapasTemplate.length > 0 && (
          <div className="form-bloco">
            <span className="field-label">Etapas que serão geradas automaticamente</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-8)', marginTop: 'var(--sp-8)' }}>
              {[...etapasTemplate].sort((a, b) => a.ordem - b.ordem).map(et => (
                <span key={et.id} className="chip chip-brand">
                  {et.ordem}. {et.nome}
                  {et.dias_uteis_esperados_padrao != null && ` (${et.dias_uteis_esperados_padrao}d)`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bloco 2 — Cliente e iniciação */}
        <div className="form-bloco form-bloco-grid-2">
          <div>
            <h4 className="form-secao-titulo">Cliente / Contratante</h4>
            <div className="form-coluna">
              <div>
                <label className="field-label">Nome Principal</label>
                <input className="input-field" type="text" placeholder="Empresa ou Responsável"
                  value={campos.nomeContratante} onChange={set('nomeContratante')} />
              </div>
              <div>
                <label className="field-label">Agregados (separados por vírgula)</label>
                <input className="input-field" type="text" placeholder="Ex: João (CEO), Maria (CFO)"
                  value={campos.agregadosContratante} onChange={set('agregadosContratante')} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="form-secao-titulo">Ciclo e Iniciação</h4>
            <div className="form-coluna">
              <div>
                <label className="field-label">Gestão</label>
                <select className="input-field" value={campos.gestaoId} onChange={set('gestaoId')} required>
                  <option value="">Selecione a gestão...</option>
                  {gestoes.map(g => (
                    <option key={g.id} value={g.id}>{g.nome}{g.ativa ? ' (ativa)' : ''}</option>
                  ))}
                </select>
              </div>
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={campos.tapAssinado}
                  onChange={e => setCampos(prev => ({ ...prev, tapAssinado: e.target.checked }))}
                />
                TAP assinado pelo cliente
              </label>
            </div>
          </div>
        </div>

        {/* Bloco 3 — Equipe */}
        <h4 className="form-secao-titulo">Equipe Alocada</h4>
        <div className="form-grid-equipe">
          <div>
            <label className="field-label">Diretor</label>
            <select className="input-field" value={campos.diretorId} onChange={set('diretorId')} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Gerente</label>
            <select className="input-field" value={campos.gerenteId} onChange={set('gerenteId')} required>
              <option value="">Selecione...</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Professor Orientador (opcional)</label>
            <select className="input-field" value={campos.professorId} onChange={set('professorId')}>
              <option value="">Sem professor</option>
              {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Consultores iniciais — tamanho variável */}
        <div style={{ marginBottom: 'var(--sp-32)' }}>
          <label className="field-label">Consultores Iniciais (atribuídos a todas as etapas geradas)</label>
          <div className="form-coluna" style={{ gap: 'var(--sp-8)', marginTop: 'var(--sp-8)' }}>
            {consultoresIds.map((valor, i) => (
              <div key={i} className="form-linha">
                <select className="input-field" value={valor} onChange={setConsultor(i)} style={{ flex: 1 }}>
                  <option value="">Selecione um consultor...</option>
                  {colaboradores
                    .filter(c => valor === String(c.id) || !consultoresIds.includes(String(c.id)))
                    .map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {consultoresIds.length > 1 && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removerConsultor(i)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--sp-8)' }} onClick={adicionarConsultor}>
            + Adicionar consultor
          </button>
        </div>

        <div className="form-rodape">
          <button type="submit" className="btn btn-primary" disabled={salvando}
            style={{ padding: '12px 32px' }}>
            {salvando ? 'Criando...' : 'Criar Projeto'}
          </button>
        </div>
      </form>
    </div>
  );
}
