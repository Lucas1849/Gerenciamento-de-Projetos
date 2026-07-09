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
