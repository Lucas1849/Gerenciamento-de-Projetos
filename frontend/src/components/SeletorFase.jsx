// ─── Seletor de fase (Fase 26, ADR-030) ─────────────────────────────────────
// Um único controle para mudar a fase de um projeto, usado em dois lugares:
//   - variante "badge": gatilho compacto no canto do card da galeria
//     (GaleriaProjetos.jsx), substituindo o antigo <span className="badge-fase">;
//   - variante "campo": com rótulo, na aba Visão Geral (PaginaProjeto.jsx),
//     substituindo o <select> "Mover para a fase".
// Popover próprio (não <select> nativo): renderiza os dots coloridos das fases e
// respeita o design system das Fases 14/15. Comportamento de teclado/foco
// implementado à mão porque o nativo não dá: Esc/clique-fora fecham, setas
// navegam, Enter/Espaço selecionam (botão nativo), foco volta ao gatilho.
// O consumidor decide o efeito de onSelecionar (no card é otimista com rollback).

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FASES, FASE_LABEL } from './fases';

const FASE_POR_VALOR = new Map(FASES.map(f => [f.valor, f]));

export default function SeletorFase({ faseAtual, onSelecionar, variante = 'badge', disabled = false }) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef(null);
  const gatilhoRef = useRef(null);
  const menuRef = useRef(null);

  const fase = FASE_POR_VALOR.get(faseAtual);
  const titulo = fase?.titulo ?? FASE_LABEL[faseAtual] ?? faseAtual;

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e) => {
      if (raizRef.current && !raizRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  // Ao abrir, foca a opção da fase atual (ou a primeira).
  useEffect(() => {
    if (!aberto || !menuRef.current) return;
    const ativa = menuRef.current.querySelector('[data-ativa="true"]') ?? menuRef.current.querySelector('button');
    ativa?.focus();
  }, [aberto]);

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) gatilhoRef.current?.focus();
  };

  const escolher = (valor) => {
    fechar();
    if (valor !== faseAtual) onSelecionar(valor);
  };

  const aoTeclarNoMenu = (e) => {
    const opcoes = Array.from(menuRef.current?.querySelectorAll('button') ?? []);
    const i = opcoes.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      opcoes[(i + 1) % opcoes.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      opcoes[(i - 1 + opcoes.length) % opcoes.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
    } else if (e.key === 'Home') {
      e.preventDefault();
      opcoes[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      opcoes[opcoes.length - 1]?.focus();
    }
  };

  const classeGatilho = variante === 'campo' ? 'seletor-fase-gatilho campo' : 'seletor-fase-gatilho badge';

  return (
    <div
      className={`seletor-fase ${variante}`}
      ref={raizRef}
      // No card da galeria o container inteiro é clicável e abre o projeto —
      // conter o clique aqui evita navegar ao usar o seletor (risco 3 do plano).
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        ref={gatilhoRef}
        className={classeGatilho}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title={disabled ? undefined : 'Mudar a fase do projeto'}
        onClick={() => !disabled && setAberto(a => !a)}
      >
        <span className="kanban-dot" style={{ backgroundColor: fase?.cor }} />
        {titulo}
        {!disabled && <ChevronDown size={14} className="seletor-fase-chevron" aria-hidden="true" />}
      </button>

      {aberto && (
        <div
          className="seletor-fase-menu"
          role="menu"
          ref={menuRef}
          aria-label="Mudar de fase"
          onKeyDown={aoTeclarNoMenu}
        >
          {FASES.map(f => (
            <button
              key={f.valor}
              type="button"
              role="menuitemradio"
              aria-checked={f.valor === faseAtual}
              data-ativa={f.valor === faseAtual}
              className={`seletor-fase-opcao${f.valor === faseAtual ? ' ativa' : ''}`}
              onClick={() => escolher(f.valor)}
            >
              <span className="kanban-dot" style={{ backgroundColor: f.cor }} />
              {f.titulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
