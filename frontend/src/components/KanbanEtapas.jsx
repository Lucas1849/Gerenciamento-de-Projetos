import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link2, Unlink, Pencil, FilePlus, Paperclip } from 'lucide-react';
import ModalBloco from './ModalBloco';
import AvatarIniciais from './AvatarIniciais';
import { IconePrazo, IconeData } from './Icones';
import { criarBloco, desfazerBloco, estenderBloco, removerEtapaDoBloco } from '../services/api';
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
          <span key={c.id} className="chip-membro">
            <AvatarIniciais nome={c.nome} tamanho={24} />
            {c.nome}
            <button
              type="button"
              className="chip-membro-remover"
              title="Remover da etapa"
              aria-label={`Remover ${c.nome} da etapa`}
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
// Botão ✏️: abre o modal de edição pós-criação (Fase 12 / ADR-014).
function BotaoEditar({ rotulo, onClick }) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      style={{ background: 'none', border: 'none', padding: 'var(--sp-4)', cursor: 'pointer', color: 'var(--color-text-disabled)' }}
      onClick={onClick}
    >
      <Pencil size={15} />
    </button>
  );
}

// Botão de termo aditivo (Fase 17, ADR-019): formalização de dias adicionais —
// distinta da edição/correção. Em blocos, só no card do bloco.
function BotaoTermo({ rotulo, onClick }) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      style={{ background: 'none', border: 'none', padding: 'var(--sp-4)', cursor: 'pointer', color: 'var(--color-text-disabled)' }}
      onClick={onClick}
    >
      <FilePlus size={15} />
    </button>
  );
}

// Chip de contagem de links (Fase 19, ADR-021): o menor elemento possível —
// só a contagem; clicar abre o modal de edição (onde vive a seção de links).
function ChipLinks({ etapas, aoAbrir }) {
  const total = etapas.reduce((n, e) => n + (e.links?.length ?? 0), 0);
  if (!total) return null;
  return (
    <button
      type="button"
      className="chip chip-links-contagem"
      style={{ marginBottom: 'var(--sp-8)' }}
      title="Ver entregas e demandas"
      onClick={aoAbrir}
    >
      <Paperclip size={11} /> {total} link(s)
    </button>
  );
}

// Badge "+N dia(s) · termo aditivo" (âmbar tonal) — só quando há termos.
function BadgeTermo({ dias }) {
  if (!dias) return null;
  return (
    <span className="chip chip-warning" style={{ marginBottom: 'var(--sp-8)', display: 'inline-flex' }}>
      +{dias} dia(s) · termo aditivo
    </span>
  );
}

function CardEtapaAvulsa({ etapa, colaboradores, aoMover, aoAdicionar, aoRemover, aoEditar, aoTermo }) {
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
        <h4 className="kanban-card-titulo" style={{ flex: 1, textDecoration: etapa.status === 'concluida' ? 'line-through' : 'none', opacity: etapa.status === 'concluida' ? 0.6 : 1 }}>
          {etapa.ordem}. {etapa.nome}
        </h4>
        <BotaoEditar rotulo="Editar etapa" onClick={() => aoEditar([etapa])} />
        <BotaoTermo rotulo="Termo aditivo" onClick={() => aoTermo([etapa])} />
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

      <BadgeTermo dias={etapa.dias_aditivos} />
      <ChipLinks etapas={[etapa]} aoAbrir={() => aoEditar([etapa])} />

      {etapa.dias_uteis_esperados != null && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-brand-glow)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          <IconePrazo /> Prazo: {etapa.dias_uteis_esperados} dia(s) útil(eis)
        </p>
      )}

      {etapa.data_inicio && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          <IconeData /> {formatarData(etapa.data_inicio)}
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
function CardBloco({ rotulo, membros, colaboradores, aoMover, aoAdicionar, aoRemover, aoDesfazer, aoRetirarMembro, aoEditar, aoTermo }) {
  const concluidas = membros.filter(e => e.status === 'concluida').length;
  const ref = membros[0]; // prazo/data compartilhados pelo bloco
  // Alvo de soltura do 🔗 de uma etapa avulsa: estende o bloco (Fase 8).
  const { setNodeRef, isOver } = useDroppable({ id: `bloco-${ref.bloco_entrega}` });

  return (
    <div
      ref={setNodeRef}
      className="ui-card kanban-card"
      style={{
        outline: isOver ? '2px solid var(--color-brand)' : 'none',
        boxShadow: isOver ? 'var(--shadow-glow)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="chip" style={{ backgroundColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)', fontSize: '10px', marginBottom: 'var(--sp-8)', display: 'inline-flex' }}>
          📦 Entrega em bloco · {rotulo}
        </span>
        <span style={{ display: 'inline-flex' }}>
          <BotaoEditar rotulo="Editar bloco" onClick={() => aoEditar(membros)} />
          <BotaoTermo rotulo="Termo aditivo do bloco" onClick={() => aoTermo(membros)} />
        </span>
      </div>

      <h4 style={{ fontSize: 'var(--text-h4)', fontWeight: 600 }}>
        Bloco de {membros.length} etapas
      </h4>
      <BadgeTermo dias={ref.dias_aditivos} />
      <ChipLinks etapas={membros} aoAbrir={() => aoEditar(membros)} />
      <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, margin: 'var(--sp-4) 0 var(--sp-8)' }}>
        {concluidas}/{membros.length} concluídas
      </p>

      {ref.dias_uteis_esperados != null && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-brand-glow)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          <IconePrazo /> Prazo do bloco: {ref.dias_uteis_esperados} dia(s) útil(eis)
        </p>
      )}
      {ref.data_inicio && (
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 'var(--sp-8)' }}>
          <IconeData /> {formatarData(ref.data_inicio)}
          {ref.data_fim && ` → ${formatarData(ref.data_fim)}`}
        </p>
      )}

      {membros.map(etapa => (
        <div key={etapa.id} style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--sp-12)', marginTop: 'var(--sp-12)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-8)' }}>
            <h5 style={{ flex: 1, fontSize: 'var(--text-body1)', fontWeight: 600, textDecoration: etapa.status === 'concluida' ? 'line-through' : 'none', opacity: etapa.status === 'concluida' ? 0.6 : 1 }}>
              {etapa.ordem}. {etapa.nome}
            </h5>
            <button
              type="button"
              title="Remover do bloco"
              aria-label={`Remover ${etapa.nome} do bloco`}
              style={{ background: 'none', border: 'none', padding: 'var(--sp-4)', cursor: 'pointer', color: 'var(--color-text-disabled)' }}
              onClick={() => aoRetirarMembro(ref.bloco_entrega, etapa, membros.length)}
            >
              <Unlink size={14} />
            </button>
          </div>
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
export default function KanbanEtapas({ projetoId, etapas, colaboradores, toast, aoMover, aoAdicionar, aoRemover, aoEditar, aoTermo, recarregar }) {
  // Par de etapas aguardando confirmação de ligação no modal.
  const [parBloco, setParBloco] = useState(null);
  // Extensão de bloco aguardando confirmação: { etapa, chave, membros }.
  const [extensao, setExtensao] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Gesto de ligação: soltar o 🔗 de uma etapa avulsa sobre outra avulsa
  // (criar bloco) ou sobre um card de bloco (estender, Fase 8) → modal.
  const aoSoltarLigacao = ({ active, over }) => {
    if (!over) return;
    const origemId = Number(String(active.id).replace('link-', ''));
    const origem = etapas.find(e => e.id === origemId);
    if (!origem) return;
    const overId = String(over.id);
    if (overId.startsWith('bloco-')) {
      const chave = overId.slice(6);
      const membros = etapas.filter(e => e.bloco_entrega === chave);
      if (membros.length) setExtensao({ etapa: origem, chave, membros });
      return;
    }
    const alvoId = Number(overId.replace('card-', ''));
    if (origemId === alvoId) return;
    const alvo = etapas.find(e => e.id === alvoId);
    if (alvo) setParBloco([origem, alvo]);
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

  const confirmarExtensao = () => {
    const { etapa, chave } = extensao;
    setExtensao(null);
    estenderBloco(projetoId, chave, [etapa.id])
      .then(() => {
        toast.success('Etapa adicionada ao bloco.');
        recarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao estender o bloco.'));
  };

  const retirarMembro = (chave, etapa, totalMembros) => {
    const dissolve = totalMembros <= 2;
    const aviso = dissolve
      ? `Remover "${etapa.nome}" do bloco? Com apenas 1 etapa restante, o bloco inteiro será desfeito.`
      : `Remover "${etapa.nome}" do bloco? Ela volta a ser avulsa, mantendo prazo e datas.`;
    if (!window.confirm(aviso)) return;
    removerEtapaDoBloco(projetoId, chave, etapa.id)
      .then(() => {
        toast.success(dissolve ? 'Etapa removida — o bloco foi desfeito.' : 'Etapa removida do bloco.');
        recarregar();
      })
      .catch(erro => toast.error(erro.message || 'Erro ao remover a etapa do bloco.'));
  };

  const desfazerBlocoLocal = (chave) => {
    // Edge da Fase 17 (ADR-019): termos aditivos ficam na etapa em que foram
    // gravados e passam a estender só ela — avisar antes de desfazer.
    const temTermo = etapas.some(
      e => e.bloco_entrega === chave && e.termos_aditivos.length > 0
    );
    const aviso = temTermo
      ? 'Desfazer este bloco de entrega? As etapas voltam a ser avulsas. Atenção: há termo aditivo lançado — ele permanece na etapa em que foi gravado e passa a estender só ela.'
      : 'Desfazer este bloco de entrega? As etapas voltam a ser avulsas, mantendo prazo e datas.';
    if (!window.confirm(aviso)) return;
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
                      aoEditar={aoEditar}
                      aoTermo={aoTermo}
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
                      aoRetirarMembro={retirarMembro}
                      aoEditar={aoEditar}
                      aoTermo={aoTermo}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>
      </DndContext>

      {extensao && (
        <ModalBloco
          modo="estender"
          nomes={[extensao.etapa.nome, ...extensao.membros.map(e => e.nome)]}
          diasInicial={extensao.membros[0].dias_uteis_esperados ?? ''}
          dataInicial={extensao.membros[0].data_inicio ?? ''}
          onConfirmar={confirmarExtensao}
          onCancelar={() => setExtensao(null)}
        />
      )}

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
