import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

/**
 * NameModal — First-visit name entry modal.
 *
 * Shows when localStorage.wt_name is empty, or when user taps "Change name".
 * Derives a consistent avatar color from the name hash.
 * Saves name to localStorage on confirm.
 *
 * Props:
 *   onConfirm(name: string) — called when user confirms
 *   defaultValue            — pre-filled value (from localStorage)
 */

const AVATAR_GRADIENTS = [
  ["#0ea5e9", "#06b6d4"], // sky → cyan
  ["#06b6d4", "#0891b2"], // cyan shades
  ["#3b82f6", "#0ea5e9"], // blue → sky
  ["#0284c7", "#22d3ee"], // sky-dark → cyan-light
  ["#0e7490", "#38bdf8"], // deep cyan → light sky
  ["#1d4ed8", "#06b6d4"], // blue → cyan
];

function nameToGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function AvatarPreview({ name }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const [from, to] = nameToGradient(name || "default");
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg select-none"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {initials}
    </div>
  );
}

export default function NameModal({ onConfirm, defaultValue = "" }) {
  const [name, setName] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function handleSubmit(e) {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("wt_name", trimmed);
    onConfirm(trimmed);
  }

  function handleSkip() {
    const animals = ["Fox", "Owl", "Tiger", "Panda", "Wolf", "Otter", "Bear", "Lynx", "Hawk", "Drake"];
    const random = animals[Math.floor(Math.random() * animals.length)] + Math.floor(Math.random() * 99);
    localStorage.setItem("wt_name", random);
    onConfirm(random);
  }

  const MAX = 20;
  const tooLong = name.length > MAX;
  const isEmpty = !name.trim();

  const modal = (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 modal-backdrop"
         style={{ background: "rgba(2,13,26,0.92)", backdropFilter: "blur(8px)" }}>
      <div className="modal-card w-full max-w-sm glass rounded-2xl p-6 shadow-navy-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎬</div>
          <h2 className="text-xl font-bold text-white mb-1">Join Watch Party</h2>
          <p className="text-slate-400 text-sm">Choose a name that others will see</p>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center mb-5">
          <AvatarPreview name={name || "You"} />
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name…"
                maxLength={MAX + 5}
                className="w-full bg-navy-800 border border-slate-700 focus-sky rounded-xl
                           px-4 py-3 text-white placeholder-slate-500 text-sm outline-none
                           transition-all"
                style={{ background: "#0a1628" }}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs
                               ${tooLong ? "text-red-400" : "text-slate-500"}`}>
                {name.length}/{MAX}
              </span>
            </div>
            {tooLong && (
              <p className="text-red-400 text-xs mt-1 ml-1">Name is too long</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isEmpty || tooLong}
            className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-semibold py-3 rounded-xl
                       transition-all duration-200 shadow-sky-glow"
          >
            Enter Room →
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-slate-500 hover:text-slate-300 text-sm py-1
                       transition-colors"
          >
            Skip — use random name
          </button>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

// Export the gradient helper for use in Chat avatars
export { nameToGradient };
