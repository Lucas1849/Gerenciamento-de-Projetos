// ─── Checkbox "4a" (Fase 14b, ADR-016) ──────────────────────────────────────
// Caixa desenhada sobre um input real escondido: aparência da marca com a
// acessibilidade nativa preservada (label, teclado, leitores de tela). O check
// "desenha" via stroke-dashoffset (ver .chk em App.css).

export default function Checkbox({ checked, onChange, children }) {
  return (
    <label className="chk">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="chk-caixa" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="#fff"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </label>
  );
}
