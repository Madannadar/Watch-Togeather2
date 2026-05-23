import React, { memo } from "react";
import { fmt, fmtDrift } from "../utils/timeFormat.js";

/**
 * PresencePanel — Realtime viewer presence list.
 *
 * Displays each viewer's playback time, drift from host, and status.
 * Memoized to prevent re-renders when unrelated Room state changes.
 *
 * Props:
 *  users      — array of { id, name } from room_state
 *  viewers    — Map<id, PresenceEntry> from usePresence
 *  hostId     — socket ID of the host
 *  myId       — this client's socket ID
 *  hostTime   — host's current projected time (seconds)
 */
function PresencePanel({ users = [], viewers, hostId, myId, hostTime }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
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
          <div className="text-xs text-slate-600 italic">No one here yet…</div>
        )}
      </div>
    </div>
  );
}

const ViewerRow = memo(function ViewerRow({ user, presence, isHost, isMe, hostTime }) {
  const { status, statusIcon, driftText, driftColor, timeStr } = deriveDisplay(
    presence,
    isHost,
    hostTime
  );

  return (
    <div className="flex items-center justify-between text-xs py-1 px-1 rounded hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="flex-shrink-0">{statusIcon}</span>
        <span
          className={`font-medium truncate ${
            isHost ? "text-amber-400" : isMe ? "text-indigo-300" : "text-slate-200"
          }`}
        >
          {isHost ? "👑 " : ""}{user.name}{isMe ? " (you)" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {timeStr && (
          <span className="text-slate-400 font-mono tabular-nums">{timeStr}</span>
        )}
        {driftText && !isHost && (
          <span className={`font-mono font-semibold ${driftColor}`}>{driftText}</span>
        )}
        {status && (
          <span className="text-slate-500 italic">{status}</span>
        )}
      </div>
    </div>
  );
});

function deriveDisplay(presence, isHost, hostTime) {
  if (!presence) {
    return {
      statusIcon: "⚪",
      timeStr: null,
      driftText: null,
      driftColor: "",
      status: "connected",
    };
  }

  if (presence.buffering) {
    return {
      statusIcon: "🔄",
      timeStr: fmt(presence.time),
      driftText: null,
      driftColor: "",
      status: "buffering…",
    };
  }

  if (!presence.playing) {
    return {
      statusIcon: "⏸️",
      timeStr: fmt(presence.time),
      driftText: null,
      driftColor: "",
      status: "paused",
    };
  }

  // Playing — compute drift vs host
  let driftText = null;
  let driftColor = "";
  if (!isHost && hostTime != null && presence.time != null) {
    const drift = hostTime - presence.time; // positive = behind host
    const absDrift = Math.abs(drift);
    if (absDrift > 0.5) {
      driftText = fmtDrift(drift);
      if (absDrift < 2) driftColor = "text-emerald-400";
      else if (absDrift < 5) driftColor = "text-amber-400";
      else driftColor = "text-red-400";
    }
  }

  return {
    statusIcon: "▶️",
    timeStr: fmt(presence.time),
    driftText,
    driftColor,
    status: null,
  };
}

export default memo(PresencePanel);
