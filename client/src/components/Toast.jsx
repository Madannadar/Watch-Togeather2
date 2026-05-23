import React, { useCallback, useEffect, useReducer } from "react";
import ReactDOM from "react-dom";

let _dispatch = null;
let _idCounter = 0;

export const toast = {
  show(message, type = "info", duration = 4000) {
    if (!_dispatch) return;
    const id = ++_idCounter;
    _dispatch({ type: "add", payload: { id, message, type, duration } });
    return id;
  },
  dismiss(id) {
    if (_dispatch) _dispatch({ type: "remove", payload: { id } });
  },
};

function toastReducer(state, action) {
  switch (action.type) {
    case "add": return [...state, action.payload].slice(-3);
    case "remove": return state.filter((t) => t.id !== action.payload.id);
    default: return state;
  }
}

const TYPE_STYLES = {
  info:    { bg: "#071220", border: "#0d1d35", color: "#e2e8f0" },
  success: { bg: "rgba(6,78,59,0.7)", border: "#065f46", color: "#a7f3d0" },
  warning: { bg: "rgba(120,53,15,0.7)", border: "#92400e", color: "#fde68a" },
  error:   { bg: "rgba(127,29,29,0.6)", border: "#991b1b", color: "#fecaca" },
};

const TYPE_ICONS = { info: "💬", success: "✅", warning: "⚠️", error: "❌" };

function ToastItem({ toast: t, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  const style = TYPE_STYLES[t.type] || TYPE_STYLES.info;

  return (
    <div
      className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm
                 backdrop-blur-sm animate-toast-in max-w-xs w-full shadow-navy-lg"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
      role="alert"
    >
      <span className="flex-shrink-0 mt-0.5">{TYPE_ICONS[t.type] || "💬"}</span>
      <span className="flex-1 leading-snug">{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 text-lg leading-none"
        aria-label="Dismiss"
      >×</button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  useEffect(() => {
    _dispatch = dispatch;
    return () => { _dispatch = null; };
  }, []);

  const onDismiss = useCallback((id) => {
    dispatch({ type: "remove", payload: { id } });
  }, []);

  if (toasts.length === 0) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end sm:items-end
                 max-sm:right-0 max-sm:left-0 max-sm:items-center max-sm:px-4"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}
