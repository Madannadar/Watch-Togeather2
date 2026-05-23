import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "../config.js";

/**
 * useSocket — Single Socket.IO connection per Room mount.
 * Auto-reconnects and re-joins room on every connect event.
 *
 * If roomId is null/undefined, skips connection entirely (used
 * when the name modal hasn't been confirmed yet).
 */
export function useSocket(roomId, name) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Don't connect if no roomId (name not confirmed yet)
    if (!roomId) return;

    const s = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      s.emit("join_room", { roomId, name });
    });

    s.on("disconnect", () => setConnected(false));

    return () => {
      s.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomId, name]);

  return { socket: socketRef.current, connected };
}
