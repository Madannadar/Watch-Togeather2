import { useState, useCallback } from "react";

/**
 * useSyncMode — Manages sync mode for the room.
 *
 * Modes:
 *  'hard'     — Host controls all playback (existing behavior)
 *  'presence' — Viewers can pause independently; host status always visible
 *               Users can manually "catch up" to host
 *
 * Only the host can change the mode for the room.
 * Mode is stored in room_state via server.
 */
export function useSyncMode({ socket, isHost, initialMode = "hard" }) {
  const [syncMode, setSyncModeLocal] = useState(initialMode);

  const setSyncMode = useCallback(
    (mode) => {
      if (!isHost || !socket) return;
      if (mode !== "hard" && mode !== "presence") return;
      setSyncModeLocal(mode);
      // Reuse existing set_mode event — server already supports it
      // We extend it with a syncMode field (server ignores unknown fields)
      socket.emit("set_sync_mode", { syncMode: mode });
    },
    [isHost, socket]
  );

  const isPresenceMode = syncMode === "presence";
  const isHardMode = syncMode === "hard";

  return { syncMode, setSyncMode, isPresenceMode, isHardMode };
}
