import { useState, useEffect, useCallback } from 'react';
import './App.css';
import FormularioColaborador from './components/FormularioColaborador';
import FormularioProjeto from './components/FormularioProjetos';
import Kanban from './components/Kanban';
import PaginaProjeto from './components/PaginaProjeto';
import { useToast, ToastContainer } from './components/Toast';

// ─── Constantes ────────────────────────────────────────────────────────────────
const API = 'http://127.0.0.1:8000';

const TELAS = {
  PROJETOS: 'projetos',
  EQUIPE:   'equipe',
};

// ─── Hooks de dados ─────────────────────────────────────────────────────────────
function useDados() {
  const [projetos,  setProjetos]  = useState([]);
  const [equipe,    setEquipe]    = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro,      setErro]      = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [resProjetos, resEquipe] = await Promise.all([
        fetch(`${API}/projetos/`),
        fetch(`${API}/trabalhadores/`),
      ]);

      if (!resProjetos.ok || !resEquipe.ok) throw new Error('Falha ao carregar dados.');

      const [dadosProjetos, dadosEquipe] = await Promise.all([
        resProjetos.json(),
        resEquipe.json(),
      ]);

      setProjetos(dadosProjetos);
      setEquipe(dadosEquipe);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return { projetos, equipe, carregando, erro, recarregar: carregar };
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

function CardProjeto({ projeto, aoAbrir }) {
  const statusMap = {
    'Em andamento': 'chip-brand',
    'Concluído':    'chip-success',
    'Pausado':      'chip-warning',
    'Cancelado':    'chip-error',
  };
  const chipClasse = statusMap[projeto.status] ?? 'chip-brand';

  return (
    <div className="ui-card card-projeto">
      <div className="card-projeto-header">
        <span className={`chip ${chipClasse}`}>{projeto.status}</span>
        <span className="card-tipo">{projeto.tipo_servico}</span>
      </div>
      <h3 className="card-projeto-nome">{projeto.nome}</h3>
      <p className="card-projeto-desc">{projeto.descricao}</p>
      <div className="card-projeto-footer">
        <span className="card-contratante">🏢 {projeto.nome_contratante}</span>
        <button className="btn btn-primary btn-sm" onClick={() => aoAbrir(projeto.id)}>
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

// ─── Tela: Projetos ─────────────────────────────────────────────────────────────
function TelaProjetos({ projetos, carregando, erro, onRetry, onAbrirProjeto }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  if (erro)       return <EstadoErro mensagem={erro} onRetry={onRetry} />;
  if (carregando) return <Skeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">{projetos.length} projeto(s) cadastrado(s)</p>
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
          <FormularioProjeto toast={toast}/>
        </div>
      )}

      {projetos.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhum projeto cadastrado."
          acao={() => setMostrarForm(true)}
          rotulo="Criar primeiro projeto"
        />
      ) : (
        <div className="card-grid">
          {projetos.map(p => (
            <CardProjeto key={p.id} projeto={p} aoAbrir={onAbrirProjeto} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tela: Equipe ───────────────────────────────────────────────────────────────
function TelaEquipe({ equipe, carregando, erro, onRetry }) {
  const [mostrarForm, setMostrarForm] = useState(false);

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
    </div>
  );
}

// ─── App principal ──────────────────────────────────────────────────────────────
export default function App() {
  const [telaAtual,         setTelaAtual]         = useState(TELAS.PROJETOS);
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);

  const { projetos, equipe, carregando, erro, recarregar } = useDados();
  const { toasts, remover, toast } = useToast();

  function navegar(tela) {
    setTelaAtual(tela);
    setProjetoSelecionado(null);
  }

  function abrirProjeto(id) {
    setProjetoSelecionado(id);
  }

  const projetoAtual = projetoSelecionado
    ? projetos.find(p => p.id === projetoSelecionado) ?? null
    : null;

  function renderConteudo() {
    if (projetoAtual) {
      return (
        <PaginaProjeto
          projeto={projetoAtual}
          aoVoltar={() => setProjetoSelecionado(null)}
        />
      );
    }

    if (telaAtual === TELAS.PROJETOS) {
      return (
        <TelaProjetos
          projetos={projetos}
          carregando={carregando}
          erro={erro}
          onRetry={recarregar}
          onAbrirProjeto={abrirProjeto}
        />
      );
    }

    return (
      <TelaEquipe
        equipe={equipe}
        carregando={carregando}
        erro={erro}
        onRetry={recarregar}
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
            className={`menu-btn ${telaAtual === TELAS.PROJETOS && !projetoAtual ? 'ativo' : ''}`}
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