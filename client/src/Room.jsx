import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "./hooks/useSocket.js";
import { extractVideoId } from "./utils/youtube.js";
import YouTubePlayer from "./components/YouTubePlayer.jsx";
import Chat, { MobileChatDrawer } from "./components/Chat.jsx";
import ManualSync from "./components/ManualSync.jsx";
import { ReactionBar, FloatingReactions } from "./components/Reactions.jsx";
import PresencePanel from "./components/PresencePanel.jsx";
import FloatingWidget from "./components/FloatingWidget.jsx";
import { ToastContainer, toast } from "./components/Toast.jsx";
import { usePresence } from "./hooks/usePresence.js";
import { useSyncMode } from "./hooks/useSyncMode.js";
import { useAudio } from "./hooks/useAudio.js";

function randomName() {
  const n = ["Fox", "Owl", "Tiger", "Panda", "Wolf", "Otter", "Bear"];
  return n[Math.floor(Math.random() * n.length)] + Math.floor(Math.random() * 99);
}

export default function Room() {
  const { id: roomId } = useParams();
  const [name] = useState(() => {
    const k = "wt_name";
    let v = localStorage.getItem(k);
    if (!v) { v = randomName(); localStorage.setItem(k, v); }
    return v;
  });

  const { socket, connected } = useSocket(roomId, name);
  const audio = useAudio();

  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [urlInput, setUrlInput] = useState("");
  const [copyOk, setCopyOk] = useState(false);
  const [localTime, setLocalTime] = useState(null);

  // Mobile chat drawer state
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Manual mode state
  const [instruction, setInstruction] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [hostTime, setHostTime] = useState(null);

  const myId = socket?.id;
  const isHost = state && myId && state.hostId === myId;

  // ── Sync Mode ────────────────────────────────────────────────────────
  const { syncMode, setSyncMode, isPresenceMode } = useSyncMode({
    socket, isHost, initialMode: "hard",
  });

  // ── Presence ─────────────────────────────────────────────────────────
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

  // ── Socket wiring ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onState = (s) => {
      const prev = state;
      setState(s);

      if (prev && s.users.length > prev.users.length) {
        audio.play("join");
        const newUser = s.users.find((u) => !prev.users.some((p) => p.id === u.id));
        if (newUser && newUser.id !== myId) toast.show(`${newUser.name} joined the room`, "info");
      }
      if (prev && s.users.length < prev.users.length) {
        audio.play("leave");
        const leftUser = prev.users.find((u) => !s.users.some((p) => p.id === u.id));
        if (leftUser && leftUser.id !== myId) toast.show(`${leftUser.name} left the room`, "info");
      }
    };

    const onChat = (m) => {
      setMessages((prev) => [...prev, m]);
      // Increment unread badge when drawer is closed
      setChatOpen((open) => {
        if (!open) setUnreadCount((c) => c + 1);
        return open;
      });
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
          ? "Host switched to Presence Mode — control your own playback"
          : "Host switched to Hard Sync — all playback is synced",
        "info"
      );
    };

    const onPlay = () => { if (!isHost) audio.play("play"); };
    const onPause = () => { if (!isHost) audio.play("pause"); };

    socket.on("room_state", onState);
    socket.on("chat_message", onChat);
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

  // Host: manual mode clock tick
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
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
    } else if (!connected && wasConnected.current) {
      toast.show("Connection lost — reconnecting…", "error");
    }
  }, [connected]);

  // ── Actions ───────────────────────────────────────────────────────────
  function loadUrl() {
    const vid = extractVideoId(urlInput.trim());
    if (!vid) return toast.show("Invalid YouTube URL", "error");
    socket?.emit("load_video", { videoId: vid });
  }
  function setMode(mode) { socket?.emit("set_mode", { mode }); }
  function react(emoji) { socket?.emit("reaction", { emoji }); }
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyOk(true);
    toast.show("Link copied! Share with friends 🎉", "success");
    setTimeout(() => setCopyOk(false), 1500);
  }
  function handleCatchUp() {
    if (!socket) return;
    socket.emit("resync_request");
    toast.show("Catching up to host…", "info");
    audio.play("sync");
  }
  function openChat() {
    setChatOpen(true);
    setUnreadCount(0);
  }

  const initial = useMemo(
    () => state && { currentTime: state.currentTime, playing: state.playing },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.videoId]
  );

  const hostProjectedTime = state?.currentTime ?? null;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // Layout strategy:
  //  Mobile  → fixed viewport height, no page scroll
  //            [TopNav] [Video] [ControlsBar] [BottomBar w/ chat button]
  //            Chat = slide-up portal drawer
  //  Desktop → side-by-side, chat in right sidebar (unchanged)
  // ─────────────────────────────────────────────────────────────────────
  return (
    // Root: full viewport, no overflow on mobile
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      <ToastContainer />

      {/* Floating sync widget (portal) */}
      <FloatingWidget
        roomId={roomId}
        connected={connected}
        isHost={isHost}
        hostTime={hostProjectedTime}
        localTime={localTime}
        userCount={state?.users?.length || 0}
        syncMode={syncMode}
        onSetSyncMode={setSyncMode}
        onCatchUp={handleCatchUp}
        onReact={react}
        isPresenceMode={isPresenceMode}
      />

      {/* Mobile chat drawer (portal — works over fullscreen) */}
      <MobileChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        socket={socket}
        messages={messages}
        unreadCount={unreadCount}
      />

      {/* ── MAIN COLUMN ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">

        {/* ── TOP NAV ────────────────────────────────────────────────── */}
        <header className="flex-shrink-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">

            {/* Left: title + status badges */}
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base font-bold whitespace-nowrap">🎬 Watch Together</h1>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0
                               ${connected ? "bg-emerald-800 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                {connected ? "●" : "○"}
              </span>
              {isHost && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-800 text-indigo-300 font-medium flex-shrink-0">
                  HOST
                </span>
              )}
              {isPresenceMode && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-800 text-purple-300 font-medium flex-shrink-0 hidden sm:inline">
                  👁 Presence
                </span>
              )}
            </div>

            {/* Center: Mode switch — MOVED HERE FROM BELOW VIDEO */}
            <div className="flex items-center gap-1.5 flex-shrink-0 order-3 sm:order-2 w-full sm:w-auto">
              {["youtube", "manual"].map((m) => (
                <button
                  key={m}
                  disabled={!isHost}
                  onClick={() => setMode(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-1 sm:flex-none
                               ${state?.mode === m
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {m === "youtube" ? "▶ YouTube" : "⏱ Manual"}
                </button>
              ))}
              {!isHost && (
                <span className="text-xs text-slate-600 hidden sm:inline">(host only)</span>
              )}
            </div>

            {/* Right: room ID, copy, audio */}
            <div className="flex items-center gap-1.5 text-sm flex-shrink-0 order-2 sm:order-3">
              <code className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-300 hidden xs:inline">
                {roomId}
              </code>
              <button
                onClick={copyLink}
                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-lg px-2.5 py-1 text-xs transition-colors"
              >
                {copyOk ? "✓" : "⎘ Copy"}
              </button>
              <button
                onClick={audio.toggle}
                title={audio.muted ? "Unmute sounds" : "Mute sounds"}
                className="bg-slate-700 hover:bg-slate-600 rounded-lg w-8 h-7 text-sm flex items-center justify-center transition-colors"
              >
                {audio.muted ? "🔇" : "🔔"}
              </button>
            </div>
          </div>
        </header>

        {/* ── VIDEO AREA ─────────────────────────────────────────────── */}
        <div className="relative flex-shrink-0 bg-black">
          {state?.mode === "youtube" ? (
            <YouTubePlayer
              videoId={state?.videoId}
              isHost={isHost}
              socket={socket}
              initial={initial}
              isPresenceMode={isPresenceMode}
              onTimeUpdate={onTimeUpdate}
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-slate-500 text-sm">
              Manual Sync Mode
            </div>
          )}
          <FloatingReactions items={reactions} />

          {/* Offline overlay */}
          {!connected && (
            <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center px-4">
                <div className="text-2xl mb-2 animate-spin inline-block">⟳</div>
                <p className="text-slate-300 font-semibold text-sm">Reconnecting…</p>
                <p className="text-slate-500 text-xs mt-1">Room will restore automatically</p>
              </div>
            </div>
          )}
        </div>

        {/* ── SCROLLABLE CONTROLS (desktop only needs scroll, mobile clips) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3 space-y-3">

            {/* YouTube URL input (host only) */}
            {state?.mode === "youtube" && isHost && (
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadUrl()}
                  placeholder="Paste YouTube URL…"
                  className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-sm outline-none
                             focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  onClick={loadUrl}
                  className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-4 text-sm font-semibold transition-colors"
                >
                  Load
                </button>
              </div>
            )}

            {/* Manual sync controls */}
            {state?.mode === "manual" && (
              <ManualSync
                socket={socket}
                isHost={isHost}
                hostTime={hostTime}
                instruction={instruction}
                countdown={countdown}
              />
            )}

            {/* Presence panel */}
            {state?.users?.length > 0 && (
              <PresencePanel
                users={state.users}
                viewers={viewers}
                hostId={state.hostId}
                myId={myId}
                hostTime={hostProjectedTime}
              />
            )}

            {/* Reaction bar (desktop shows here; mobile shows in bottom bar) */}
            <div className="hidden lg:flex items-center justify-between py-2 border-t border-slate-800">
              <ReactionBar onReact={react} />
              <span className="text-xs text-slate-500">React 🎉</span>
            </div>
          </div>
        </div>

        {/* ── MOBILE BOTTOM BAR ─────────────────────────────────────── */}
        {/* Fixed at bottom of main column — always visible, no scroll needed */}
        <div className="lg:hidden flex-shrink-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 px-3 py-2">
          <div className="flex items-center justify-between gap-3">

            {/* Reactions */}
            <div className="flex gap-1.5 flex-1">
              {["🔥", "😂", "👏", "❤️", "😮"].map((e) => (
                <button
                  key={e}
                  onClick={() => react(e)}
                  className="text-lg hover:scale-125 active:scale-110 transition-transform flex-1 text-center"
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Chat open button with unread badge */}
            <button
              onClick={openChat}
              className="relative flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500
                         active:bg-indigo-700 rounded-xl px-4 py-2 text-sm font-semibold
                         transition-colors flex-shrink-0"
            >
              <span>💬</span>
              <span className="hidden xs:inline">Chat</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs
                                  font-bold rounded-full w-5 h-5 flex items-center justify-center
                                  animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP SIDEBAR CHAT ────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-96 lg:flex-shrink-0 border-l border-slate-800 flex-col">
        <div className="px-4 py-3 border-b border-slate-800 font-semibold text-sm flex items-center gap-2 flex-shrink-0">
          💬 Chat
          {state?.users?.length > 0 && (
            <span className="ml-auto text-xs text-slate-500">
              {state.users.length} viewer{state.users.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <Chat socket={socket} messages={messages} />
        </div>
      </div>
    </div>
  );
}
