import { useState, useEffect, useCallback } from 'react';
import {
  Home, User, Users, MessageCircle, Building2, CalendarClock, Trophy,
  Briefcase, GraduationCap, CalendarDays, ClipboardList, LogOut,
  ChevronRight, Menu, Flame, Trash2,
} from 'lucide-react';
import './App.css';
import DocumentosImportantes from './components/DocumentosImportantes';
import ProfessoresOrientadores from './components/ProfessoresOrientadores';
import FormularioColaborador from './components/FormularioColaborador';
import FormularioProjeto from './components/FormularioProjetos';
import FormularioGestao from './components/FormularioGestao';
import KanbanFases from './components/KanbanFases';
import PaginaProjeto from './components/PaginaProjeto';
import AvatarIniciais from './components/AvatarIniciais';
import { useToast, ToastContainer } from './components/Toast';
import {
  listarProjetos, listarTrabalhadores, listarGestoes, listarProfessores, listarServicos,
  excluirGestao,
} from './services/api';

const TELAS = {
  PROJETOS: 'projetos',
  MEMBROS:  'membros',
};

// Usuário decorativo do shell: o piloto não tem autenticação; os dados reais
// virão do Apoio Hub quando houver integração (roadmap).
const USUARIO_DEMO = { nome: 'Lucas', streak: '0 semanas' };

// Sidebar réplica do Apoio Hub. Apenas Projetos e Membros são funcionais no
// piloto; os demais itens existem só na plataforma real (shell decorativo).
const ITENS_MENU_HUB = [
  { rotulo: 'Home',             Icone: Home },
  { rotulo: 'Meu Perfil',       Icone: User },
  { rotulo: 'Membros',          Icone: Users,         tela: TELAS.MEMBROS },
  { rotulo: 'Chat',             Icone: MessageCircle },
  { rotulo: 'Sede Agora',       Icone: Building2 },
  { rotulo: 'Escalas',          Icone: CalendarClock },
  { rotulo: 'Rankings',         Icone: Trophy },
  { rotulo: 'Projetos',         Icone: Briefcase,     tela: TELAS.PROJETOS },
  { rotulo: 'Academia',         Icone: GraduationCap },
  { rotulo: 'Agenda',           Icone: CalendarDays },
  { rotulo: 'Central de Forms', Icone: ClipboardList },
];

// ─── Hooks de dados ─────────────────────────────────────────────────────────────
function useDados() {
  const [projetos,    setProjetos]    = useState([]);
  const [equipe,      setEquipe]      = useState([]);
  const [gestoes,     setGestoes]     = useState([]);
  const [professores, setProfessores] = useState([]);
  const [servicos,    setServicos]    = useState([]);
  const [carregando,  setCarregando]  = useState(true);
  const [erro,        setErro]        = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [dadosProjetos, dadosEquipe, dadosGestoes, dadosProfessores, dadosServicos] = await Promise.all([
        listarProjetos(),
        listarTrabalhadores(),
        listarGestoes(),
        listarProfessores(),
        listarServicos(),
      ]);

      setProjetos(dadosProjetos);
      setEquipe(dadosEquipe);
      setGestoes(dadosGestoes);
      setProfessores(dadosProfessores);
      setServicos(dadosServicos);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return {
    projetos, equipe, gestoes, professores, servicos,
    carregando, erro,
    recarregar: carregar,
    atualizarProjetoLocal: (projetoAtualizado) =>
      setProjetos(prev => prev.map(p => (p.id === projetoAtualizado.id ? { ...p, ...projetoAtualizado } : p))),
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

function CardGestao({ gestao, totalProjetos, aoAbrir, aoExcluir }) {
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
        <button
          type="button"
          className="btn-ghost-danger"
          title="Excluir gestão"
          aria-label={`Excluir a gestão ${gestao.nome}`}
          onClick={() => aoExcluir(gestao)}
        >
          <Trash2 size={16} />
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => aoAbrir(gestao.id)}>
          Abrir →
        </button>
      </div>
    </div>
  );
}

function CardMembro({ nome, cargo, detalhe }) {
  return (
    <div className="ui-card card-membro">
      <AvatarIniciais nome={nome} tamanho={72} />
      <h3 className="card-membro-nome">{nome}</h3>
      {cargo && <p className="card-membro-cargo">{cargo}</p>}
      {detalhe && <p className="card-membro-detalhe">{detalhe}</p>}
    </div>
  );
}

// ─── Tela: Galeria de Gestões (entrada de "Projetos") ──────────────────────────
// Fase 18 (ADR-020, revisada): abas Gestões / Documentos importantes no nível
// da área. Estado local, não persistido (ADR-010).
function TelaGaleriaGestoes({ gestoes, projetos, carregando, erro, onRetry, onAbrirGestao, onRecarregar, toast }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('gestoes');

  if (erro)       return <EstadoErro mensagem={erro} onRetry={onRetry} />;
  if (carregando) return <Skeleton />;

  const excluirGestaoLocal = (gestao) => {
    if (!window.confirm(`Excluir a gestão ${gestao.nome}? Não pode ser desfeito.`)) return;
    excluirGestao(gestao.id)
      .then(() => {
        toast.success(`Gestão ${gestao.nome} excluída.`);
        onRecarregar();
      })
      .catch(erro => toast.error(
        erro.status === 409
          ? 'A gestão ainda tem projetos — exclua-os primeiro.'
          : erro.message || 'Erro ao excluir a gestão.'
      ));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icone"><Briefcase size={26} /></span>
            Projetos
          </h1>
          <p className="page-subtitle">Acompanhe o andamento dos projetos da Apoio</p>
        </div>
        {abaAtiva === 'gestoes' && (
          <button
            className={mostrarForm ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={() => setMostrarForm(v => !v)}
          >
            {mostrarForm ? '✕ Cancelar' : '+ Nova Gestão'}
          </button>
        )}
      </div>

      <div className="tabs-container">
        <div className={`tab ${abaAtiva === 'gestoes' ? 'active' : ''}`} onClick={() => setAbaAtiva('gestoes')}>
          Gestões
        </div>
        <div className={`tab ${abaAtiva === 'documentos' ? 'active' : ''}`} onClick={() => setAbaAtiva('documentos')}>
          Documentos importantes
        </div>
        <div className={`tab ${abaAtiva === 'professores' ? 'active' : ''}`} onClick={() => setAbaAtiva('professores')}>
          Professores orientadores
        </div>
      </div>

      {abaAtiva === 'documentos' && <DocumentosImportantes toast={toast} />}

      {/* Fase 20 (ADR-022): lugar canônico dos professores — o cadastro saiu
          da tela Membros. aoAlterar atualiza o select de orientador do
          formulário de projetos (professores vêm do useDados global). */}
      {abaAtiva === 'professores' && (
        <ProfessoresOrientadores toast={toast} aoAlterar={onRecarregar} />
      )}

      {abaAtiva === 'gestoes' && (
        <>
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
                  aoExcluir={excluirGestaoLocal}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tela: Kanban de fases de uma Gestão ────────────────────────────────────────
function TelaGestao({ gestao, projetos, servicos, equipe, aoVoltar, onAbrirProjeto, onAtualizarProjeto, onRecarregar, toast }) {
  const [mostrarForm, setMostrarForm] = useState(false);

  const projetosDaGestao = projetos.filter(p => p.gestao_id === gestao.id);

  return (
    <div>
      <button className="btn btn-secondary" onClick={aoVoltar} style={{ marginBottom: 'var(--sp-16)' }}>
        ← Voltar para Gestões
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icone"><Briefcase size={26} /></span>
            Gestão {gestao.nome}
          </h1>
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

      <KanbanFases
        projetos={projetosDaGestao}
        servicos={servicos}
        equipe={equipe}
        aoAbrirProjeto={onAbrirProjeto}
        aoAtualizarProjeto={onAtualizarProjeto}
        aoNovoProjeto={() => setMostrarForm(true)}
        aoRecarregar={onRecarregar}
        toast={toast}
      />
    </div>
  );
}

// ─── Tela: Membros (equipe ativa; cadastro provisório de testes) ────────────────
// Fase 20 (ADR-022): o cadastro/grid de professores saiu daqui — a aba
// "Professores orientadores" da galeria é o lugar canônico.
function TelaMembros({ equipe, carregando, erro, onRetry, toast }) {
  // O cadastro abaixo é provisório: no Apoio Hub real os membros já existem;
  // remover quando o piloto tiver acesso às tabelas do Hub (roadmap).
  const [mostrarForm, setMostrarForm] = useState(false);

  if (erro)       return <EstadoErro mensagem={erro} onRetry={onRetry} />;
  if (carregando) return <Skeleton />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="page-title-icone"><Users size={26} /></span>
            Membros
          </h1>
          <p className="page-subtitle">Equipe da Apoio Consultoria Júnior</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setMostrarForm(v => !v)}
        >
          {mostrarForm ? '✕ Cancelar' : '+ Cadastrar membro'}
        </button>
      </div>

      {mostrarForm && (
        <div className="form-container">
          <FormularioColaborador toast={toast} />
        </div>
      )}

      {equipe.length === 0 ? (
        <EstadoVazio
          mensagem="Nenhum membro cadastrado."
          acao={() => setMostrarForm(true)}
          rotulo="Cadastrar membro"
        />
      ) : (
        <div className="membros-grid">
          {equipe.map(p => (
            <CardMembro key={p.id} nome={p.nome} cargo={p.cargo} detalhe={p.emailInstitucional} />
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
  const [menuAberto,         setMenuAberto]         = useState(false);

  const {
    projetos, equipe, gestoes, servicos,
    carregando, erro, recarregar, atualizarProjetoLocal,
  } = useDados();
  const { toasts, remover, toast } = useToast();

  function navegar(tela) {
    setTelaAtual(tela);
    setGestaoSelecionada(null);
    setProjetoSelecionado(null);
    setMenuAberto(false);
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
            servicos={servicos}
            equipe={equipe}
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
      <TelaMembros
        equipe={equipe}
        carregando={carregando}
        erro={erro}
        onRetry={recarregar}
        toast={toast}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Topbar visível só no mobile (abre o drawer) */}
      <header className="topbar">
        <button
          type="button"
          className="topbar-hamburger"
          aria-label="Abrir menu"
          onClick={() => setMenuAberto(true)}
        >
          <Menu size={22} />
        </button>
        <span className="topbar-titulo">Apoio Hub</span>
      </header>

      {menuAberto && <div className="sidebar-overlay" onClick={() => setMenuAberto(false)} />}

      <aside className={`sidebar ${menuAberto ? 'aberta' : ''}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-icone">A</span>
          <div className="sidebar-logo-textos">
            <div className="sidebar-logo-nome">Apoio Hub</div>
            <div className="sidebar-logo-sub">Apoio Consultoria Júnior · EJ</div>
          </div>
        </div>

        <div className="sidebar-user">
          <AvatarIniciais nome={USUARIO_DEMO.nome} tamanho={40} />
          <div className="sidebar-user-textos">
            <div className="sidebar-user-nome">{USUARIO_DEMO.nome}</div>
            <div className="sidebar-user-detalhe">
              <Flame size={12} color="var(--color-warning)" /> {USUARIO_DEMO.streak}
            </div>
          </div>
        </div>

        <nav>
          {ITENS_MENU_HUB.map(item => {
            const { rotulo, Icone, tela } = item;
            const funcional = tela != null;
            const ativo = funcional && telaAtual === tela;
            return (
              <button
                key={rotulo}
                className={`menu-btn ${ativo ? 'ativo' : ''}`}
                aria-disabled={!funcional}
                onClick={funcional ? () => navegar(tela) : undefined}
              >
                <span className="menu-icone"><Icone size={18} /></span>
                <span className="menu-rotulo">{rotulo}</span>
                {ativo && <span className="menu-chevron"><ChevronRight size={16} /></span>}
              </button>
            );
          })}
        </nav>

        <button className="menu-btn menu-sair" aria-disabled="true">
          <span className="menu-icone"><LogOut size={18} /></span>
          <span className="menu-rotulo">Sair</span>
        </button>
      </aside>

      <main className="main-content">
        {renderConteudo()}
      </main>
      <ToastContainer toasts={toasts} remover={remover} />
    </div>
  );
}
