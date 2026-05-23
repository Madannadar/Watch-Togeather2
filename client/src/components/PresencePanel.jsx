import React, { memo } from "react";
import { fmt, fmtDrift } from "../utils/timeFormat.js";

function PresencePanel({ users = [], viewers, hostId, myId, hostTime }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "#071220", border: "1px solid #0d1d35" }}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1"
           style={{ color: "#64748b" }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Viewers ({users.length})
      </div>
      <div className="space-y-1">
        {users.map((user) => (
          <ViewerRow
            key={user.id}
            user={user}
            presence={viewers?.get(user.id)}
            isHost={user.id === hostId}
            isMe={user.id === myId}
            hostTime={hostTime}
          />
        ))}
        {users.length === 0 && (
          <div className="text-xs italic" style={{ color: "#334155" }}>No one here yet…</div>
        )}
      </div>
    </div>
  );
}

const ViewerRow = memo(function ViewerRow({ user, presence, isHost, isMe, hostTime }) {
  const { status, statusIcon, driftText, driftColor, timeStr } = deriveDisplay(
    presence, isHost, hostTime
  );

  return (
    <div className="flex items-center justify-between text-xs py-1 px-1 rounded transition-colors"
         style={{ cursor: "default" }}
         onMouseEnter={(e) => e.currentTarget.style.background = "#0a1628"}
         onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="flex-shrink-0">{statusIcon}</span>
        <span
          className="font-medium truncate"
          style={{
            color: isHost ? "#38bdf8" : isMe ? "#67e8f9" : "#cbd5e1",
          }}
        >
          {isHost ? "👑 " : ""}{user.name}{isMe ? " (you)" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {timeStr && (
          <span className="font-mono tabular-nums" style={{ color: "#64748b" }}>{timeStr}</span>
        )}
        {driftText && !isHost && (
          <span className={`font-mono font-semibold ${driftColor}`}>{driftText}</span>
        )}
        {status && (
          <span className="italic" style={{ color: "#475569" }}>{status}</span>
        )}
      </div>
    </div>
  );
});

function deriveDisplay(presence, isHost, hostTime) {
  if (!presence) {
    return { statusIcon: "⚪", timeStr: null, driftText: null, driftColor: "", status: "connected" };
  }
  if (presence.buffering) {
    return { statusIcon: "🔄", timeStr: fmt(presence.time), driftText: null, driftColor: "", status: "buffering…" };
  }
  if (!presence.playing) {
    return { statusIcon: "⏸️", timeStr: fmt(presence.time), driftText: null, driftColor: "", status: "paused" };
  }

  let driftText = null;
  let driftColor = "";
  if (!isHost && hostTime != null && presence.time != null) {
    const drift = hostTime - presence.time;
    const absDrift = Math.abs(drift);
    if (absDrift > 0.5) {
      driftText = fmtDrift(drift);
      if (absDrift < 2) driftColor = "text-emerald-400";
      else if (absDrift < 5) driftColor = "text-amber-400";
      else driftColor = "text-red-400";
    }
  }

  return { statusIcon: "▶️", timeStr: fmt(presence.time), driftText, driftColor, status: null };
}

export default memo(PresencePanel);
