import React, { useCallback, useEffect, useReducer } from "react";
import ReactDOM from "react-dom";

/**
 * Toast.jsx — Lightweight toast notification system.
 *
 * No external library. Uses CSS transitions.
 * Max 3 toasts stacked. Auto-dismiss in 4s.
 * Position: bottom-right desktop, bottom-center mobile.
 *
 * Usage (via module-level singleton):
 *   import { toast } from "./Toast.jsx";
 *   toast.show("Rahul paused at 22:14", "info");
 *   toast.show("Synced!", "success");
 *
 * Or use the <ToastContainer /> in your app root.
 */

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
    case "add": {
      const next = [...state, action.payload];
      // Keep max 3 toasts
      return next.slice(-3);
    }
    case "remove":
      return state.filter((t) => t.id !== action.payload.id);
    default:
      return state;
  }
}

const TYPE_STYLES = {
  info: "bg-slate-800 border-slate-700 text-slate-100",
  success: "bg-emerald-900/90 border-emerald-700 text-emerald-100",
  warning: "bg-amber-900/90 border-amber-700 text-amber-100",
  error: "bg-red-900/90 border-red-700 text-red-100",
};

const TYPE_ICONS = {
  info: "💬",
  success: "✅",
  warning: "⚠️",
  error: "❌",
};

function ToastItem({ toast: t, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  return (
    <div
      className={`
        flex items-start gap-2 px-4 py-3 rounded-xl border shadow-2xl text-sm
        backdrop-blur-sm animate-toast-in max-w-xs w-full
        ${TYPE_STYLES[t.type] || TYPE_STYLES.info}
      `}
      role="alert"
    >
      <span className="flex-shrink-0 mt-0.5">{TYPE_ICONS[t.type] || "💬"}</span>
      <span className="flex-1 leading-snug">{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  useEffect(() => {
    _dispatch = dispatch;
    return () => {
      _dispatch = null;
    };
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
