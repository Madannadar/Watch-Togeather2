import React, { useEffect, useRef } from "react";
import { loadYouTubeAPI } from "../youtube.js";

/**
 * YouTubePlayer
 *  - Host: emits play/pause/seek + periodic drift sync_state every 5s.
 *  - Clients: react to incoming events. Compensates for network latency using
 *    serverTime so playback aligns with the host's clock.
 */
export default function YouTubePlayer({ videoId, isHost, socket, initial }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const lastEmitRef = useRef(0);
  const suppressRef = useRef(false); // ignore self-triggered state changes after remote sync
  const driftTimerRef = useRef(null);

  // Mount / re-mount when videoId changes.
  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;
    loadYouTubeAPI().then((YT) => {
      if (destroyed) return;
      // Reuse player if exists, else create.
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
            if (!isHost) return;
            // YT.PlayerState: 1 PLAYING, 2 PAUSED
            if (suppressRef.current) return;
            const t = playerRef.current.getCurrentTime();
            const now = Date.now();
            if (now - lastEmitRef.current < 150) return; // debounce bursts
            lastEmitRef.current = now;
            if (e.data === 1) socket?.emit("play", { time: t });
            else if (e.data === 2) socket?.emit("pause", { time: t });
          },
        },
      });
    });
    return () => {
      destroyed = true;
    };
  }, [videoId]);

  // Host: periodic drift sync every 5s.
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

  // Host: detect manual seeks (compare expected vs actual once per second).
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
    }, 1000);
    return () => clearInterval(id);
  }, [isHost, socket]);

  // Client listeners. Compensate latency: target = time + (now - serverTime)/1000.
  useEffect(() => {
    if (!socket) return;
    const apply = (data, shouldPlay) => {
      const p = playerRef.current;
      if (!p || !p.seekTo) return;
      const lag = (Date.now() - data.serverTime) / 1000;
      const target = data.time + (shouldPlay ? Math.max(0, lag) : 0);
      suppressRef.current = true;
      p.seekTo(target, true);
      if (shouldPlay) p.playVideo();
      else p.pauseVideo();
      setTimeout(() => (suppressRef.current = false), 400);
    };
    const onPlay = (d) => !isHost && apply(d, true);
    const onPause = (d) => !isHost && apply(d, false);
    const onSeek = (d) => {
      if (isHost) return;
      const p = playerRef.current;
      if (!p) return;
      suppressRef.current = true;
      p.seekTo(d.time, true);
      setTimeout(() => (suppressRef.current = false), 400);
    };
    const onSync = (d) => {
      if (isHost) return;
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;
      const lag = (Date.now() - d.serverTime) / 1000;
      const target = d.time + (d.playing ? Math.max(0, lag) : 0);
      // Only correct if drift > 0.75s to avoid jitter.
      if (Math.abs(p.getCurrentTime() - target) > 0.75) {
        suppressRef.current = true;
        p.seekTo(target, true);
        setTimeout(() => (suppressRef.current = false), 400);
      }
      if (d.playing && p.getPlayerState() !== 1) p.playVideo();
      if (!d.playing && p.getPlayerState() === 1) p.pauseVideo();
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
  }, [socket, isHost]);

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

// Expose a getter on window for ManualSync soft drift display.
// (Used by Room.jsx via querying the iframe player instance.)
