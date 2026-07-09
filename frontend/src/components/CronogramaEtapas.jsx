import { useState, useRef, useLayoutEffect } from 'react';
import { Link2 } from 'lucide-react';
import NavMes from './NavMes';
import { agruparCards, STATUS_LABEL } from './etapasUtils';
import { contarDiasUteis } from '../services/api';
import { isoDe, diaDeISO, diasNoMes, ehFimDeSemana, formatarData, somaDias, hojeISO } from './datasUtils';
import AvatarIniciais from './AvatarIniciais';
import { IconeHexagono, IconeCadeado } from './Icones';

// Visão "Cronograma" interativa (Fase 13, ADR-015): mantém o CSS grid por mês
// e adiciona, por pointer events nativos, arrastar a barra (nova data_inicio),
// redimensionar a borda direita (nova duração via reverse-calendar) e um
// conector 🔗 que cria dependência informativa entre etapas. Setas SVG ligam
// as pontas das barras no mês visível; para partner fora do mês, um cadeado no
// rótulo (fallback do risco registrado). Bloco = barra única (o PATCH da Fase
// 12 propaga aos membros). Comparações por string ISO (UTC); a matemática de
// dias úteis continua no backend (ADR-008).
export default function CronogramaEtapas({
  etapas, mes, aoMudarMes, aoAtualizarEtapa, aoCriarDependencia,
}) {
  const { ano, mes: m } = mes;
  const nDias = diasNoMes(ano, m);
  const dias = Array.from({ length: nDias }, (_, i) => i + 1);
  const template = { gridTemplateColumns: `minmax(160px, 200px) repeat(${nDias}, minmax(22px, 1fr))` };

  const cronogramaRef = useRef(null);
  const barrasRef = useRef(new Map());
  const larguraColRef = useRef(1);
  const dragRef = useRef(null);
  const [larguraCol, setLarguraCol] = useState(1);
  const [posicoes, setPosicoes] = useState({});
  // Arraste em curso (para o feedback visual): { tipo, key, dxCols, alvoKey }.
  const [arraste, setArraste] = useState(null);

  // Um item de barra por etapa (Fase 15b, ADR-017): membros de um bloco viram
  // barras individuais (mesmo intervalo, ADR-009) marcadas com grupoBloco —
  // o indicador "entrega conjunta" é desenhado abaixo do grupo. Arrastar ou
  // redimensionar qualquer membro patcha o próprio id; a propagação da Fase 12
  // move as barras-irmãs juntas.
  const items = agruparCards(etapas).flatMap(card => {
    if (card.tipo === 'etapa') {
      const e = card.etapa;
      return [{
        key: `e-${e.id}`, etapaId: e.id, ids: [e.id],
        nome: `${e.ordem}. ${e.nome}`, status: e.status,
        inicio: e.data_inicio, fim: e.data_fim, bloqueadaPor: e.bloqueada_por,
        dias: e.dias_uteis_esperados, consultor: e.consultores?.[0]?.nome ?? null,
        grupoBloco: null,
      }];
    }
    const idsMembros = new Set(card.membros.map(mm => mm.id));
    return card.membros.map(mm => ({
      key: `e-${mm.id}`, etapaId: mm.id, ids: [mm.id],
      nome: `${mm.ordem}. ${mm.nome}`, status: mm.status,
      inicio: mm.data_inicio, fim: mm.data_fim,
      bloqueadaPor: mm.bloqueada_por.filter(d => !idsMembros.has(d.id)),
      dias: mm.dias_uteis_esperados, consultor: mm.consultores?.[0]?.nome ?? null,
      grupoBloco: mm.bloco_entrega, grupoRotulo: card.rotulo, grupoTamanho: card.membros.length,
    }));
  });

  const idParaBarra = new Map();
  items.forEach(it => it.ids.forEach(id => idParaBarra.set(id, it.key)));

  // Arestas de dependência entre barras (dedup; ignora vínculos internos a um
  // mesmo bloco — os membros são uma entrega só, agora com barras próprias).
  // Direção: da bloqueadora (predecessora) para a bloqueada.
  const blocoDe = new Map(etapas.map(e => [e.id, e.bloco_entrega]));
  const arestas = [];
  const vistas = new Set();
  etapas.forEach(e => e.bloqueada_por.forEach(b => {
    const deKey = idParaBarra.get(b.id);
    const paraKey = idParaBarra.get(e.id);
    if (!deKey || !paraKey || deKey === paraKey) return;
    if (blocoDe.get(b.id) && blocoDe.get(b.id) === blocoDe.get(e.id)) return;
    const chave = `${deKey}->${paraKey}`;
    if (!vistas.has(chave)) { vistas.add(chave); arestas.push({ deKey, paraKey }); }
  }));

  const primeiroISO = isoDe(ano, m, 1);
  const ultimoISO = isoDe(ano, m, nDias);
  // Linha "HOJE" (Fase 14d): só marcação visual na coluna do dia atual.
  const hoje = hojeISO();
  const diaHoje = hoje >= primeiroISO && hoje <= ultimoISO ? diaDeISO(hoje) : null;
  const noMes = items.filter(i => i.inicio && i.inicio <= ultimoISO && (i.fim ?? i.inicio) >= primeiroISO);
  const semData = items.filter(i => !i.inicio);

  // Linhas de render (15b): barras na ordem dos items; após o último membro de
  // cada bloco, uma linha-indicadora "Bloco N · entrega conjunta" no mesmo
  // intervalo compartilhado (membros são contíguos por construção).
  const linhas = [];
  noMes.forEach((item, i) => {
    linhas.push({ tipo: 'barra', item });
    const prox = noMes[i + 1];
    if (item.grupoBloco && (!prox || prox.grupoBloco !== item.grupoBloco)) {
      linhas.push({
        tipo: 'grupo', key: `g-${item.grupoBloco}`,
        rotulo: item.grupoRotulo, tamanho: item.grupoTamanho,
        inicio: item.inicio, fim: item.fim ?? item.inicio,
      });
    }
  });

  // ── Medição (largura de coluna + posições das barras para as setas) ──────
  useLayoutEffect(() => {
    const medir = () => {
      const cont = cronogramaRef.current;
      if (!cont) return;
      const celDia = cont.querySelector('.crono-dia');
      const lc = celDia ? celDia.getBoundingClientRect().width : 0;
      const contRect = cont.getBoundingClientRect();
      const pos = {};
      barrasRef.current.forEach((el, key) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        pos[key] = {
          left: r.left - contRect.left,
          right: r.right - contRect.left,
          meioY: r.top - contRect.top + r.height / 2,
        };
      });
      if (lc) { larguraColRef.current = lc; setLarguraCol(lc); }
      setPosicoes(pos);
    };
    medir();
    const cont = cronogramaRef.current;
    if (!cont || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    return () => ro.disconnect();
  }, [etapas, mes]);

  // ── Interações por pointer events nativos ────────────────────────────────
  const barraSob = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const barra = el && el.closest('[data-barra-etapa]');
    return barra ? { etapaId: Number(barra.dataset.barraEtapa), key: barra.dataset.barraKey } : null;
  };

  const capturar = (e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ } };
  const soltar = (e) => { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };

  const iniciar = (tipo, item, e) => {
    e.stopPropagation();
    if (e.button !== 0 || !item.inicio) return;
    capturar(e);
    dragRef.current = { tipo, key: item.key, etapaId: item.etapaId, inicio: item.inicio, fim: item.fim ?? item.inicio, x0: e.clientX };
    setArraste({ tipo, key: item.key, dxCols: 0, alvoKey: null });
  };

  const aoMover = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.tipo === 'conectar') {
      const alvo = barraSob(e.clientX, e.clientY);
      setArraste({ tipo: 'conectar', key: d.key, dxCols: 0, alvoKey: alvo && alvo.etapaId !== d.etapaId ? alvo.key : null });
      return;
    }
    const dxCols = Math.round((e.clientX - d.x0) / (larguraColRef.current || 1));
    setArraste({ tipo: d.tipo, key: d.key, dxCols, alvoKey: null });
  };

  const aoLargar = async (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    soltar(e);
    setArraste(null);
    if (!d) return;
    if (d.tipo === 'conectar') {
      const alvo = barraSob(e.clientX, e.clientY);
      if (alvo && alvo.etapaId !== d.etapaId) aoCriarDependencia(alvo.etapaId, d.etapaId);
      return;
    }
    const dxCols = Math.round((e.clientX - d.x0) / (larguraColRef.current || 1));
    if (dxCols === 0) return;
    if (d.tipo === 'mover') {
      aoAtualizarEtapa(d.etapaId, { data_inicio: somaDias(d.inicio, dxCols) });
    } else if (d.tipo === 'resize') {
      let novoFim = somaDias(d.fim, dxCols);
      if (novoFim < d.inicio) novoFim = d.inicio;
      try {
        const { dias_uteis } = await contarDiasUteis(d.inicio, novoFim);
        aoAtualizarEtapa(d.etapaId, { dias_uteis_esperados: dias_uteis });
      } catch { /* erro tratado no handler do container */ }
    }
  };

  return (
    <div>
      <NavMes mes={mes} aoMudar={aoMudarMes} />

      <p className="crono-ajuda" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-16)', flexWrap: 'wrap' }}>
        <span>
          Arraste a barra para mover o início · a borda direita para mudar a duração · o 🔗 até outra etapa para criar dependência (Bloqueado por).
        </span>
        <span className="crono-legenda">
          <span className="crono-legenda-item"><span className="crono-legenda-cor" style={{ background: 'linear-gradient(135deg,#3A3A4A,#2E2E3C)' }} />Não iniciada</span>
          <span className="crono-legenda-item"><span className="crono-legenda-cor" style={{ background: 'var(--fase-andamento)' }} />Em andamento</span>
          <span className="crono-legenda-item"><span className="crono-legenda-cor" style={{ background: 'var(--fase-concluido)' }} />Concluída</span>
        </span>
      </p>

      <div className="cronograma-wrapper">
        <div className="cronograma" ref={cronogramaRef}>
          <div className="crono-linha crono-header" style={template}>
            <div className="crono-rotulo" />
            {dias.map(d => (
              <div key={d} className={`crono-dia${ehFimDeSemana(ano, m, d) ? ' crono-dia--fds' : ''}${d === diaHoje ? ' crono-dia--hoje' : ''}`} title={d === diaHoje ? 'Hoje' : undefined}>
                {d}
              </div>
            ))}
          </div>

          {noMes.length === 0 && (
            <p className="crono-vazio">Nenhuma etapa com datas neste mês.</p>
          )}

          {linhas.map(l => {
            if (l.tipo === 'grupo') {
              const gColIni = l.inicio < primeiroISO ? 1 : diaDeISO(l.inicio);
              const gColFim = l.fim > ultimoISO ? nDias : diaDeISO(l.fim);
              return (
                <div key={l.key} className="crono-linha crono-linha--grupo" style={template}>
                  <div className="crono-rotulo" />
                  <div className="crono-grupo" style={{ gridColumn: `${gColIni + 1} / ${gColFim + 2}`, gridRow: 1 }}>
                    <span className="crono-grupo-chip" title={`${l.tamanho} etapas com prazo e data compartilhados (ADR-009)`}>
                      <IconeHexagono /> {l.rotulo} · entrega conjunta <IconeCadeado />
                    </span>
                  </div>
                </div>
              );
            }
            const { item } = l;
            const fim = item.fim ?? item.inicio;
            const colIni = item.inicio < primeiroISO ? 1 : diaDeISO(item.inicio);
            const colFim = fim > ultimoISO ? nDias : diaDeISO(fim);
            const ativo = arraste && arraste.key === item.key;
            let transform;
            if (ativo && arraste.tipo === 'mover') {
              transform = `translateX(${arraste.dxCols * larguraCol}px)`;
            } else if (ativo && arraste.tipo === 'resize') {
              const cols = colFim - colIni + 1;
              transform = `scaleX(${Math.max(0.15, (cols + arraste.dxCols) / cols)})`;
            }
            const alvoDeLigacao = arraste && arraste.tipo === 'conectar' && arraste.alvoKey === item.key;

            return (
              <div key={item.key} className="crono-linha" style={template}>
                <div className="crono-rotulo" title={item.nome}>
                  {item.nome}
                  {item.bloqueadaPor.length > 0 && (
                    <span
                      className="crono-cadeado"
                      title={`Bloqueada por: ${item.bloqueadaPor.map(d => d.nome).join(', ')}`}
                    >
                      🔒
                    </span>
                  )}
                </div>
                {dias.map(d => (
                  <div
                    key={d}
                    className={`crono-cel${ehFimDeSemana(ano, m, d) ? ' crono-cel--fds' : ''}${d === diaHoje ? ' crono-cel--hoje' : ''}${alvoDeLigacao ? ' crono-cel--alvo' : ''}`}
                    style={{ gridColumn: d + 1, gridRow: 1 }}
                  />
                ))}
                <div
                  ref={el => { if (el) barrasRef.current.set(item.key, el); else barrasRef.current.delete(item.key); }}
                  data-barra-etapa={item.etapaId}
                  data-barra-key={item.key}
                  className={`crono-barra crono-barra--${item.status}${ativo ? ' crono-barra--ativo' : ''}${alvoDeLigacao ? ' crono-barra--alvo' : ''}`}
                  style={{ gridColumn: `${colIni + 1} / ${colFim + 2}`, gridRow: 1, transform, transformOrigin: 'left center' }}
                  title={`${item.nome} · ${STATUS_LABEL[item.status]} · ${formatarData(item.inicio)}${item.fim ? ` → ${formatarData(item.fim)}` : ''}`}
                  onPointerDown={e => iniciar('mover', item, e)}
                  onPointerMove={aoMover}
                  onPointerUp={aoLargar}
                >
                  {/* Conector 🔗: cria dependência (distinto do bloco). */}
                  <span
                    className="crono-conector"
                    title="Arraste até outra etapa para criar dependência (Bloqueado por)"
                    onPointerDown={e => iniciar('conectar', item, e)}
                    onPointerMove={aoMover}
                    onPointerUp={aoLargar}
                  >
                    <Link2 size={11} />
                  </span>
                  {/* Conteúdo decorativo da barra (14d): não intercepta o pointer. */}
                  <span className="crono-barra-conteudo">
                    <span className="crono-barra-textos">
                      <span className="crono-barra-nome">{item.nome}</span>
                      <span className="crono-barra-periodo">
                        {formatarData(item.inicio)}{item.fim ? ` → ${formatarData(item.fim)}` : ''}
                        {item.dias != null ? ` · ${item.dias} dia(s)` : ''}
                      </span>
                    </span>
                    {item.consultor && <AvatarIniciais nome={item.consultor} tamanho={26} />}
                  </span>
                  {/* Handle de redimensionamento (muda a duração). */}
                  <span
                    className="crono-resize"
                    title="Arraste para mudar a duração (dias úteis)"
                    onPointerDown={e => iniciar('resize', item, e)}
                    onPointerMove={aoMover}
                    onPointerUp={aoLargar}
                  />
                </div>
              </div>
            );
          })}

          {/* Setas de dependência entre barras visíveis no mês. */}
          <svg className="crono-setas" aria-hidden="true">
            <defs>
              <marker id="crono-seta-ponta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-brand-glow)" />
              </marker>
            </defs>
            {arestas.map(({ deKey, paraKey }) => {
              const de = posicoes[deKey];
              const para = posicoes[paraKey];
              if (!de || !para) return null;
              const x1 = de.right;
              const y1 = de.meioY;
              const x2 = para.left;
              const y2 = para.meioY;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={`${deKey}->${paraKey}`}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  className="crono-seta"
                  markerEnd="url(#crono-seta-ponta)"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {semData.length > 0 && (
        <aside className="sem-data-aside">
          <span className="field-label">Sem data de início</span>
          <ul>
            {semData.map(i => <li key={i.key}>{i.nome}</li>)}
          </ul>
        </aside>
      )}
    </div>
  );
}
