// ─── Editor de etapas na criação de projeto (Fase 5 / ADR-008) ──────────────
// Cards editáveis (nome, dias úteis, data de início; data final calculada pelo
// backend), reordenáveis por arrastar (handle ⠿, dnd-kit) ou pelas setas ↑/↓
// (fallback acessível). Blocos do catálogo (templates com a mesma ordem)
// aparecem como card único com um só prazo/data para o conjunto.

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { calcularDataFim } from '../services/api';
import { novoUid } from './etapasEditorUtils';

function DataFimPreview({ dias, dataInicio }) {
  // Guarda o resultado junto com a chave dos inputs: se os inputs mudarem,
  // o valor antigo deixa de ser exibido sem precisar de setState no effect.
  const [resultado, setResultado] = useState(null);
  const chave = `${dias}|${dataInicio}`;
  useEffect(() => {
    if (dias === '' || !dataInicio) return;
    let ativo = true;
    calcularDataFim(dataInicio, Number(dias))
      .then(r => { if (ativo) setResultado({ chave, valor: r.data_fim }); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [dias, dataInicio, chave]);

  const dataFim = resultado?.chave === chave ? resultado.valor : null;
  if (!dataFim) return null;
  const formatada = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })
    .format(new Date(dataFim));
  return (
    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-brand-glow)', fontWeight: 600 }}>
      Data final: {formatada}
    </span>
  );
}

function CardEtapa({ item, indice, total, onEditar, onMover, onRemover }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.uid });
  const ehBloco = item.membros.length > 1;
  const ehManual = !ehBloco && item.membros[0].etapaTemplateId == null;

  return (
    <div
      ref={setNodeRef}
      className="ui-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        display: 'flex',
        gap: 'var(--sp-12)',
        alignItems: 'flex-start',
        padding: 'var(--sp-12)',
        marginBottom: 'var(--sp-8)',
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
        style={{ background: 'none', border: 'none', cursor: 'grab', color: 'var(--color-text-disabled)', padding: 'var(--sp-4)' }}
      >
        <GripVertical size={18} />
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-8)', flexWrap: 'wrap' }}>
          <span className="kanban-count">{indice + 1}</span>
          {ehBloco ? (
            <span style={{ fontWeight: 600 }}>
              Entrega em bloco ({item.membros.length} etapas)
            </span>
          ) : (
            <input
              className="input-field"
              type="text"
              value={item.membros[0].nome}
              onChange={e => onEditar({ ...item, membros: [{ ...item.membros[0], nome: e.target.value }] })}
              style={{ flex: 1, minWidth: '160px', padding: '6px 10px' }}
              required
            />
          )}
          {ehManual && <span className="chip chip-warning">manual</span>}
          {ehBloco && <span className="chip chip-brand">bloco</span>}
        </div>

        {ehBloco && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
            {item.membros.map((m, i) => (
              <span key={i} className="chip chip-servico">{m.nome}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-12)', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            Dias úteis
            <input
              className="input-field"
              type="number"
              min="0"
              value={item.dias}
              onChange={e => onEditar({ ...item, dias: e.target.value })}
              style={{ width: '80px', padding: '6px 10px' }}
            />
          </label>
          <label style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            Início
            <input
              className="input-field"
              type="date"
              value={item.dataInicio}
              onChange={e => onEditar({ ...item, dataInicio: e.target.value })}
              style={{ padding: '6px 10px' }}
            />
          </label>
          <DataFimPreview dias={item.dias} dataInicio={item.dataInicio} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <button type="button" className="btn btn-secondary btn-sm" disabled={indice === 0}
          aria-label="Mover para cima" onClick={() => onMover(indice, indice - 1)}>
          <ArrowUp size={14} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={indice === total - 1}
          aria-label="Mover para baixo" onClick={() => onMover(indice, indice + 1)}>
          <ArrowDown size={14} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={total === 1}
          aria-label="Remover etapa" onClick={() => onRemover(indice)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function EtapasEditor({ itens, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const mover = (de, para) => onChange(arrayMove(itens, de, para));

  const aoSoltarDrag = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const de = itens.findIndex(i => i.uid === active.id);
    const para = itens.findIndex(i => i.uid === over.id);
    mover(de, para);
  };

  const editar = (indice, novo) =>
    onChange(itens.map((i, idx) => (idx === indice ? novo : i)));

  const remover = (indice) => {
    if (itens.length === 1) return; // guarda: o projeto precisa de ao menos 1 etapa
    onChange(itens.filter((_, idx) => idx !== indice));
  };

  const adicionar = () =>
    onChange([...itens, {
      uid: novoUid(),
      membros: [{ nome: 'Nova etapa', etapaTemplateId: null }],
      dias: '',
      dataInicio: '',
    }]);

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltarDrag}>
        <SortableContext items={itens.map(i => i.uid)} strategy={verticalListSortingStrategy}>
          {itens.map((item, indice) => (
            <CardEtapa
              key={item.uid}
              item={item}
              indice={indice}
              total={itens.length}
              onEditar={novo => editar(indice, novo)}
              onMover={mover}
              onRemover={remover}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" className="kanban-ghost" onClick={adicionar}>
        <Plus size={16} /> Adicionar etapa
      </button>
    </div>
  );
}
