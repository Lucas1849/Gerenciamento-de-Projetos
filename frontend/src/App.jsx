import { useState, useEffect, useCallback } from 'react';
import './App.css';
import FormularioColaborador from './components/FormularioColaborador';
import FormularioProjeto from './components/FormularioProjetos';
import FormularioGestao from './components/FormularioGestao';
import FormularioProfessor from './components/FormularioProfessor';
import KanbanFases from './components/KanbanFases';
import PaginaProjeto from './components/PaginaProjeto';
import { useToast, ToastContainer } from './components/Toast';
import { listarProjetos, listarTrabalhadores, listarGestoes, listarProfessores } from './services/api';

const TELAS = {
  PROJETOS: 'projetos',
  EQUIPE:   'equipe',
};

// ─── Hooks de dados ─────────────────────────────────────────────────────────────
function useDados() {
  const [projetos,    setProjetos]    = useState([]);
  const [equipe,      setEquipe]      = useState([]);
  const [gestoes,     setGestoes]     = useState([]);
  const [professores, setProfessores] = useState([]);
  const [carregando,  setCarregando]  = useState(true);
  const [erro,        setErro]        = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [dadosProjetos, dadosEquipe, dadosGestoes, dadosProfessores] = await Promise.all([
        listarProjetos(),
        listarTrabalhadores(),
        listarGestoes(),
        listarProfessores(),
      ]);

      setProjetos(dadosProjetos);
      setEquipe(dadosEquipe);
      setGestoes(dadosGestoes);
      setProfessores(dadosProfessores);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return {
    projetos, equipe, gestoes, professores,
    carregando, erro,
    recarregar: carregar,
    atualizarProjetoLocal: (projetoAtualizado) =>
      setProjetos(prev => prev.map(p => (p.id === projetoAtualizado.id ? projetoAtualizado : p))),
  };
}

// ─── Componentes auxiliares ─────────────────────────────────────────────────────
function EstadoVazio({ mensagem, acao, rotulo }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📂</div>
      <h3>{mensagem}</h3>
      {acao && (
        <button className="btn btn-primary" style={{ marginTop: 'var(--sp-16)' }} onClick={acao}>
          {rotulo}
        </button>
      )}
    </div>
  );
}

function EstadoErro({ mensagem, onRetry }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">⚠️</div>
      <h3>Erro ao carregar</h3>
      <p style={{ fontSize: 'var(--text-body2)', marginBottom: 'var(--sp-16)' }}>{mensagem}</p>
      <button className="btn btn-secondary" onClick={onRetry}>Tentar novamente</button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="card-grid">
      {[1, 2, 3].map(i => (
        <div key={i} className="ui-card skeleton-card">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-short" />
        </div>
      ))}
    </div>
  );
}

function CardGestao({ gestao, totalProjetos, aoAbrir }) {
  return (
    <div className="ui-card card-projeto">
      <div className="card-projeto-header">
        <span className={`chip ${gestao.ativa ? 'chip-success' : 'chip-brand'}`}>
          {gestao.ativa ? 'Ativa' : 'Encerrada'}
        </span>
      </div>
      <h3 className="card-projeto-nome">{gestao.nome}</h3>
      <p className="card-projeto-desc">{totalProjetos} projeto(s) nesta gestão</p>
      <div className="card-projeto-footer">
        <span />
        <button className="btn btn-primary btn-sm" onClick={() => aoAbrir(gestao.id)}>
          Abrir →
        </button>
      </div>
    </div>
  );
}

function CardColaborador({ pessoa }) {
  return (
    <div className="ui-card card-colaborador">
      <div className="avatar">{pessoa.nome.charAt(0).toUpperCase()}</div>
      <div className="card-colaborador-info">
        <h3>{pessoa.nome}</h3>
        <p className="cargo">{pessoa.cargo}</p>
        <p className="email">📧 {pessoa.emailInstitucional}</p>
      </div>
    </div>
  );
}

function CardProfessor({ professor }) {
  return (
    <div className="ui-card card-colaborador">
      <div className="avatar">{professor.nome.charAt(0).toUpperCase()}</div>
      <div className="card-colaborador-info">
        <h3>{professor.nome}</h3>
        <p className="cargo">Professor Orientador</p>
        <p className="email">📧 {professor.email || 'Sem e-mail'}</p>
      </div>
    </div>
  );
}

// ─── Tela: Galeria de Gestões ───────────────────────────────────────────────────
function TelaGaleriaGestoes({ gestoes, projetos, carregando, erro, onRetry, onAbrirGestao, onRecarregar, toast }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  if (erro)       return <EstadoErro mensagem={erro} onRetry={onRetry} />;
  if (carregando) return <Skeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestões</h1>
          <p className="page-subtitle">{gestoes.length} gestão(ões) cadastrada(s)</p>
        </div>
        <button
          className={mostrarForm ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => setMostrarForm(v => !v)}
        >
          {mostrarForm ? '✕ Cancelar' : '+ Nova Gestão'}
        </button>
      </div>

      {mostrarForm && (
        <div className="form-container">
          <FormularioGestao
            toast={toast}
            aoCriar={() => { setMostrarForm(false); onRecarregar(); }}
          />
        </div>
      )}

      {gestoes.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhuma gestão cadastrada."
          acao={() => setMostrarForm(true)}
          rotulo="Criar primeira gestão"
        />
      ) : (
        <div className="card-grid">
          {gestoes.map(g => (
            <CardGestao
              key={g.id}
              gestao={g}
              totalProjetos={projetos.filter(p => p.gestao_id === g.id).length}
              aoAbrir={onAbrirGestao}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tela: Kanban de fases de uma Gestão ────────────────────────────────────────
function TelaGestao({ gestao, projetos, aoVoltar, onAbrirProjeto, onAtualizarProjeto, onRecarregar, toast }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  const projetosDaGestao = projetos.filter(p => p.gestao_id === gestao.id);

  return (
    <div>
      <button className="btn btn-secondary" onClick={aoVoltar} style={{ marginBottom: 'var(--sp-16)' }}>
        ← Voltar para Gestões
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Gestão {gestao.nome}</h1>
          <p className="page-subtitle">{projetosDaGestao.length} projeto(s) nesta gestão</p>
        </div>
        <button
          className={mostrarForm ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => setMostrarForm(v => !v)}
        >
          {mostrarForm ? '✕ Cancelar' : '+ Novo Projeto'}
        </button>
      </div>

      {mostrarForm && (
        <div className="form-container">
          <FormularioProjeto
            toast={toast}
            gestaoInicialId={gestao.id}
            aoCriar={() => { setMostrarForm(false); onRecarregar(); }}
          />
        </div>
      )}

      {projetosDaGestao.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhum projeto nesta gestão."
          acao={() => setMostrarForm(true)}
          rotulo="Criar primeiro projeto"
        />
      ) : (
        <KanbanFases
          projetos={projetosDaGestao}
          aoAbrirProjeto={onAbrirProjeto}
          aoAtualizarProjeto={onAtualizarProjeto}
          toast={toast}
        />
      )}
    </div>
  );
}

// ─── Tela: Equipe ───────────────────────────────────────────────────────────────
function TelaEquipe({ equipe, professores, carregando, erro, onRetry, onRecarregar, toast }) {
  const [mostrarForm,     setMostrarForm]     = useState(false);
  const [mostrarFormProf, setMostrarFormProf] = useState(false);

  if (erro)       return <EstadoErro mensagem={erro} onRetry={onRetry} />;
  if (carregando) return <Skeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipe</h1>
          <p className="page-subtitle">{equipe.length} colaborador(es) cadastrado(s)</p>
        </div>
        <button
          className={mostrarForm ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => setMostrarForm(v => !v)}
        >
          {mostrarForm ? '✕ Cancelar' : '+ Novo Colaborador'}
        </button>
      </div>

      {mostrarForm && (
        <div className="form-container">
          <FormularioColaborador toast={toast}/>
        </div>
      )}

      {equipe.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhum colaborador cadastrado."
          acao={() => setMostrarForm(true)}
          rotulo="Adicionar colaborador"
        />
      ) : (
        <div className="card-grid">
          {equipe.map(p => (
            <CardColaborador key={p.id} pessoa={p} />
          ))}
        </div>
      )}

      {/* Professores orientadores */}
      <div className="page-header" style={{ marginTop: 'var(--sp-32)' }}>
        <div>
          <h1 className="page-title">Professores Orientadores</h1>
          <p className="page-subtitle">{professores.length} professor(es) cadastrado(s)</p>
        </div>
        <button
          className={mostrarFormProf ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={() => setMostrarFormProf(v => !v)}
        >
          {mostrarFormProf ? '✕ Cancelar' : '+ Novo Professor'}
        </button>
      </div>

      {mostrarFormProf && (
        <div className="form-container">
          <FormularioProfessor
            toast={toast}
            aoCriar={() => { setMostrarFormProf(false); onRecarregar(); }}
          />
        </div>
      )}

      {professores.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhum professor cadastrado."
          acao={() => setMostrarFormProf(true)}
          rotulo="Adicionar professor"
        />
      ) : (
        <div className="card-grid">
          {professores.map(p => (
            <CardProfessor key={p.id} professor={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── App principal ──────────────────────────────────────────────────────────────
export default function App() {
  const [telaAtual,          setTelaAtual]          = useState(TELAS.PROJETOS);
  const [gestaoSelecionada,  setGestaoSelecionada]  = useState(null);
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);

  const {
    projetos, equipe, gestoes, professores,
    carregando, erro, recarregar, atualizarProjetoLocal,
  } = useDados();
  const { toasts, remover, toast } = useToast();

  function navegar(tela) {
    setTelaAtual(tela);
    setGestaoSelecionada(null);
    setProjetoSelecionado(null);
  }

  const gestaoAtual = gestaoSelecionada
    ? gestoes.find(g => g.id === gestaoSelecionada) ?? null
    : null;

  function renderConteudo() {
    // Nível 3: página do projeto
    if (projetoSelecionado) {
      return (
        <PaginaProjeto
          projetoId={projetoSelecionado}
          aoVoltar={() => { setProjetoSelecionado(null); recarregar(); }}
          toast={toast}
        />
      );
    }

    if (telaAtual === TELAS.PROJETOS) {
      // Nível 2: kanban de fases da gestão selecionada
      if (gestaoAtual) {
        return (
          <TelaGestao
            gestao={gestaoAtual}
            projetos={projetos}
            aoVoltar={() => setGestaoSelecionada(null)}
            onAbrirProjeto={setProjetoSelecionado}
            onAtualizarProjeto={atualizarProjetoLocal}
            onRecarregar={recarregar}
            toast={toast}
          />
        );
      }

      // Nível 1: galeria de gestões
      return (
        <TelaGaleriaGestoes
          gestoes={gestoes}
          projetos={projetos}
          carregando={carregando}
          erro={erro}
          onRetry={recarregar}
          onAbrirGestao={setGestaoSelecionada}
          onRecarregar={recarregar}
          toast={toast}
        />
      );
    }

    return (
      <TelaEquipe
        equipe={equipe}
        professores={professores}
        carregando={carregando}
        erro={erro}
        onRetry={recarregar}
        onRecarregar={recarregar}
        toast={toast}
      />
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          Apoio
          <span>Sistema de Gestão</span>
        </div>

        <nav>
          <button
            className={`menu-btn ${telaAtual === TELAS.PROJETOS && !projetoSelecionado ? 'ativo' : ''}`}
            onClick={() => navegar(TELAS.PROJETOS)}
          >
            📁 Projetos
          </button>
          <button
            className={`menu-btn ${telaAtual === TELAS.EQUIPE ? 'ativo' : ''}`}
            onClick={() => navegar(TELAS.EQUIPE)}
          >
            👥 Equipe
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {renderConteudo()}
      </main>
      <ToastContainer toasts={toasts} remover={remover} />
    </div>
  );
}
