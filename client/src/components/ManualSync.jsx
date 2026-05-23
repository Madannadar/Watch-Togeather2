import React, { useEffect, useState } from "react";
import { fmt, parseTime } from "../utils/timeFormat.js";

export default function ManualSync({ socket, isHost, hostTime, instruction, countdown }) {
  const [ts, setTs] = useState("");
  const [myTime, setMyTime] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMyTime((t) => t), 1000);
    return () => clearInterval(id);
  }, []);

  const drift = hostTime != null ? (hostTime - myTime).toFixed(1) : null;

  const cardStyle = { background: "#0a1628", border: "1px solid #0d1d35" };

  return (
    <div className="space-y-4">
      {/* A. Button Sync */}
      <div className="rounded-xl p-3" style={cardStyle}>
        <div className="font-semibold mb-2 text-sm text-slate-200">A. Button Sync</div>
        {isHost ? (
          <div className="flex gap-2">
            <input
              value={ts} onChange={(e) => setTs(e.target.value)}
              placeholder="mm:ss or seconds"
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none text-white
                         placeholder-slate-500 focus-sky"
              style={{ background: "#071220", border: "1px solid #1a3d5c" }}
            />
            <button
              onClick={() => socket?.emit("manual_sync", { time: parseTime(ts) })}
              className="rounded-lg px-3 text-sm font-semibold text-white"
              style={{ background: "#0284c7" }}
            >Sync</button>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Host controls this.</div>
        )}
        {instruction != null && (
          <div className="mt-2 text-sm" style={{ color: "#fbbf24" }}>
            👉 Go to <b>{fmt(instruction)}</b> and press play.
          </div>
        )}
      </div>

      {/* B. Countdown Sync */}
      <div className="rounded-xl p-3" style={cardStyle}>
        <div className="font-semibold mb-2 text-sm text-slate-200">B. Countdown Sync</div>
        {isHost && (
          <button
            onClick={() => socket?.emit("countdown_start")}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
            style={{ background: "#059669" }}
          >Start Together (5s)</button>
        )}
        {countdown != null && (
          <div className="mt-3 text-center">
            <div className="text-6xl font-bold" style={{ color: "#34d399" }}>
              {countdown > 0 ? countdown : "▶ PLAY!"}
            </div>
            <div className="text-xs mt-1" style={{ color: "#64748b" }}>Press play at 0</div>
          </div>
        )}
      </div>

      {/* C. Soft Sync */}
      <div className="rounded-xl p-3" style={cardStyle}>
        <div className="font-semibold mb-2 text-sm text-slate-200">C. Soft Sync</div>
        <div className="text-sm space-y-1">
          <div className="text-slate-300">Host time: <b>{hostTime != null ? fmt(hostTime) : "—"}</b></div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Your time:</span>
            <input type="number" value={myTime}
                   onChange={(e) => setMyTime(Number(e.target.value))}
                   className="rounded px-2 py-1 w-24 text-sm outline-none text-white focus-sky"
                   style={{ background: "#071220", border: "1px solid #1a3d5c" }} />
            <span className="text-slate-500">s</span>
          </div>
          {drift != null && (
            <div style={{ color: Number(drift) > 0 ? "#fbbf24" : "#38bdf8" }}>
              You are {Math.abs(drift)}s {Number(drift) > 0 ? "behind" : "ahead"}
            </div>
          )}
          <button onClick={() => socket?.emit("resync_request")}
                  className="mt-2 rounded px-3 py-1 text-sm transition-colors text-slate-300"
                  style={{ background: "#0d1d35" }}>
            Resync
          </button>
        </div>
      </div>
    </div>
  );
}
