// ─── Ícones SVG da marca (Fase 15a, ADR-017) ────────────────────────────────
// Substituem os emoji ⏳/📅 nas linhas de prazo e data (opção A + A aprovada).
// Traço da marca: viewBox 24, stroke 2, cantos redondos, `currentColor` para
// herdar a cor da linha de texto (prazo = brand-glow, data = text-secondary).

function base(tamanho) {
  return {
    width: tamanho,
    height: tamanho,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    style: { verticalAlign: '-3px', flexShrink: 0 },
  };
}

// Cronômetro: duração/prazo em dias úteis.
export function IconePrazo({ tamanho = 16 }) {
  return (
    <svg {...base(tamanho)}>
      <circle cx="12" cy="14" r="7.5" />
      <path d="M12 10.5V14l2.2 1.5" />
      <path d="M9 2.5h6" />
      <path d="M12 2.5v3.2" />
    </svg>
  );
}

// Hexágono: marca do bloco de entrega no cronograma (Fase 15b).
export function IconeHexagono({ tamanho = 12 }) {
  return (
    <svg {...base(tamanho)}>
      <path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z" />
    </svg>
  );
}

// Cadeado: datas compartilhadas do bloco (substitui o 🔒 no cronograma).
export function IconeCadeado({ tamanho = 11 }) {
  return (
    <svg {...base(tamanho)}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

// Calendário-período: data de início → fim.
export function IconeData({ tamanho = 16 }) {
  return (
    <svg {...base(tamanho)}>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 9.5h16" />
      <path d="M8.5 3v3.5" />
      <path d="M15.5 3v3.5" />
      <path d="M7 14.5h4" />
      <circle cx="15.5" cy="14.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
