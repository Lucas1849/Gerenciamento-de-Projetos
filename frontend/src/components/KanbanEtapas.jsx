import { useState, useEffect } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link2 } from 'lucide-react';
import ModalBloco from './ModalBloco';
import {
  listarEtapasDoProjeto,
  listarTrabalhadores,
  atualizarStatusEtapa,
  adicionarConsultorEtapa,
  removerConsultorEtapa,
  criarBloco,
  desfazerBloco,
} from '../services/api';

// Datas vêm prontas do backend (data_fim é derivada lá); aqui só formata.
const formatarData = (iso) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso));

const COLUNAS = [
  { status: 'nao_iniciada', titulo: 'Não Iniciada', cor: 'var(--color-text-secondary)' },
  { status: 'em_andamento', titulo: 'Em Andamento', cor: 'var(--fase-andamento)' },
  { status: 'concluida',    titulo: 'Concluída',     cor: 'var(--fase-concluido)' },
];

// Fluxo do Kanban interno; usado tanto nos cards avulsos quanto por membro
// de bloco (status individual por etapa — ADR-009).
const FLUXO = {
  nao_iniciada: { next: 'em_andamento', nextLabel: 'Iniciar →' },
  em_andamento: { prev: 'nao_iniciada', next: 'concluida', nextLabel: 'Concluir ✓' },
  concluida:    { prev: 'em_andamento' },
};

const RANK = { nao_iniciada: 0, em_andamento: 1, concluida: 2 };

function EquipeEtapa({ etapa, colaboradores, aoAdicionar, aoRemover }) {
  const [novoId, setNovoId] = useState('');

  const disponiveis = colaboradores.filter(
    c => !etapa.consultores.some(e => e.id === c.id)
  );

  return (
    <div style={{ marginTop: 'var(--sp-12)' }}>
      <span className="field-label">Equipe da etapa</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-8)', margin: 'var(--sp-8) 0' }}>
        {etapa.consultores.length === 0 && (
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)' }}>
            Nenhum consultor alocado.
          </span>
        )}
        {etapa.consultores.map(c => (
          <span key={c.id} className="chip chip-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            {c.nome}
            <button
              type="button"
              className="btn-ghost-danger"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              title="Remover da etapa"
              onClick={() => aoRemover(etapa.id, c.id)}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--sp-8)' }}>
        <select
          className="input-field"
          value={novoId}
          onChange={e => setNovoId(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">Adicionar consultor...</option>
          {disponiveis.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!novoId}
          onClick={() => { aoAdicionar(etapa.id, parseInt(novoId)); setNovoId(''); }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function BotoesStatus({ etapa, aoMover }) {
  const fluxo = FLUXO[etapa.status];
  return (
    <div style={{ display: 'flex', gap: 'var(--sp-8)', marginTop: 'var(--sp-12)' }}>
      {fluxo.prev && (
        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => aoMover(etapa.id, fluxo.prev)}>
          ← Voltar
        </button>
      )}
      {fluxo.next && (
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => aoMover(etapa.id, fluxo.next)}>
          {fluxo.nextLabel}
        </button>
      )}
    </div>
  );
}

// Card de etapa avulsa: alvo de soltura (droppable) e origem do gesto de
// ligação pelo handle 🔗 (draggable) — ADR-009.
function CardEtapaAvulsa({ etapa, colaboradores, aoMover, aoAdicionar, aoRemover }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `card-${etapa.id}` });
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } =
    useDraggable({ id: `link-${etapa.id}` });

  return (
    <div
      ref={setDropRef}
      className="ui-card kanban-card"
      style={{
        outline: isOver ? '2px solid var(--color-brand)' : 'none',
        boxShadow: isOver ? 'var(--shadow-glow)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-8)' }}>
        <h4 style={{ flex: 1, fontSize: 'var(--text-h4)', fontWeight: 600, textDecoration: etapa.status === 'concluida' ? 'line-through' : 'none', opacity: etapa.status === 'concluida' ? 0.6 : 1 }}>
          {etapa.ordem}. {etapa.nome}
        </h4>
        <button
          type="button"
          ref={setDragRef}
          {...attributes}
          {...listeners}
          title="Arraste sobre outra etapa para formar um bloco de entrega"
          aria-label="Ligar em bloco de entrega"
          style={{
            transform: CSS.Translate.toString(transform),
            background: 'none', border: 'none', padding: 'var(--sp-4)',
            cursor: 'grab', color: isDragging ? 'var(--color-brand-glow)' : 'var(--color-text-disabled)',
            zIndex: isDragging ? 10 : 'auto', position: 'relative', touchAction: 'none',
          }}
        >
          <Link2 size={16} />
        </button>
      </div>
      {etapa.descricao && (
        <p style={{ fontSize: 'var(--text-body2)', color: 'var(--color-text-secondary)', margin: 'var(--sp-8) 0', lineHeight: 1.5 }}>
          {etapa.descricao}
        </p>
      )}

      {etapa.dias_uteis_esperados != null && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-brand-glow)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          ⏳ Prazo: {etapa.dias_uteis_esperados} dia(s) útil(eis)
        </p>
      )}

      {etapa.data_inicio && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          📅 {formatarData(etapa.data_inicio)}
          {etapa.data_fim && ` → ${formatarData(etapa.data_fim)}`}
        </p>
      )}

      <EquipeEtapa etapa={etapa} colaboradores={colaboradores} aoAdicionar={aoAdicionar} aoRemover={aoRemover} />
      <BotoesStatus etapa={etapa} aoMover={aoMover} />
    </div>
  );
}

// Card único do bloco: fica na coluna da etapa menos avançada; progresso
// "X/Y concluídas"; cada etapa interna mantém status e equipe próprios.
function CardBloco({ membros, colaboradores, aoMover, aoAdicionar, aoRemover, aoDesfazer }) {
  const concluidas = membros.filter(e => e.status === 'concluida').length;
  const ref = membros[0]; // prazo/data compartilhados pelo bloco

  return (
    <div className="ui-card kanban-card">
      <span className="chip" style={{ backgroundColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)', fontSize: '10px', marginBottom: 'var(--sp-8)', display: 'inline-flex' }}>
        📦 Entrega em bloco
      </span>

      <h4 style={{ fontSize: 'var(--text-h4)', fontWeight: 600 }}>
        Bloco de {membros.length} etapas
      </h4>
      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, margin: 'var(--sp-4) 0 var(--sp-8)' }}>
        {concluidas}/{membros.length} concluídas
      </p>

      {ref.dias_uteis_esperados != null && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-brand-glow)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          ⏳ Prazo do bloco: {ref.dias_uteis_esperados} dia(s) útil(eis)
        </p>
      )}
      {ref.data_inicio && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          📅 {formatarData(ref.data_inicio)}
          {ref.data_fim && ` → ${formatarData(ref.data_fim)}`}
        </p>
      )}

      {membros.map(etapa => (
        <div key={etapa.id} style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--sp-12)', marginTop: 'var(--sp-12)' }}>
          <h5 style={{ fontSize: 'var(--text-body1)', fontWeight: 600, textDecoration: etapa.status === 'concluida' ? 'line-through' : 'none', opacity: etapa.status === 'concluida' ? 0.6 : 1 }}>
            {etapa.ordem}. {etapa.nome}
          </h5>
          <EquipeEtapa etapa={etapa} colaboradores={colaboradores} aoAdicionar={aoAdicionar} aoRemover={aoRemover} />
          <BotoesStatus etapa={etapa} aoMover={aoMover} />
        </div>
      ))}

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{ width: '100%', marginTop: 'var(--sp-12)' }}
        onClick={() => aoDesfazer(ref.bloco_entrega)}
      >
        Desfazer bloco
      </button>
    </div>
  );
}

export default function KanbanEtapas({ projetoId, toast }) {
  const [etapas, setEtapas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  // Par de etapas aguardando confirmação de ligação no modal.
  const [parBloco, setParBloco] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const recarregarEtapas = () => {
    return listarEtapasDoProjeto(projetoId)
      .then(setEtapas)
      .catch(() => toast.error('Erro ao carregar as etapas do projeto.'));
  };

  useEffect(() => {
    if (!projetoId) return;
    recarregarEtapas();
    listarTrabalhadores()
      .then(setColaboradores)
      .catch(() => toast.error('Erro ao carregar a equipe.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  const moverEtapa = (etapaId, novoStatus) => {
    atualizarStatusEtapa(etapaId, novoStatus)
      .then(etapaAtualizada => {
        setEtapas(prev => prev.map(e => (e.id === etapaId ? etapaAtualizada : e)));
      })
      .catch(() => toast.error('Erro ao mover a etapa.'));
  };

  const adicionarConsultor = (etapaId, trabalhadorId) => {
    adicionarConsultorEtapa(etapaId, trabalhadorId)
      .then(() => {
        toast.success('Consultor adicionado à etapa.');
        recarregarEtapas();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao adicionar consultor.'));
  };

  const removerConsultor = (etapaId, trabalhadorId) => {
    removerConsultorEtapa(etapaId, trabalhadorId)
      .then(() => {
        toast.success('Consultor removido da etapa.');
        recarregarEtapas();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao remover consultor.'));
  };

  // Gesto de ligação: soltar o 🔗 de uma etapa avulsa sobre outra → modal.
  const aoSoltarLigacao = ({ active, over }) => {
    if (!over) return;
    const origemId = Number(String(active.id).replace('link-', ''));
    const alvoId = Number(String(over.id).replace('card-', ''));
    if (origemId === alvoId) return;
    const origem = etapas.find(e => e.id === origemId);
    const alvo = etapas.find(e => e.id === alvoId);
    if (origem && alvo) setParBloco([origem, alvo]);
  };

  const confirmarBloco = ({ dias, dataInicio }) => {
    const ids = parBloco.map(e => e.id);
    setParBloco(null);
    criarBloco(projetoId, { etapaIds: ids, diasUteis: dias, dataInicio })
      .then(() => {
        toast.success('Bloco de entrega formado.');
        recarregarEtapas();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao formar o bloco.'));
  };

  const desfazerBlocoLocal = (chave) => {
    if (!window.confirm('Desfazer este bloco de entrega? As etapas voltam a ser avulsas, mantendo prazo e datas.')) return;
    desfazerBloco(projetoId, chave)
      .then(() => {
        toast.success('Bloco desfeito.');
        recarregarEtapas();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao desfazer o bloco.'));
  };

  // Agrupa em cards: etapas avulsas + um card por bloco (chave compartilhada).
  const cards = [];
  const blocosVistos = new Set();
  [...etapas].sort((a, b) => a.ordem - b.ordem).forEach(etapa => {
    if (!etapa.bloco_entrega) {
      cards.push({ tipo: 'etapa', etapa, ordem: etapa.ordem });
      return;
    }
    if (blocosVistos.has(etapa.bloco_entrega)) return;
    blocosVistos.add(etapa.bloco_entrega);
    const membros = etapas
      .filter(e => e.bloco_entrega === etapa.bloco_entrega)
      .sort((a, b) => a.ordem - b.ordem);
    cards.push({ tipo: 'bloco', membros, ordem: etapa.ordem });
  });

  // Coluna do card: a da etapa menos avançada, no caso de bloco.
  const statusDoCard = (card) =>
    card.tipo === 'etapa'
      ? card.etapa.status
      : card.membros.reduce((min, e) => (RANK[e.status] < RANK[min] ? e.status : min), 'concluida');

  return (
    <div>
      <div className="page-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', fontWeight: 700 }}>
          Etapas do Projeto
        </h2>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)' }}>
          Arraste o 🔗 de uma etapa sobre outra para formar uma entrega em bloco.
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={aoSoltarLigacao}>
        <div className="kanban-board">
          {COLUNAS.map(coluna => {
            const cardsColuna = cards
              .filter(c => statusDoCard(c) === coluna.status)
              .sort((a, b) => a.ordem - b.ordem);

            return (
              <div key={coluna.status} className="kanban-column">
                <div className="kanban-col-header">
                  <span className="kanban-dot" style={{ backgroundColor: coluna.cor }} />
                  <h3>{coluna.titulo}</h3>
                  <span className="kanban-count">{cardsColuna.length}</span>
                </div>

                {cardsColuna.map(card =>
                  card.tipo === 'etapa' ? (
                    <CardEtapaAvulsa
                      key={`e-${card.etapa.id}`}
                      etapa={card.etapa}
                      colaboradores={colaboradores}
                      aoMover={moverEtapa}
                      aoAdicionar={adicionarConsultor}
                      aoRemover={removerConsultor}
                    />
                  ) : (
                    <CardBloco
                      key={`b-${card.membros[0].bloco_entrega}`}
                      membros={card.membros}
                      colaboradores={colaboradores}
                      aoMover={moverEtapa}
                      aoAdicionar={adicionarConsultor}
                      aoRemover={removerConsultor}
                      aoDesfazer={desfazerBlocoLocal}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      </DndContext>

      {parBloco && (
        <ModalBloco
          nomes={parBloco.map(e => e.nome)}
          diasInicial={Math.max(...parBloco.map(e => e.dias_uteis_esperados ?? 0)) || ''}
          dataInicial={parBloco.map(e => e.data_inicio).filter(Boolean).sort()[0] ?? ''}
          onConfirmar={confirmarBloco}
          onCancelar={() => setParBloco(null)}
        />
      )}
    </div>
  );
}
