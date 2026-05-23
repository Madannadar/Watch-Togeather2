import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "../config.js";

/**
 * useSocket — Single Socket.IO connection per Room mount.
 * Auto-reconnects and re-joins room on every connect event.
 * Now lives in /hooks/ for clean imports.
 */
export function useSocket(roomId, name) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      // (Re)join on every connect handles graceful reconnects.
      s.emit("join_room", { roomId, name });
    });

    s.on("disconnect", () => setConnected(false));

    return () => s.disconnect();
  }, [roomId, name]);

  return { socket: socketRef.current, connected };
}
