import React, { useEffect, useRef } from "react";
import { loadYouTubeAPI } from "../utils/youtube.js";
import { computeSyncAction, applySyncToPlayer, lagAdjustedTarget } from "../utils/syncEngine.js";

/**
 * YouTubePlayer
 *
 * Host:
 *  - Emits play/pause/seek via onStateChange
 *  - Emits periodic sync_state every 5s
 *  - Detects manual seeks via 1s polling
 *
 * Clients (Hard Sync mode):
 *  - Receives play/pause/seek/sync_state
 *  - Uses syncEngine for smooth drift correction:
 *      drift < 0.75s → ignore
 *      drift 0.75-2s → rate adjust (no seek)
 *      drift > 2s    → hard seek
 *
 * Clients (Presence Mode):
 *  - Receives host_time for awareness
 *  - Does NOT auto-seek or auto-play
 *  - User controls their own playback
 *  - Emits user_pause when pausing
 *
 * Props:
 *  videoId, isHost, socket, initial, isPresenceMode, onTimeUpdate
 */
export default function YouTubePlayer({
  videoId,
  isHost,
  socket,
  initial,
  isPresenceMode = false,
  onTimeUpdate,
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const lastEmitRef = useRef(0);
  const suppressRef = useRef(false);
  const driftTimerRef = useRef(null);
  const rateTimerRef = useRef(null); // for soft sync rate correction reset

  // ── Mount / re-mount when videoId changes ────────────────────────────
  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;

    loadYouTubeAPI().then((YT) => {
      if (destroyed) return;

      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById({
          videoId,
          startSeconds: initial?.currentTime || 0,
        });
        if (!initial?.playing) playerRef.current.pauseVideo();
        return;
      }

      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: { autoplay: 0, controls: 1, rel: 0 },
        events: {
          onReady: () => {
            if (initial?.currentTime) playerRef.current.seekTo(initial.currentTime, true);
            if (initial?.playing) playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
          },
          onStateChange: (e) => {
            // ── Host: emit play/pause events ────────────────────────────
            if (isHost) {
              if (suppressRef.current) return;
              const t = playerRef.current.getCurrentTime();
              const now = Date.now();
              if (now - lastEmitRef.current < 150) return; // debounce bursts
              lastEmitRef.current = now;
              if (e.data === 1) socket?.emit("play", { time: t });
              else if (e.data === 2) socket?.emit("pause", { time: t });
              return;
            }

            // ── Non-host in Presence Mode: emit user_pause ───────────────
            if (isPresenceMode && e.data === 2) {
              const t = playerRef.current.getCurrentTime();
              socket?.emit("user_pause", { time: t });
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
    };
  }, [videoId]);

  // ── Host: periodic drift sync every 5s ───────────────────────────────
  useEffect(() => {
    if (!isHost || !socket) return;
    driftTimerRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;
      socket.emit("sync_state", {
        time: p.getCurrentTime(),
        playing: p.getPlayerState() === 1,
      });
    }, 5000);
    return () => clearInterval(driftTimerRef.current);
  }, [isHost, socket]);

  // ── Host: detect manual seeks (compare expected vs actual 1/s) ───────
  useEffect(() => {
    if (!isHost || !socket) return;
    let lastT = 0;
    let lastWall = Date.now();
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;
      const t = p.getCurrentTime();
      const expected = lastT + (Date.now() - lastWall) / 1000;
      if (p.getPlayerState() === 1 && Math.abs(t - expected) > 1.5) {
        socket.emit("seek", { time: t });
      }
      lastT = t;
      lastWall = Date.now();

      // Report current time to parent (for FloatingWidget local time display)
      onTimeUpdate?.(t);
    }, 1000);
    return () => clearInterval(id);
  }, [isHost, socket, onTimeUpdate]);

  // ── Non-host: time reporting for FloatingWidget ───────────────────────
  useEffect(() => {
    if (isHost) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      onTimeUpdate?.(p.getCurrentTime());
    }, 1000);
    return () => clearInterval(id);
  }, [isHost, onTimeUpdate]);

  // ── Client: socket event listeners ───────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Hard sync: apply play with lag compensation
    const onPlay = (d) => {
      if (isHost) return;
      if (isPresenceMode) return; // presence mode: don't force play
      const p = playerRef.current;
      if (!p?.seekTo) return;
      const target = lagAdjustedTarget(d.time, d.serverTime, true);
      suppressRef.current = true;
      p.seekTo(target, true);
      p.playVideo();
      setTimeout(() => (suppressRef.current = false), 400);
    };

    // Hard sync: apply pause
    const onPause = (d) => {
      if (isHost) return;
      if (isPresenceMode) return; // presence mode: don't force pause
      const p = playerRef.current;
      if (!p?.seekTo) return;
      suppressRef.current = true;
      p.seekTo(d.time, true);
      p.pauseVideo();
      setTimeout(() => (suppressRef.current = false), 400);
    };

    // Hard sync: seek correction
    const onSeek = (d) => {
      if (isHost) return;
      if (isPresenceMode) return;
      const p = playerRef.current;
      if (!p) return;
      suppressRef.current = true;
      p.seekTo(d.time, true);
      setTimeout(() => (suppressRef.current = false), 400);
    };

    // Periodic sync — uses soft sync engine
    const onSync = (d) => {
      if (isHost) return;
      if (isPresenceMode) return; // presence mode: ignore forced sync
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;

      const target = lagAdjustedTarget(d.time, d.serverTime, d.playing);
      const action = computeSyncAction(p.getCurrentTime(), target, d.playing);
      applySyncToPlayer(p, action, suppressRef, rateTimerRef, d.playing);
    };

    socket.on("play", onPlay);
    socket.on("pause", onPause);
    socket.on("seek", onSeek);
    socket.on("sync_state", onSync);

    return () => {
      socket.off("play", onPlay);
      socket.off("pause", onPause);
      socket.off("seek", onSeek);
      socket.off("sync_state", onSync);
    };
  }, [socket, isHost, isPresenceMode]);

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
      {videoId ? (
        <div ref={containerRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-500">
          Paste a YouTube URL to start
        </div>
      )}
    </div>
  );
}
