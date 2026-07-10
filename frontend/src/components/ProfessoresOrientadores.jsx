// ─── Aba "Professores orientadores" da galeria de gestões (Fase 20, ADR-022) ─
// Recurso da ÁREA (como os Documentos importantes): tabela de consulta com
// nome, serviço de interesse (TEXTO LIVRE — decisão do responsável em
// 09/07/2026, não é FK ao catálogo), contato e observações. Lugar canônico de
// cadastro/consulta de professores (o scaffolding da tela Membros saiu).
// Editar existe (PUT — contato/observações evoluem); excluir devolve 409
// quando o professor orienta algum projeto.

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import {
  listarProfessores, criarProfessor, atualizarProfessor, excluirProfessor,
} from '../services/api';

const CAMPOS_VAZIOS = { nome: '', email: '', servico_interesse: '', interesse_orientar: '', contato: '', observacoes: '' };

// interesse_orientar (Fase 21, ADR-023) tri-estado: true/false/null no
// backend ↔ 'sim'/'nao'/'' nos selects.
const interesseParaSelect = (valor) => (valor === true ? 'sim' : valor === false ? 'nao' : '');
const interesseParaApi = (valor) => (valor === 'sim' ? true : valor === 'nao' ? false : null);

function ChipInteresse({ valor }) {
  if (valor === true) return <span className="chip chip-success">Sim</span>;
  if (valor === false) return <span className="chip chip-warning">Não</span>;
  return '—';
}

const OPCOES_INTERESSE = [
  ['', 'Sem resposta'],
  ['sim', 'Sim'],
  ['nao', 'Não'],
];

export default function ProfessoresOrientadores({ toast, aoAlterar }) {
  const [professores, setProfessores] = useState([]);
  const [novo, setNovo] = useState(null);        // campos do form de adição
  const [edicao, setEdicao] = useState(null);    // { id, ...campos } da linha em edição
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(() => {
    listarProfessores()
      .then(setProfessores)
      .catch(() => toast.error('Erro ao carregar os professores.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  const aposMutacao = () => { recarregar(); aoAlterar?.(); };

  const adicionar = async () => {
    setSalvando(true);
    try {
      await criarProfessor({ ...novo, interesse_orientar: interesseParaApi(novo.interesse_orientar) });
      toast.success('Professor cadastrado.');
      setNovo(null);
      aposMutacao();
    } catch (erro) {
      toast.error(erro.message || 'Erro ao cadastrar o professor.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicao = async () => {
    setSalvando(true);
    try {
      const { id, ...campos } = edicao;
      await atualizarProfessor(id, {
        nome: campos.nome,
        email: campos.email || null,
        servico_interesse: campos.servico_interesse || null,
        interesse_orientar: interesseParaApi(campos.interesse_orientar),
        contato: campos.contato || null,
        observacoes: campos.observacoes || null,
      });
      toast.success('Professor atualizado.');
      setEdicao(null);
      aposMutacao();
    } catch (erro) {
      toast.error(erro.message || 'Erro ao atualizar o professor.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = (prof) => {
    if (!window.confirm(`Excluir o professor ${prof.nome}? Não pode ser desfeito.`)) return;
    excluirProfessor(prof.id)
      .then(() => { toast.success('Professor excluído.'); aposMutacao(); })
      .catch(erro => toast.error(
        erro.status === 409
          ? (erro.message || 'O professor orienta projetos e não pode ser excluído.')
          : erro.message || 'Erro ao excluir o professor.'
      ));
  };

  const celulaEdicao = (campo, placeholder) => (
    <td>
      <input
        className="input-field tabela-status"
        type="text"
        value={edicao[campo]}
        placeholder={placeholder}
        onChange={e => setEdicao(prev => ({ ...prev, [campo]: e.target.value }))}
      />
    </td>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-16)' }}>
        {novo === null && (
          <button type="button" className="btn btn-primary" onClick={() => { setNovo(CAMPOS_VAZIOS); setEdicao(null); }}>
            <Plus size={15} /> Adicionar professor
          </button>
        )}
      </div>

      {novo !== null && (
        <div className="form-container" style={{ marginBottom: 'var(--sp-24)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-8)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              ['nome', 'Nome *', 'Ex.: Prof. João Silva'],
              ['servico_interesse', 'Serviço de interesse', 'Ex.: Pesquisa de Mercado'],
              ['interesse_orientar', 'Interesse em orientar', ''],
              ['email', 'E-mail', 'joao@universidade.br'],
              ['contato', 'Contato', 'Telefone/WhatsApp'],
              ['observacoes', 'Observações', ''],
            ].map(([campo, rotulo, placeholder]) => (
              <label key={campo} style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', flex: '1 1 160px' }}>
                {rotulo}
                {campo === 'interesse_orientar' ? (
                  <select className="input-field" value={novo[campo]}
                    onChange={e => setNovo(prev => ({ ...prev, [campo]: e.target.value }))}>
                    {OPCOES_INTERESSE.map(([valor, texto]) => (
                      <option key={valor} value={valor}>{texto}</option>
                    ))}
                  </select>
                ) : (
                  <input className="input-field" type="text" value={novo[campo]} placeholder={placeholder}
                    onChange={e => setNovo(prev => ({ ...prev, [campo]: e.target.value }))} />
                )}
              </label>
            ))}
            <div style={{ display: 'flex', gap: 'var(--sp-8)' }}>
              <button type="button" className="btn btn-primary" disabled={salvando || !novo.nome.trim()} onClick={adicionar}>
                {salvando ? 'Salvando...' : 'Cadastrar'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setNovo(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {professores.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎓</div>
          <h3>Nenhum professor cadastrado</h3>
          <p style={{ fontSize: 'var(--text-body2)' }}>
            Cadastre os professores orientadores da área com serviço de interesse e contato.
          </p>
        </div>
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela-etapas">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Serviço de interesse</th>
                <th>Interesse em orientar</th>
                <th>E-mail</th>
                <th>Contato</th>
                <th>Observações</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {professores.map(p => (
                edicao?.id === p.id ? (
                  <tr key={p.id}>
                    {celulaEdicao('nome', 'Nome')}
                    {celulaEdicao('servico_interesse', 'Serviço de interesse')}
                    <td>
                      <select
                        className="input-field tabela-status"
                        value={edicao.interesse_orientar}
                        aria-label="Interesse em orientar"
                        onChange={e => setEdicao(prev => ({ ...prev, interesse_orientar: e.target.value }))}
                      >
                        {OPCOES_INTERESSE.map(([valor, texto]) => (
                          <option key={valor} value={valor}>{texto}</option>
                        ))}
                      </select>
                    </td>
                    {celulaEdicao('email', 'E-mail')}
                    {celulaEdicao('contato', 'Contato')}
                    {celulaEdicao('observacoes', 'Observações')}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-primary btn-sm" disabled={salvando || !edicao.nome.trim()}
                        title="Salvar" aria-label={`Salvar edição de ${p.nome}`} onClick={salvarEdicao}>
                        <Check size={14} />
                      </button>{' '}
                      <button type="button" className="btn btn-secondary btn-sm"
                        title="Cancelar" aria-label="Cancelar edição" onClick={() => setEdicao(null)}>
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td className="tabela-nome">{p.nome}</td>
                    <td>{p.servico_interesse || '—'}</td>
                    <td><ChipInteresse valor={p.interesse_orientar} /></td>
                    <td>{p.email || '—'}</td>
                    <td>{p.contato || '—'}</td>
                    <td>{p.observacoes || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        title="Editar professor"
                        aria-label={`Editar ${p.nome}`}
                        style={{ background: 'none', border: 'none', padding: 'var(--sp-4)', cursor: 'pointer', color: 'var(--color-text-disabled)' }}
                        onClick={() => {
                          setNovo(null);
                          setEdicao({
                            id: p.id,
                            nome: p.nome,
                            email: p.email ?? '',
                            servico_interesse: p.servico_interesse ?? '',
                            interesse_orientar: interesseParaSelect(p.interesse_orientar),
                            contato: p.contato ?? '',
                            observacoes: p.observacoes ?? '',
                          });
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost-danger"
                        title="Excluir professor"
                        aria-label={`Excluir ${p.nome}`}
                        onClick={() => excluir(p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
