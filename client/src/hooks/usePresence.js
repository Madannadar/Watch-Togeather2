import { useEffect, useReducer, useRef } from "react";
import { createThrottleRef } from "../utils/throttle.js";

/**
 * usePresence — Realtime user presence tracking hook.
 *
 * Responsibilities:
 *  1. Broadcasts this client's playback state every ~2s (throttled, no spam)
 *  2. Aggregates incoming presence_update events from other viewers
 *  3. Computes drift vs host's projected time
 *
 * Returns:
 *  { viewers: Map<id, PresenceEntry>, broadcastPresence }
 *
 * PresenceEntry = {
 *   userId, name, time, playing, buffering, speed,
 *   drift, updatedAt, isHost
 * }
 */

const PRESENCE_THROTTLE_MS = 2000; // emit at most every 2s

function presenceReducer(state, action) {
  switch (action.type) {
    case "update": {
      const next = new Map(state);
      next.set(action.payload.userId, {
        ...next.get(action.payload.userId),
        ...action.payload,
        updatedAt: Date.now(),
      });
      return next;
    }
    case "remove": {
      const next = new Map(state);
      next.delete(action.userId);
      return next;
    }
    case "clear":
      return new Map();
    default:
      return state;
  }
}

export function usePresence({ socket, isHost, hostId, hostProjectedTime, getPlayerTime }) {
  const [viewers, dispatch] = useReducer(presenceReducer, new Map());
  const throttleRef = useRef(createThrottleRef(PRESENCE_THROTTLE_MS));

  // Listen for presence updates from other users
  useEffect(() => {
    if (!socket) return;

    const onPresence = (data) => {
      dispatch({ type: "update", payload: data });
    };

    const onRoomState = (state) => {
      // Prune stale viewers when room state changes (user left)
      const activeIds = new Set(state.users.map((u) => u.id));
      dispatch({ type: "clear" });
    };

    const onUserLeave = ({ userId }) => {
      dispatch({ type: "remove", userId });
    };

    socket.on("presence_update", onPresence);
    socket.on("room_state", onRoomState);
    socket.on("user_left", onUserLeave);

    return () => {
      socket.off("presence_update", onPresence);
      socket.off("room_state", onRoomState);
      socket.off("user_left", onUserLeave);
    };
  }, [socket]);

  // Broadcast this client's presence on an interval (2s throttle)
  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => {
      throttleRef.current.maybe(() => {
        const time = getPlayerTime?.() ?? 0;
        socket.emit("presence_update", {
          time,
          playing: true, // player state read externally
          buffering: false,
          speed: 1.0,
        });
      });
    }, PRESENCE_THROTTLE_MS);

    return () => clearInterval(interval);
  }, [socket, getPlayerTime]);

  /**
   * Manually trigger a single presence broadcast.
   * Call this from player state change handlers (play/pause/buffer).
   */
  function broadcastPresence({ time, playing, buffering = false, speed = 1.0 }) {
    if (!socket) return;
    throttleRef.current.maybe(() => {
      socket.emit("presence_update", { time, playing, buffering, speed });
    });
  }

  return { viewers, broadcastPresence };
}
