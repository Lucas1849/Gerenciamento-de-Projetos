// ─── Galeria de projetos da gestão (Fase 22, ADR-024) ───────────────────────
// Substitui o Kanban de fases (KanbanFases.jsx): os projetos viram cards em
// grid — 3 por linha no desktop — com a fase como badge no canto superior
// direito. Mover de fase migrou para o select da aba Visão Geral do projeto
// (PaginaProjeto.jsx); os chips acima do grid filtram por fase e preservam a
// leitura agregada que as colunas davam. O Kanban de ETAPAS não muda.

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { excluirProjeto } from '../services/api';
import { FASES } from './fases';
import AvatarIniciais from './AvatarIniciais';

const ORDEM_FASE = Object.fromEntries(FASES.map((f, i) => [f.valor, i]));
const FASE_POR_VALOR = new Map(FASES.map(f => [f.valor, f]));

export default function GaleriaProjetos({
  projetos, servicos = [], equipe = [],
  aoAbrirProjeto, aoNovoProjeto, aoRecarregar, toast,
}) {
  const [filtroFase, setFiltroFase] = useState(null); // null = todas

  const servicoPorId     = new Map(servicos.map(s => [s.id, s]));
  const trabalhadorPorId = new Map(equipe.map(t => [t.id, t]));

  const excluirProjetoLocal = (projeto) => {
    if (!window.confirm(`Excluir o projeto ${projeto.nome}? Isso apaga as etapas e o histórico de equipe. Não pode ser desfeito.`)) return;
    excluirProjeto(projeto.id)
      .then(() => {
        toast.success(`Projeto ${projeto.nome} excluído.`);
        aoRecarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao excluir o projeto.'));
  };

  // Ordem do funil (kickoff → concluído), nome dentro da fase.
  const ordenados = [...projetos].sort((a, b) =>
    (ORDEM_FASE[a.fase] ?? 99) - (ORDEM_FASE[b.fase] ?? 99) || a.nome.localeCompare(b.nome)
  );
  const visiveis = filtroFase ? ordenados.filter(p => p.fase === filtroFase) : ordenados;

  return (
    <div>
      {/* Chips de filtro por fase (leitura agregada que o Kanban dava) */}
      {projetos.length > 0 && (
      <div className="galeria-filtros">
        <button
          type="button"
          className={`filtro-fase ${filtroFase === null ? 'ativo' : ''}`}
          onClick={() => setFiltroFase(null)}
        >
          Todas <span className="kanban-count">{projetos.length}</span>
        </button>
        {FASES.map(fase => {
          const total = projetos.filter(p => p.fase === fase.valor).length;
          return (
            <button
              key={fase.valor}
              type="button"
              className={`filtro-fase ${filtroFase === fase.valor ? 'ativo' : ''}`}
              onClick={() => setFiltroFase(atual => (atual === fase.valor ? null : fase.valor))}
            >
              <span className="kanban-dot" style={{ backgroundColor: fase.cor }} />
              {fase.titulo} <span className="kanban-count">{total}</span>
            </button>
          );
        })}
      </div>
      )}

      <div className="galeria-projetos">
        {visiveis.map(p => {
          const fase = FASE_POR_VALOR.get(p.fase);
          const servico = servicoPorId.get(p.servico_id);
          const gerente = trabalhadorPorId.get(p.gerente_id);
          const consultores = p.equipe ?? [];

          return (
            <div
              key={p.id}
              className="ui-card kanban-card card-projeto-kanban"
              style={{ cursor: 'pointer' }}
              onClick={() => aoAbrirProjeto(p.id)}
            >
              <span className="kanban-card-faixa" style={{ background: fase?.cor }} aria-hidden="true" />
              <span className="badge-fase">
                <span className="kanban-dot" style={{ backgroundColor: fase?.cor }} />
                {fase?.titulo ?? p.fase}
              </span>
              <h4 className="kanban-card-titulo galeria-card-titulo">{p.nome}</h4>
              {servico && <div><span className="chip chip-servico">{servico.nome}</span></div>}

              {gerente && (
                <div className="card-gerente-bloco">
                  <AvatarIniciais nome={gerente.nome} tamanho={36} />
                  <div>
                    <div className="card-gerente-rotulo">Gerente</div>
                    <div className="card-gerente-nome">{gerente.nome}</div>
                  </div>
                </div>
              )}

              <div className="card-consultores-row">
                <span className="card-consultores-rotulo">Consultores</span>
                {consultores.length === 0 ? (
                  <span className="card-consultores-rotulo">—</span>
                ) : (
                  <span className="avatar-fileira">
                    {consultores.slice(0, 5).map(c => (
                      <AvatarIniciais key={c.id} nome={c.nome} tamanho={26} />
                    ))}
                    {consultores.length > 5 && (
                      <span className="card-consultores-rotulo" style={{ marginLeft: 'var(--sp-4)' }}>
                        +{consultores.length - 5}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="card-projeto-footer-acoes">
                <span className={`chip ${p.tap_assinado ? 'chip-success' : 'chip-warning'}`}>
                  TAP: {p.tap_assinado ? 'Assinado' : 'Pendente'}
                </span>
                <button
                  type="button"
                  className="btn-ghost-danger"
                  title="Excluir projeto"
                  aria-label={`Excluir o projeto ${p.nome}`}
                  onClick={e => { e.stopPropagation(); excluirProjetoLocal(p); }}
                >
                  <Trash2 size={15} /> Excluir
                </button>
              </div>
            </div>
          );
        })}

        {projetos.length > 0 && aoNovoProjeto && (
          <button type="button" className="kanban-ghost galeria-ghost" onClick={aoNovoProjeto}>
            <Plus size={16} /> Novo projeto
          </button>
        )}
      </div>

      {projetos.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <h3>Nenhum projeto nesta gestão</h3>
          <p style={{ fontSize: 'var(--text-body2)', marginBottom: 'var(--sp-16)' }}>
            Crie o primeiro projeto desta gestão.
          </p>
          {aoNovoProjeto && (
            <button type="button" className="btn btn-primary" onClick={aoNovoProjeto}>
              + Novo Projeto
            </button>
          )}
        </div>
      )}
    </div>
  );
}
