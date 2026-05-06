import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "./config.js";

// Single socket per Room mount with auto-reconnect.
export function useSocket(roomId, name) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL, { reconnection: true });
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
