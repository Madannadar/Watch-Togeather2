import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useDraggable } from "../hooks/useDraggable.js";
import { fmt, fmtDrift } from "../utils/timeFormat.js";

/**
 * FloatingWidget — Draggable sync status widget.
 *
 * Features:
 *  - Collapsible (toggle by clicking header)
 *  - Draggable (mouse + touch)
 *  - Position persisted to localStorage
 *  - Collapsed state persisted to localStorage
 *  - React Portal (renders in document.body, always on top)
 *  - Quick reactions
 *  - Catch Up button (Presence Mode)
 *  - Sync mode toggle (host only)
 *
 * Props:
 *  roomId, connected, isHost
 *  hostTime, localTime, drift
 *  userCount
 *  syncMode, onSetSyncMode
 *  onCatchUp
 *  onReact(emoji)
 *  isPresenceMode
 */

const EMOJIS = ["🔥", "😂", "👏", "❤️", "😮"];
const COLLAPSED_KEY = "wt_widget_collapsed";

export default function FloatingWidget({
  roomId,
  connected,
  isHost,
  hostTime,
  localTime,
  userCount,
  syncMode,
  onSetSyncMode,
  onCatchUp,
  onReact,
  isPresenceMode,
}) {
  const { x, y, dragHandleProps } = useDraggable("wt_widget_pos", {
    x: typeof window !== "undefined" ? window.innerWidth - 340 : 20,
    y: 20,
  });

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch (_) {
      return false;
    }
  });

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch (_) {}
      return next;
    });
  }

  const drift = hostTime != null && localTime != null ? hostTime - localTime : null;
  const absDrift = drift != null ? Math.abs(drift) : null;

  const driftColor =
    absDrift == null
      ? "text-slate-400"
      : absDrift < 2
      ? "text-emerald-400"
      : absDrift < 5
      ? "text-amber-400"
      : "text-red-400";

  const widget = (
    <div
      id="sync-widget"
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9990,
        width: 300,
        transition: "box-shadow 0.2s",
      }}
      className="select-none"
    >
      {/* Header — draggable */}
      <div
        {...dragHandleProps}
        onClick={toggleCollapse}
        className={`
          flex items-center justify-between px-3 py-2 rounded-t-xl
          bg-slate-800/95 backdrop-blur-md border border-slate-700
          ${collapsed ? "rounded-b-xl" : "border-b-0"}
          hover:bg-slate-700/95 transition-colors
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎬</span>
          <span className="text-xs font-semibold text-slate-200">Watch Together</span>
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              connected ? "bg-emerald-400" : "bg-red-400"
            } animate-pulse`}
          />
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-xs">{userCount ?? 0} 👥</span>
          <span className="text-xs px-1 font-bold">{collapsed ? "+" : "−"}</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 border-t-0 rounded-b-xl overflow-hidden">
          {/* Sync info */}
          <div className="px-3 py-2 border-b border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Host</span>
              <span className="font-mono text-slate-200">
                {hostTime != null ? fmt(hostTime) : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">You</span>
              <span className="font-mono text-slate-200">
                {localTime != null ? fmt(localTime) : "—"}
              </span>
            </div>
            {drift != null && Math.abs(drift) > 0.5 && !isHost && (
              <div className={`flex justify-between text-xs font-semibold ${driftColor}`}>
                <span>Drift</span>
                <span>{fmtDrift(drift)}</span>
              </div>
            )}
          </div>

          {/* Sync mode (host only) */}
          {isHost && (
            <div className="px-3 py-2 border-b border-slate-800">
              <div className="text-xs text-slate-400 mb-1.5">Sync Mode</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onSetSyncMode?.("hard")}
                  className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${
                    syncMode === "hard"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  🔒 Hard Sync
                </button>
                <button
                  onClick={() => onSetSyncMode?.("presence")}
                  className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${
                    syncMode === "presence"
                      ? "bg-purple-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  👁 Presence
                </button>
              </div>
            </div>
          )}

          {/* Non-host: catch up button in presence mode */}
          {!isHost && isPresenceMode && drift != null && Math.abs(drift) > 1 && (
            <div className="px-3 py-2 border-b border-slate-800">
              <button
                onClick={onCatchUp}
                className="w-full text-xs py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-semibold transition-colors"
              >
                ⚡ Catch Up ({fmtDrift(drift)})
              </button>
            </div>
          )}

          {/* Sync mode label for non-host */}
          {!isHost && (
            <div className="px-3 py-1.5 border-b border-slate-800">
              <span className="text-xs text-slate-500">
                Mode:{" "}
                <span className={syncMode === "presence" ? "text-purple-400" : "text-indigo-400"}>
                  {syncMode === "presence" ? "👁 Presence" : "🔒 Hard Sync"}
                </span>
              </span>
            </div>
          )}

          {/* Quick reactions */}
          <div className="px-3 py-2 flex gap-2 justify-center">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onReact?.(e)}
                className="text-lg hover:scale-125 active:scale-110 transition-transform"
                aria-label={`React ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Room ID */}
          <div className="px-3 py-1.5 bg-slate-950/50">
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
