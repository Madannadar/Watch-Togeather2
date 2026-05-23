import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "./config.js";
import NameModal from "./components/NameModal.jsx";

export default function Home() {
  const nav = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Name state
  const [name, setName] = useState(() => localStorage.getItem("wt_name") || "");
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "create" | "join"

  function requireName(action) {
    if (!name) {
      setPendingAction(action);
      setShowNameModal(true);
    } else {
      if (action === "create") doCreate();
      else if (action === "join") doJoin();
    }
  }

  function onNameConfirm(n) {
    setName(n);
    setShowNameModal(false);
    // Run the pending action after name is set
    if (pendingAction === "create") doCreate();
    else if (pendingAction === "join") doJoin();
    setPendingAction(null);
  }

  async function doCreate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, { method: "POST" });
      if (!res.ok) throw new Error("Server error");
      const { id } = await res.json();
      nav(`/room/${id}`);
    } catch (e) {
      setError("Could not create room. Is the server running?");
      setBusy(false);
    }
  }

  function doJoin() {
    if (!joinId.trim()) return;
    nav(`/room/${joinId.trim()}`);
  }

  function handleChangeName() {
    setPendingAction(null);
    setShowNameModal(true);
  }

  // Animated particles (just CSS, no library)
  const [particles] = useState(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 3 + Math.random() * 4,
      delay: Math.random() * 5,
    }))
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #020d1a 0%, #071220 40%, #0a1628 100%)" }}
    >
      {/* Name modal */}
      {showNameModal && (
        <NameModal
          onConfirm={onNameConfirm}
          defaultValue={name}
        />
      )}

      {/* Ambient floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20 animate-pulse-dot"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Main card */}
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-navy-lg relative z-10">
        {/* Logo & hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 select-none">🎬</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Watch <span className="text-gradient-sky">Together</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Sync YouTube with friends in real time.<br/>
            Create a room or join one to start watching.
          </p>
        </div>

        {/* Current name / change name */}
        {name && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{
                background: `linear-gradient(135deg, #0ea5e9, #06b6d4)`,
              }}
            >
              {name[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-slate-300">{name}</span>
            <button
              onClick={handleChangeName}
              className="text-xs text-sky-400 hover:text-sky-300 transition-colors ml-1"
            >
              change
            </button>
          </div>
        )}

        {/* Create room button */}
        <button
          onClick={() => requireName("create")}
          disabled={busy}
          className="w-full py-3.5 rounded-xl font-semibold text-white
                     transition-all duration-200 mb-4 relative overflow-hidden
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: busy
              ? "#0c4a6e"
              : "linear-gradient(135deg, #0ea5e9, #0891b2)",
            boxShadow: busy ? "none" : "0 4px 20px rgba(14,165,233,0.3)",
          }}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Creating…
            </span>
          ) : (
            "🚀 Create Room"
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "#1a3d5c" }} />
          <span className="text-xs text-slate-500 uppercase tracking-wider">or join</span>
          <div className="flex-1 h-px" style={{ background: "#1a3d5c" }} />
        </div>

        {/* Join form */}
        <div className="flex gap-2">
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && requireName("join")}
            placeholder="Room ID or link…"
            className="flex-1 rounded-xl px-4 py-2.5 outline-none text-sm
                       text-white placeholder-slate-500 focus-sky transition-all"
            style={{ background: "#0a1628", border: "1px solid #1a3d5c" }}
          />
          <button
            onClick={() => requireName("join")}
            disabled={!joinId.trim()}
            className="px-5 rounded-xl font-semibold text-sm transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: "#0d1d35",
              color: joinId.trim() ? "#38bdf8" : "#475569",
            }}
          >
            Join →
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 text-red-400 text-sm text-center bg-red-950/30 rounded-xl p-3 border border-red-900/50">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs">
            No sign-up required • Rooms expire when empty
          </p>
        </div>
      </div>
    </div>
  );
}
