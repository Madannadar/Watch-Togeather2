import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "./useSocket.js";
import { extractVideoId } from "./youtube.js";
import YouTubePlayer from "./components/YouTubePlayer.jsx";
import Chat from "./components/Chat.jsx";
import ManualSync from "./components/ManualSync.jsx";
import { ReactionBar, FloatingReactions } from "./components/Reactions.jsx";

function randomName() {
  const n = ["Fox", "Owl", "Tiger", "Panda", "Wolf", "Otter", "Bear"];
  return n[Math.floor(Math.random() * n.length)] + Math.floor(Math.random() * 99);
}

export default function Room() {
  const { id: roomId } = useParams();
  const [name] = useState(() => {
    const k = "wt_name";
    let v = localStorage.getItem(k);
    if (!v) {
      v = randomName();
      localStorage.setItem(k, v);
    }
    return v;
  });
  const { socket, connected } = useSocket(roomId, name);

  const [state, setState] = useState(null); // server room state
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [copyOk, setCopyOk] = useState(false);

  // Manual mode UI state
  const [instruction, setInstruction] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [hostTime, setHostTime] = useState(null);

  const myId = socket?.id;
  const isHost = state && myId && state.hostId === myId;

  // ---------- Socket wiring ----------
  useEffect(() => {
    if (!socket) return;
    const onState = (s) => setState(s);
    const onChat = (m) => setMessages((prev) => [...prev, m]);
    const onReaction = ({ emoji, id }) => {
      const item = { emoji, id, x: 10 + Math.random() * 80 };
      setReactions((prev) => [...prev, item]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2600);
    };
    const onManualSync = ({ time }) => {
      setInstruction(time);
      setTimeout(() => setInstruction(null), 8000);
    };
    const onCountdown = ({ startAt }) => {
      const tick = () => {
        const remaining = Math.ceil((startAt - Date.now()) / 1000);
        setCountdown(remaining);
        if (remaining <= -1) {
          clearInterval(id);
          setCountdown(null);
        }
      };
      tick();
      const id = setInterval(tick, 200);
    };
    const onHostTime = ({ time }) => setHostTime(time);
    const onResyncReq = () => {
      // Host responds with current host_time so requester sees fresh drift.
      // (For YouTube mode the regular sync_state already covers this.)
    };

    socket.on("room_state", onState);
    socket.on("chat_message", onChat);
    socket.on("reaction", onReaction);
    socket.on("manual_sync", onManualSync);
    socket.on("countdown_start", onCountdown);
    socket.on("host_time", onHostTime);
    socket.on("resync_request", onResyncReq);

    return () => {
      socket.off("room_state", onState);
      socket.off("chat_message", onChat);
      socket.off("reaction", onReaction);
      socket.off("manual_sync", onManualSync);
      socket.off("countdown_start", onCountdown);
      socket.off("host_time", onHostTime);
      socket.off("resync_request", onResyncReq);
    };
  }, [socket]);

  // Host in manual mode broadcasts a notional "host time" tick (incrementing).
  // For demo purposes we tick host_time every 2s based on a local counter the host owns.
  const manualClockRef = useRef(0);
  useEffect(() => {
    if (!socket || !isHost || state?.mode !== "manual") return;
    const id = setInterval(() => {
      manualClockRef.current += 2;
      socket.emit("host_time", { time: manualClockRef.current });
    }, 2000);
    return () => clearInterval(id);
  }, [socket, isHost, state?.mode]);

  // ---------- Actions ----------
  function loadUrl() {
    const vid = extractVideoId(urlInput.trim());
    if (!vid) return alert("Invalid YouTube URL");
    socket?.emit("load_video", { videoId: vid });
  }
  function setMode(mode) {
    socket?.emit("set_mode", { mode });
  }
  function react(emoji) {
    socket?.emit("reaction", { emoji });
  }
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 1500);
  }

  const initial = useMemo(
    () => state && { currentTime: state.currentTime, playing: state.playing },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.videoId]
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Main column */}
      <div className="flex-1 flex flex-col p-4 gap-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">🎬 Watch Together</h1>
            <span className={`text-xs px-2 py-1 rounded ${connected ? "bg-emerald-700" : "bg-red-700"}`}>
              {connected ? "online" : "reconnecting…"}
            </span>
            {isHost && <span className="text-xs px-2 py-1 rounded bg-indigo-700">HOST</span>}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Room:</span>
            <code className="bg-slate-800 px-2 py-1 rounded">{roomId}</code>
            <button onClick={copyLink} className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1">
              {copyOk ? "Copied!" : "Copy link"}
            </button>
            <span className="text-slate-400">· {state?.users?.length || 0} viewers</span>
          </div>
        </div>

        {/* Video / placeholder */}
        <div className="relative">
          {state?.mode === "youtube" ? (
            <YouTubePlayer
              videoId={state?.videoId}
              isHost={isHost}
              socket={socket}
              initial={initial}
            />
          ) : (
            <div className="w-full aspect-video bg-slate-900 rounded-xl flex items-center justify-center text-slate-500 border border-slate-800">
              Manual Sync Mode — use controls below
            </div>
          )}
          <FloatingReactions items={reactions} />
        </div>

        {/* Bottom controls */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          {/* Mode switch */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">Mode:</span>
            {["youtube", "manual"].map((m) => (
              <button
                key={m}
                disabled={!isHost}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-sm ${
                  state?.mode === m ? "bg-indigo-600" : "bg-slate-800 hover:bg-slate-700"
                } disabled:opacity-50`}
              >
                {m === "youtube" ? "YouTube Sync" : "Manual Sync"}
              </button>
            ))}
            {!isHost && <span className="text-xs text-slate-500">(host-controlled)</span>}
          </div>

          {state?.mode === "youtube" && isHost && (
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button onClick={loadUrl} className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 text-sm font-semibold">
                Load
              </button>
            </div>
          )}

          {state?.mode === "manual" && (
            <ManualSync
              socket={socket}
              isHost={isHost}
              hostTime={hostTime}
              instruction={instruction}
              countdown={countdown}
            />
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <ReactionBar onReact={react} />
            <div className="text-xs text-slate-500">React with emojis 🎉</div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-96 h-[60vh] lg:h-screen">
        <Chat socket={socket} messages={messages} />
      </div>
    </div>
  );
}
