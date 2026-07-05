// ─── Editor de etapas na criação de projeto (Fase 5 / ADR-008) ──────────────
// Cards editáveis (nome, dias úteis, data de início; data final calculada pelo
// backend), reordenáveis por arrastar (handle ⠿, dnd-kit) ou pelas setas ↑/↓
// (fallback acessível). Blocos do catálogo (templates com a mesma ordem)
// aparecem como card único com um só prazo/data para o conjunto.

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ArrowUp, ArrowDown, Trash2, Plus, Link2, Unlink } from 'lucide-react';
import { calcularDataFim } from '../services/api';
import { novoUid } from './etapasEditorUtils';
import ModalBloco from './ModalBloco';

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

// Handle 🔗: origem do gesto de ligação (drag type distinto do reordenar ⠿).
function HandleLigacao({ uid }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `link:${uid}` });
  return (
    <button
      type="button"
      ref={setNodeRef}
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
  );
}

function CardEtapa({ item, indice, total, ligando, onEditar, onMover, onRemover, onDesfazer }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: item.uid });
  const ehBloco = item.membros.length > 1;
  const ehManual = !ehBloco && item.membros[0].etapaTemplateId == null;
  // Realce de alvo válido enquanto um 🔗 está sendo arrastado.
  const alvoDeLigacao = ligando && !ehBloco && isOver;

  return (
    <div
      ref={setNodeRef}
      className="ui-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        outline: alvoDeLigacao ? '2px solid var(--color-brand)' : 'none',
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
        {ehBloco ? (
          <button type="button" className="btn btn-secondary btn-sm"
            title="Desfazer bloco (as etapas voltam a ser cards avulsos)"
            aria-label="Desfazer bloco" onClick={() => onDesfazer(indice)}>
            <Unlink size={14} />
          </button>
        ) : (
          <HandleLigacao uid={item.uid} />
        )}
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
  // true enquanto um handle 🔗 está sendo arrastado (drag type de ligação).
  const [ligando, setLigando] = useState(false);
  // Índices [origem, alvo] aguardando confirmação no modal de bloco.
  const [parLigacao, setParLigacao] = useState(null);

  const mover = (de, para) => onChange(arrayMove(itens, de, para));

  const aoIniciarDrag = ({ active }) =>
    setLigando(String(active.id).startsWith('link:'));

  const aoSoltarDrag = ({ active, over }) => {
    setLigando(false);
    const activeId = String(active.id);
    // Gesto de ligação: soltar o 🔗 sobre outro card avulso → modal (ADR-009).
    if (activeId.startsWith('link:')) {
      if (!over) return;
      const origem = itens.findIndex(i => i.uid === activeId.slice(5));
      const alvo = itens.findIndex(i => i.uid === String(over.id));
      if (origem < 0 || alvo < 0 || origem === alvo) return;
      if (itens[alvo].membros.length > 1) return; // só entre cards avulsos
      setParLigacao([origem, alvo]);
      return;
    }
    if (!over || active.id === over.id) return;
    const de = itens.findIndex(i => i.uid === active.id);
    const para = itens.findIndex(i => i.uid === over.id);
    mover(de, para);
  };

  // Mescla os dois cards num bloco local (o backend materializa via
  // `bloco_grupo` na criação do projeto).
  const confirmarLigacao = ({ dias, dataInicio }) => {
    const [origem, alvo] = parLigacao;
    setParLigacao(null);
    onChange(
      itens
        .map((item, idx) =>
          idx === alvo
            ? {
                ...item,
                membros: [...item.membros, ...itens[origem].membros],
                dias: String(dias),
                dataInicio: dataInicio ?? '',
              }
            : item
        )
        .filter((_, idx) => idx !== origem)
    );
  };

  // Desfaz o bloco: um card avulso por membro, herdando prazo/data do bloco.
  const desfazer = (indice) => {
    const item = itens[indice];
    const soltos = item.membros.map(m => ({
      uid: novoUid(),
      membros: [m],
      dias: item.dias,
      dataInicio: item.dataInicio,
    }));
    onChange([...itens.slice(0, indice), ...soltos, ...itens.slice(indice + 1)]);
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={aoIniciarDrag}
        onDragEnd={aoSoltarDrag}
        onDragCancel={() => setLigando(false)}
      >
        <SortableContext items={itens.map(i => i.uid)} strategy={verticalListSortingStrategy}>
          {itens.map((item, indice) => (
            <CardEtapa
              key={item.uid}
              item={item}
              indice={indice}
              total={itens.length}
              ligando={ligando}
              onEditar={novo => editar(indice, novo)}
              onMover={mover}
              onRemover={remover}
              onDesfazer={desfazer}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" className="kanban-ghost" onClick={adicionar}>
        <Plus size={16} /> Adicionar etapa
      </button>

      {parLigacao && (
        <ModalBloco
          nomes={parLigacao.flatMap(idx => itens[idx].membros.map(m => m.nome))}
          diasInicial={Math.max(...parLigacao.map(idx => Number(itens[idx].dias) || 0)) || ''}
          dataInicial={parLigacao.map(idx => itens[idx].dataInicio).filter(Boolean).sort()[0] ?? ''}
          onConfirmar={confirmarLigacao}
          onCancelar={() => setParLigacao(null)}
        />
      )}
    </div>
  );
}
