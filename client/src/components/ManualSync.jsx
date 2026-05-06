import React, { useEffect, useState } from "react";

// Convert "1:23" or "83" -> seconds.
function parseTime(input) {
  if (!input) return 0;
  if (input.includes(":")) {
    const [m, s] = input.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  return Number(input) || 0;
}
function fmt(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ManualSync({ socket, isHost, hostTime, instruction, countdown }) {
  const [ts, setTs] = useState("");
  const [myTime, setMyTime] = useState(0);

  // Local timer for "your current time" — user updates manually with the input.
  useEffect(() => {
    const id = setInterval(() => setMyTime((t) => t), 1000);
    return () => clearInterval(id);
  }, []);

  const drift = hostTime != null ? (hostTime - myTime).toFixed(1) : null;

  return (
    <div className="space-y-4">
      {/* A. Button Sync */}
      <div className="bg-slate-800 rounded-lg p-3">
        <div className="font-semibold mb-2">A. Button Sync</div>
        {isHost ? (
          <div className="flex gap-2">
            <input
              value={ts}
              onChange={(e) => setTs(e.target.value)}
              placeholder="mm:ss or seconds"
              className="flex-1 bg-slate-900 rounded px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => socket?.emit("manual_sync", { time: parseTime(ts) })}
              className="bg-indigo-600 hover:bg-indigo-500 rounded px-3 text-sm font-semibold"
            >
              Sync Everyone
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-400">Host controls this.</div>
        )}
        {instruction != null && (
          <div className="mt-2 text-amber-400 text-sm">
            👉 Go to <b>{fmt(instruction)}</b> and press play.
          </div>
        )}
      </div>

      {/* B. Countdown Sync */}
      <div className="bg-slate-800 rounded-lg p-3">
        <div className="font-semibold mb-2">B. Countdown Sync</div>
        {isHost && (
          <button
            onClick={() => socket?.emit("countdown_start")}
            className="bg-emerald-600 hover:bg-emerald-500 rounded px-3 py-2 text-sm font-semibold"
          >
            Start Together (5s)
          </button>
        )}
        {countdown != null && (
          <div className="mt-3 text-center">
            <div className="text-6xl font-bold text-emerald-400">
              {countdown > 0 ? countdown : "▶ PLAY!"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Press play at 0</div>
          </div>
        )}
      </div>

      {/* C. Soft Sync */}
      <div className="bg-slate-800 rounded-lg p-3">
        <div className="font-semibold mb-2">C. Soft Sync</div>
        <div className="text-sm space-y-1">
          <div>Host time: <b>{hostTime != null ? fmt(hostTime) : "—"}</b></div>
          <div className="flex items-center gap-2">
            <span>Your time:</span>
            <input
              type="number"
              value={myTime}
              onChange={(e) => setMyTime(Number(e.target.value))}
              className="bg-slate-900 rounded px-2 py-1 w-24 text-sm outline-none"
            />
            <span>s</span>
          </div>
          {drift != null && (
            <div className={Number(drift) > 0 ? "text-amber-400" : "text-sky-400"}>
              You are {Math.abs(drift)}s {Number(drift) > 0 ? "behind" : "ahead"}
            </div>
          )}
          <button
            onClick={() => socket?.emit("resync_request")}
            className="mt-2 bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 text-sm"
          >
            Resync
          </button>
        </div>
      </div>
    </div>
  );
}
