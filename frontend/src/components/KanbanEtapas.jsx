import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link2 } from 'lucide-react';
import ModalBloco from './ModalBloco';
import { criarBloco, desfazerBloco } from '../services/api';
import { formatarData } from './datasUtils';
import { agruparCards, statusDoCard, FLUXO } from './etapasUtils';

const COLUNAS = [
  { status: 'nao_iniciada', titulo: 'Não Iniciada', cor: 'var(--color-text-secondary)' },
  { status: 'em_andamento', titulo: 'Em Andamento', cor: 'var(--fase-andamento)' },
  { status: 'concluida',    titulo: 'Concluída',     cor: 'var(--fase-concluido)' },
];

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
function CardBloco({ rotulo, membros, colaboradores, aoMover, aoAdicionar, aoRemover, aoDesfazer }) {
  const concluidas = membros.filter(e => e.status === 'concluida').length;
  const ref = membros[0]; // prazo/data compartilhados pelo bloco

  return (
    <div className="ui-card kanban-card">
      <span className="chip" style={{ backgroundColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)', fontSize: '10px', marginBottom: 'var(--sp-8)', display: 'inline-flex' }}>
        📦 Entrega em bloco · {rotulo}
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

// Visão "Por status": Kanban de 3 colunas controlado por props (dados e
// handlers vêm do container EtapasProjeto). O DndContext e o gesto 🔗 de
// formar blocos permanecem encapsulados aqui.
export default function KanbanEtapas({ projetoId, etapas, colaboradores, toast, aoMover, aoAdicionar, aoRemover, recarregar }) {
  // Par de etapas aguardando confirmação de ligação no modal.
  const [parBloco, setParBloco] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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
        recarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao formar o bloco.'));
  };

  const desfazerBlocoLocal = (chave) => {
    if (!window.confirm('Desfazer este bloco de entrega? As etapas voltam a ser avulsas, mantendo prazo e datas.')) return;
    desfazerBloco(projetoId, chave)
      .then(() => {
        toast.success('Bloco desfeito.');
        recarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao desfazer o bloco.'));
  };

  const cards = agruparCards(etapas);

  return (
    <div>
      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--sp-16)' }}>
        Arraste o 🔗 de uma etapa sobre outra para formar uma entrega em bloco.
      </p>

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
                      aoMover={aoMover}
                      aoAdicionar={aoAdicionar}
                      aoRemover={aoRemover}
                    />
                  ) : (
                    <CardBloco
                      key={`b-${card.membros[0].bloco_entrega}`}
                      rotulo={card.rotulo}
                      membros={card.membros}
                      colaboradores={colaboradores}
                      aoMover={aoMover}
                      aoAdicionar={aoAdicionar}
                      aoRemover={aoRemover}
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
