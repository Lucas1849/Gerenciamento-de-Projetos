import { useState, useCallback, useRef } from 'react';

// ─── Tipos ──────────────────────────────────────────────────────────────────────
// tipo: 'success' | 'error' | 'warning' | 'info'

const CONFIG = {
  success: { icone: '✓', label: 'Sucesso',   classe: 'toast-success' },
  error:   { icone: '✕', label: 'Erro',      classe: 'toast-error'   },
  warning: { icone: '⚠', label: 'Atenção',   classe: 'toast-warning' },
  info:    { icone: 'ℹ', label: 'Info',      classe: 'toast-info'    },
};

const DURACAO_PADRAO = 4000;

// ─── Hook principal ─────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const contadorRef = useRef(0);

  const remover = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, saindo: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const adicionar = useCallback((mensagem, tipo = 'info', duracao = DURACAO_PADRAO) => {
    const id = ++contadorRef.current;
    setToasts(prev => [...prev, { id, mensagem, tipo, saindo: false }]);
    setTimeout(() => remover(id), duracao);
    return id;
  }, [remover]);

  // Atalhos
  const toast = {
    success: (msg, dur) => adicionar(msg, 'success', dur),
    error:   (msg, dur) => adicionar(msg, 'error',   dur),
    warning: (msg, dur) => adicionar(msg, 'warning', dur),
    info:    (msg, dur) => adicionar(msg, 'info',    dur),
  };

  return { toasts, remover, toast };
}

// ─── Componente individual ──────────────────────────────────────────────────────
function ToastItem({ toast, onRemover }) {
  const cfg = CONFIG[toast.tipo] ?? CONFIG.info;

  return (
    <div className={`toast ${cfg.classe} ${toast.saindo ? 'toast-saindo' : 'toast-entrando'}`}
         role="alert"
         aria-live="assertive">
      <span className="toast-icone">{cfg.icone}</span>
      <span className="toast-mensagem">{toast.mensagem}</span>
      <button className="toast-fechar" onClick={() => onRemover(toast.id)} aria-label="Fechar">✕</button>
    </div>
  );
}

// ─── Container ──────────────────────────────────────────────────────────────────
export function ToastContainer({ toasts, remover }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-label="Notificações">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemover={remover} />
      ))}
    </div>
  );
}