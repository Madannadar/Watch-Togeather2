import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useDraggable } from "../hooks/useDraggable.js";
import { fmt, fmtDrift } from "../utils/timeFormat.js";

const EMOJIS = ["🔥", "😂", "👏", "❤️", "😮"];
const COLLAPSED_KEY = "wt_widget_collapsed";

export default function FloatingWidget({
  roomId, connected, isHost,
  hostTime, localTime, userCount,
  syncMode, onSetSyncMode, onCatchUp, onReact, isPresenceMode,
}) {
  const { x, y, dragHandleProps } = useDraggable("wt_widget_pos", {
    x: typeof window !== "undefined" ? window.innerWidth - 340 : 20,
    y: 20,
  });

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch (_) { return false; }
  });

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch (_) {}
      return next;
    });
  }

  const drift = hostTime != null && localTime != null ? hostTime - localTime : null;
  const absDrift = drift != null ? Math.abs(drift) : null;
  const driftColor = absDrift == null ? "text-slate-400"
    : absDrift < 2 ? "text-emerald-400"
    : absDrift < 5 ? "text-amber-400"
    : "text-red-400";

  const widget = (
    <div
      id="sync-widget"
      style={{ position: "fixed", left: x, top: y, zIndex: 9990, width: 300, transition: "box-shadow 0.2s" }}
      className="select-none"
    >
      {/* Header */}
      <div
        {...dragHandleProps}
        onClick={toggleCollapse}
        className="flex items-center justify-between px-3 py-2 rounded-t-xl
                   backdrop-blur-md hover:brightness-110 transition-all cursor-grab"
        style={{
          background: "rgba(7,18,32,0.95)",
          border: "1px solid #0d1d35",
          borderRadius: collapsed ? "12px" : "12px 12px 0 0",
          borderBottom: collapsed ? undefined : "none",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎬</span>
          <span className="text-xs font-semibold text-slate-200">Watch Together</span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-xs">{userCount ?? 0} 👥</span>
          <span className="text-xs px-1 font-bold">{collapsed ? "+" : "−"}</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="rounded-b-xl overflow-hidden backdrop-blur-md"
             style={{ background: "rgba(5,13,26,0.95)", border: "1px solid #0d1d35", borderTop: "none" }}>

          {/* Sync info */}
          <div className="px-3 py-2 space-y-1" style={{ borderBottom: "1px solid #0d1d35" }}>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Host</span>
              <span className="font-mono text-slate-200">{hostTime != null ? fmt(hostTime) : "—"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">You</span>
              <span className="font-mono text-slate-200">{localTime != null ? fmt(localTime) : "—"}</span>
            </div>
            {drift != null && Math.abs(drift) > 0.5 && !isHost && (
              <div className={`flex justify-between text-xs font-semibold ${driftColor}`}>
                <span>Drift</span>
                <span>{fmtDrift(drift)}</span>
              </div>
            )}
          </div>

          {/* Sync mode (host) */}
          {isHost && (
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #0d1d35" }}>
              <div className="text-xs text-slate-400 mb-1.5">Sync Mode</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onSetSyncMode?.("hard")}
                  className="flex-1 text-xs py-1 rounded-lg font-medium transition-colors"
                  style={syncMode === "hard"
                    ? { background: "#0284c7", color: "#fff" }
                    : { background: "#0a1628", color: "#64748b" }
                  }
                >🔒 Hard Sync</button>
                <button
                  onClick={() => onSetSyncMode?.("presence")}
                  className="flex-1 text-xs py-1 rounded-lg font-medium transition-colors"
                  style={syncMode === "presence"
                    ? { background: "#0e7490", color: "#fff" }
                    : { background: "#0a1628", color: "#64748b" }
                  }
                >👁 Presence</button>
              </div>
            </div>
          )}

          {/* Catch up (non-host + presence) */}
          {!isHost && isPresenceMode && drift != null && Math.abs(drift) > 1 && (
            <div className="px-3 py-2" style={{ borderBottom: "1px solid #0d1d35" }}>
              <button
                onClick={onCatchUp}
                className="w-full text-xs py-1.5 rounded-lg text-white font-semibold transition-colors"
                style={{ background: "#0e7490" }}
              >⚡ Catch Up ({fmtDrift(drift)})</button>
            </div>
          )}

          {/* Sync label (non-host) */}
          {!isHost && (
            <div className="px-3 py-1.5" style={{ borderBottom: "1px solid #0d1d35" }}>
              <span className="text-xs text-slate-500">
                Mode: <span style={{ color: syncMode === "presence" ? "#22d3ee" : "#38bdf8" }}>
                  {syncMode === "presence" ? "👁 Presence" : "🔒 Hard Sync"}
                </span>
              </span>
            </div>
          )}

          {/* Reactions */}
          <div className="px-3 py-2 flex gap-2 justify-center">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => onReact?.(e)}
                      className="text-lg hover:scale-125 active:scale-110 transition-transform"
                      aria-label={`React ${e}`}>{e}</button>
            ))}
          </div>

          {/* Room ID */}
          <div className="px-3 py-1.5" style={{ background: "#020d1a" }}>
            <span className="text-xs text-slate-500">
              Room: <code className="text-slate-400">{roomId}</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(widget, document.body);
}
