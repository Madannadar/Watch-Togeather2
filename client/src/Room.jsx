import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "./hooks/useSocket.js";
import { extractVideoId } from "./utils/youtube.js";
import YouTubePlayer from "./components/YouTubePlayer.jsx";
import Chat, { MobileChatDrawer } from "./components/Chat.jsx";
import ManualSync from "./components/ManualSync.jsx";
import { ReactionBar, FloatingReactions } from "./components/Reactions.jsx";
import PresencePanel from "./components/PresencePanel.jsx";
import FloatingWidget from "./components/FloatingWidget.jsx";
import { ToastContainer, toast } from "./components/Toast.jsx";
import NameModal from "./components/NameModal.jsx";
import { RoomSkeleton, RoomNotFound } from "./components/RoomSkeleton.jsx";
import { usePresence } from "./hooks/usePresence.js";
import { useSyncMode } from "./hooks/useSyncMode.js";
import { useAudio } from "./hooks/useAudio.js";

export default function Room() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();

  // ── Name handling ─────────────────────────────────────────────────
  const [name, setName] = useState(() => localStorage.getItem("wt_name") || "");
  const [nameReady, setNameReady] = useState(!!name);

  function onNameConfirm(n) {
    setName(n);
    setNameReady(true);
  }

  // Only connect socket after name is confirmed
  const { socket, connected } = useSocket(nameReady ? roomId : null, name);
  const audio = useAudio();

  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [copyOk, setCopyOk] = useState(false);
  const [localTime, setLocalTime] = useState(null);

  // Mobile chat drawer
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Loading / not found
  const [notFound, setNotFound] = useState(false);

  // Manual mode
  const [instruction, setInstruction] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [hostTime, setHostTime] = useState(null);

  const myId = socket?.id;
  const isHost = state && myId && state.hostId === myId;

  // ── Room not found timeout ────────────────────────────────────────
  useEffect(() => {
    if (state) return; // already received state
    if (!nameReady) return; // haven't joined yet
    const timer = setTimeout(() => {
      if (!state) setNotFound(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [nameReady, state]);

  // ── Sync Mode ─────────────────────────────────────────────────────
  const { syncMode, setSyncMode, isPresenceMode } = useSyncMode({
    socket, isHost, initialMode: "hard",
  });

  // ── Presence ──────────────────────────────────────────────────────
  const playerTimeRef = useRef(null);
  const getPlayerTime = () => playerTimeRef.current ?? 0;
  const { viewers } = usePresence({
    socket, isHost,
    hostId: state?.hostId,
    hostProjectedTime: state?.currentTime,
    getPlayerTime,
  });

  function onTimeUpdate(t) {
    playerTimeRef.current = t;
    setLocalTime(t);
  }

  // ── Socket wiring ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onState = (s) => {
      const prev = state;
      setState(s);
      setNotFound(false);

      if (prev && s.users.length > prev.users.length) {
        audio.play("join");
        const newUser = s.users.find((u) => !prev.users.some((p) => p.id === u.id));
        if (newUser && newUser.id !== myId) toast.show(`${newUser.name} joined`, "info");
      }
      if (prev && s.users.length < prev.users.length) {
        audio.play("leave");
        const leftUser = prev.users.find((u) => !s.users.some((p) => p.id === u.id));
        if (leftUser && leftUser.id !== myId) toast.show(`${leftUser.name} left`, "info");
      }
    };

    const onChat = (m) => {
      setMessages((prev) => [...prev, m]);
      setChatOpen((open) => { if (!open) setUnreadCount((c) => c + 1); return open; });
    };

    // Handle message reactions (merge into messages)
    const onMsgReaction = ({ messageId, emoji, userId, name: reactorName }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes(reactorName)) {
          reactions[emoji] = [...reactions[emoji], reactorName];
        }
        return { ...m, reactions };
      }));
    };

    const onReaction = ({ emoji, id }) => {
      const item = { emoji, id, x: 10 + Math.random() * 80 };
      setReactions((prev) => [...prev, item]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2600);
    };

    const onManualSync = ({ time }) => {
      setInstruction(time);
      setTimeout(() => setInstruction(null), 8000);
    };

    const onCountdown = ({ startAt }) => {
      const tick = () => {
        const remaining = Math.ceil((startAt - Date.now()) / 1000);
        setCountdown(remaining);
        if (remaining <= -1) { clearInterval(tickId); setCountdown(null); }
      };
      tick();
      const tickId = setInterval(tick, 200);
    };

    const onHostTime = ({ time }) => setHostTime(time);

    const onUserPause = ({ userId, name: pauserName, time }) => {
      if (userId === myId) return;
      const min = Math.floor(time / 60);
      const sec = String(Math.floor(time % 60)).padStart(2, "0");
      toast.show(`${pauserName} paused at ${min}:${sec}`, "warning");
      audio.play("pause");
    };

    const onSyncMode = ({ syncMode: newMode }) => {
      toast.show(
        newMode === "presence"
          ? "Presence Mode — control your own playback"
          : "Hard Sync — all playback synced",
        "info"
      );
    };

    const onPlay = () => { if (!isHost) audio.play("play"); };
    const onPause = () => { if (!isHost) audio.play("pause"); };

    socket.on("room_state", onState);
    socket.on("chat_message", onChat);
    socket.on("message_reaction", onMsgReaction);
    socket.on("reaction", onReaction);
    socket.on("manual_sync", onManualSync);
    socket.on("countdown_start", onCountdown);
    socket.on("host_time", onHostTime);
    socket.on("user_pause", onUserPause);
    socket.on("sync_mode_changed", onSyncMode);
    socket.on("play", onPlay);
    socket.on("pause", onPause);

    return () => {
      socket.off("room_state", onState);
      socket.off("chat_message", onChat);
      socket.off("message_reaction", onMsgReaction);
      socket.off("reaction", onReaction);
      socket.off("manual_sync", onManualSync);
      socket.off("countdown_start", onCountdown);
      socket.off("host_time", onHostTime);
      socket.off("user_pause", onUserPause);
      socket.off("sync_mode_changed", onSyncMode);
      socket.off("play", onPlay);
      socket.off("pause", onPause);
    };
  }, [socket, myId, isHost]);

  // Host: manual mode clock
  const manualClockRef = useRef(0);
  useEffect(() => {
    if (!socket || !isHost || state?.mode !== "manual") return;
    const id = setInterval(() => {
      manualClockRef.current += 2;
      socket.emit("host_time", { time: manualClockRef.current });
    }, 2000);
    return () => clearInterval(id);
  }, [socket, isHost, state?.mode]);

  // Connection state audio
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) wasConnected.current = true;
    else if (!connected && wasConnected.current) toast.show("Reconnecting…", "error");
  }, [connected]);

  // ── Actions ───────────────────────────────────────────────────────
  function loadUrl() {
    const vid = extractVideoId(urlInput.trim());
    if (!vid) return toast.show("Invalid YouTube URL", "error");
    socket?.emit("load_video", { videoId: vid });
    setUrlInput("");
  }
  function setMode(mode) { socket?.emit("set_mode", { mode }); }
  function react(emoji) { socket?.emit("reaction", { emoji }); }
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyOk(true);
    toast.show("Link copied! 🎉", "success");
    setTimeout(() => setCopyOk(false), 1500);
  }
  function handleCatchUp() {
    if (!socket) return;
    socket.emit("resync_request");
    toast.show("Catching up…", "info");
    audio.play("sync");
  }
  function openChat() { setChatOpen(true); setUnreadCount(0); }

  const initial = useMemo(
    () => state && { currentTime: state.currentTime, playing: state.playing },
    [state?.videoId]
  );
  const hostProjectedTime = state?.currentTime ?? null;

  // ── Conditional renders ───────────────────────────────────────────

  // 1. Show name modal if no name
  if (!nameReady) {
    return <NameModal onConfirm={onNameConfirm} defaultValue={name} />;
  }

  // 2. Show not-found screen
  if (notFound) {
    return <RoomNotFound roomId={roomId} onGoHome={() => navigate("/")} />;
  }

  // 3. Show loading skeleton while waiting for first room_state
  if (!state) {
    return (
      <>
        <ToastContainer />
        <RoomSkeleton />
      </>
    );
  }

  // ── Main room layout ──────────────────────────────────────────────
  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden"
         style={{ background: "#050d1a" }}>
      <ToastContainer />

      <FloatingWidget
        roomId={roomId} connected={connected} isHost={isHost}
        hostTime={hostProjectedTime} localTime={localTime}
        userCount={state?.users?.length || 0}
        syncMode={syncMode} onSetSyncMode={setSyncMode}
        onCatchUp={handleCatchUp} onReact={react} isPresenceMode={isPresenceMode}
      />

      <MobileChatDrawer
        open={chatOpen} onClose={() => setChatOpen(false)}
        socket={socket} messages={messages} myId={myId} unreadCount={unreadCount}
      />

      {/* ── MAIN COLUMN ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">

        {/* ── TOP NAV ────────────────────────────────────────────── */}
        <header className="flex-shrink-0 backdrop-blur-sm px-3 py-2"
                style={{ background: "rgba(7,18,32,0.95)", borderBottom: "1px solid #0d1d35" }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Left */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-bold whitespace-nowrap text-white">🎬 Watch Together</h1>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
              {isHost && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: "#0c4a6e", color: "#7dd3fc" }}>HOST</span>
              )}
              {isPresenceMode && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden sm:inline"
                      style={{ background: "#155e75", color: "#67e8f9" }}>👁 Presence</span>
              )}
            </div>

            {/* Center: Mode switch */}
            <div className="flex items-center gap-1.5 flex-shrink-0 order-3 sm:order-2 w-full sm:w-auto">
              {["youtube", "manual"].map((m) => (
                <button
                  key={m} disabled={!isHost} onClick={() => setMode(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-1 sm:flex-none
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={state?.mode === m
                    ? { background: "#0284c7", color: "#fff" }
                    : { background: "#0a1628", color: "#64748b" }
                  }
                >
                  {m === "youtube" ? "▶ YouTube" : "⏱ Manual"}
                </button>
              ))}
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5 text-sm flex-shrink-0 order-2 sm:order-3">
              <code className="px-2 py-0.5 rounded text-xs hidden xs:inline"
                    style={{ background: "#0a1628", color: "#64748b" }}>{roomId}</code>
              <button onClick={copyLink}
                      className="rounded-lg px-2.5 py-1 text-xs transition-colors"
                      style={{ background: "#0d1d35", color: "#38bdf8" }}>
                {copyOk ? "✓" : "⎘ Copy"}
              </button>
              <button onClick={audio.toggle}
                      title={audio.muted ? "Unmute" : "Mute"}
                      className="rounded-lg w-8 h-7 text-sm flex items-center justify-center transition-colors"
                      style={{ background: "#0d1d35" }}>
                {audio.muted ? "🔇" : "🔔"}
              </button>
            </div>
          </div>
        </header>

        {/* ── VIDEO ──────────────────────────────────────────────── */}
        <div className="relative flex-shrink-0 bg-black">
          {state?.mode === "youtube" ? (
            <YouTubePlayer
              videoId={state?.videoId} isHost={isHost} socket={socket}
              initial={initial} isPresenceMode={isPresenceMode}
              onTimeUpdate={onTimeUpdate}
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-sm"
                 style={{ color: "#475569" }}>
              Manual Sync Mode
            </div>
          )}
          <FloatingReactions items={reactions} />

          {/* Offline overlay */}
          {!connected && (
            <div className="absolute inset-0 z-10 flex items-center justify-center"
                 style={{ background: "rgba(5,13,26,0.85)", backdropFilter: "blur(6px)" }}>
              <div className="text-center px-4">
                <div className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-300 font-semibold text-sm">Reconnecting…</p>
                <p className="text-slate-500 text-xs mt-1">Room will restore automatically</p>
              </div>
            </div>
          )}
        </div>

        {/* ── CONTROLS (scrollable area) ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3 space-y-3">
            {state?.mode === "youtube" && isHost && (
              <div className="flex gap-2">
                <input
                  value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadUrl()}
                  placeholder="Paste YouTube URL…"
                  className="flex-1 rounded-xl px-3 py-2 text-sm outline-none text-white
                             placeholder-slate-500 focus-sky transition-all"
                  style={{ background: "#0a1628", border: "1px solid #1a3d5c" }}
                />
                <button onClick={loadUrl}
                        className="rounded-xl px-4 text-sm font-semibold transition-colors text-white"
                        style={{ background: "#0284c7" }}>
                  Load
                </button>
              </div>
            )}

            {state?.mode === "manual" && (
              <ManualSync socket={socket} isHost={isHost}
                          hostTime={hostTime} instruction={instruction} countdown={countdown} />
            )}

            {state?.users?.length > 0 && (
              <PresencePanel users={state.users} viewers={viewers}
                             hostId={state.hostId} myId={myId} hostTime={hostProjectedTime} />
            )}

            <div className="hidden lg:flex items-center justify-between py-2"
                 style={{ borderTop: "1px solid #0d1d35" }}>
              <ReactionBar onReact={react} />
              <span className="text-xs text-slate-500">React 🎉</span>
            </div>
          </div>
        </div>

        {/* ── MOBILE BOTTOM BAR ──────────────────────────────────── */}
        <div className="lg:hidden flex-shrink-0 backdrop-blur-sm px-3 py-2 pb-safe"
             style={{ background: "rgba(7,18,32,0.95)", borderTop: "1px solid #0d1d35" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5 flex-1">
              {["🔥","😂","👏","❤️","😮"].map((e) => (
                <button key={e} onClick={() => react(e)}
                        className="text-lg hover:scale-125 active:scale-110 transition-transform flex-1 text-center">
                  {e}
                </button>
              ))}
            </div>
            <button onClick={openChat}
                    className="relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold
                               transition-colors flex-shrink-0 text-white"
                    style={{ background: "#0284c7" }}>
              <span>💬</span>
              <span className="hidden xs:inline">Chat</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-white text-xs font-bold rounded-full
                                  w-5 h-5 flex items-center justify-center animate-pulse"
                      style={{ background: "#ef4444" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-96 lg:flex-shrink-0 flex-col"
           style={{ borderLeft: "1px solid #0d1d35" }}>
        <div className="px-4 py-3 font-semibold text-sm flex items-center gap-2 flex-shrink-0"
             style={{ borderBottom: "1px solid #0d1d35", background: "#071220" }}>
          💬 Chat
          {state?.users?.length > 0 && (
            <span className="ml-auto text-xs text-slate-500">
              {state.users.length} viewer{state.users.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <Chat socket={socket} messages={messages} myId={myId} />
        </div>
      </div>
    </div>
  );
}
