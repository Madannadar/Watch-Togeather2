// Watch Together — Express + Socket.IO server
// In-memory room store. Rooms hold mode, video state, users, host, and sync mode.
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();

function makeRoom(id) {
  const room = {
    id,
    hostId: null,
    mode: "youtube",
    syncMode: "hard",
    videoId: null,
    playing: false,
    currentTime: 0,
    lastUpdate: Date.now(),
    users: new Map(),
  };
  rooms.set(id, room);
  return room;
}

function projectedTime(room) {
  if (!room.playing) return room.currentTime;
  const elapsed = (Date.now() - room.lastUpdate) / 1000;
  return room.currentTime + elapsed;
}

function publicState(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    mode: room.mode,
    syncMode: room.syncMode,
    videoId: room.videoId,
    playing: room.playing,
    currentTime: projectedTime(room),
    serverTime: Date.now(),
    users: [...room.users.values()],
  };
}

function broadcastUsers(room) {
  io.to(room.id).emit("room_state", publicState(room));
}

// REST: health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Backend is working perfectly!" });
});

// REST: create room
app.post("/api/rooms", (_req, res) => {
  const id = nanoid(8);
  makeRoom(id);
  res.json({ id });
});

app.get("/api/rooms/:id", (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: "not found" });
  res.json(publicState(room));
});

io.on("connection", (socket) => {
  let joinedRoomId = null;

  socket.on("join_room", ({ roomId, name }) => {
    let room = rooms.get(roomId);
    if (!room) room = makeRoom(roomId);
    joinedRoomId = roomId;
    socket.join(roomId);

    room.users.set(socket.id, { id: socket.id, name: name || "Guest" });
    if (!room.hostId) room.hostId = socket.id;

    socket.emit("room_state", publicState(room));
    broadcastUsers(room);
  });

  // ---------- YouTube sync ----------
  socket.on("load_video", ({ videoId }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    room.videoId = videoId;
    room.currentTime = 0;
    room.playing = false;
    room.lastUpdate = Date.now();
    io.to(room.id).emit("room_state", publicState(room));
  });

  socket.on("play", ({ time }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    room.playing = true;
    room.currentTime = time;
    room.lastUpdate = Date.now();
    io.to(room.id).emit("play", { time, serverTime: Date.now() });
  });

  socket.on("pause", ({ time }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    room.playing = false;
    room.currentTime = time;
    room.lastUpdate = Date.now();
    io.to(room.id).emit("pause", { time, serverTime: Date.now() });
  });

  socket.on("seek", ({ time }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    room.currentTime = time;
    room.lastUpdate = Date.now();
    io.to(room.id).emit("seek", { time, serverTime: Date.now() });
  });

  socket.on("sync_state", ({ time, playing }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    room.currentTime = time;
    room.playing = playing;
    room.lastUpdate = Date.now();
    socket.to(room.id).emit("sync_state", {
      time, playing, serverTime: Date.now(),
    });
  });

  // ---------- Mode switch ----------
  socket.on("set_mode", ({ mode }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    if (mode !== "youtube" && mode !== "manual") return;
    room.mode = mode;
    io.to(room.id).emit("room_state", publicState(room));
  });

  // ---------- Sync Mode (hard | presence) ----------
  socket.on("set_sync_mode", ({ syncMode }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    if (syncMode !== "hard" && syncMode !== "presence") return;
    room.syncMode = syncMode;
    io.to(room.id).emit("sync_mode_changed", { syncMode });
    io.to(room.id).emit("room_state", publicState(room));
  });

  // ---------- Manual sync ----------
  socket.on("manual_sync", ({ time }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    io.to(room.id).emit("manual_sync", { time });
  });

  socket.on("countdown_start", () => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    const startAt = Date.now() + 5000;
    io.to(room.id).emit("countdown_start", { startAt });
  });

  socket.on("host_time", ({ time }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    socket.to(room.id).emit("host_time", { time, serverTime: Date.now() });
  });

  socket.on("resync_request", () => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    io.to(room.hostId).emit("resync_request", { from: socket.id });
    socket.emit("sync_state", {
      time: projectedTime(room),
      playing: room.playing,
      serverTime: Date.now(),
    });
  });

  // ---------- Presence update (relay only — stateless) ----------
  socket.on("presence_update", (data) => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user) return;
    socket.to(room.id).emit("presence_update", {
      userId: socket.id,
      name: user.name,
      time: data.time,
      playing: data.playing,
      buffering: data.buffering ?? false,
      speed: data.speed ?? 1.0,
      serverTime: Date.now(),
    });
  });

  // ---------- Non-host pause notification ----------
  socket.on("user_pause", (data) => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user) return;
    socket.to(room.id).emit("user_pause", {
      userId: socket.id,
      name: user.name,
      time: data.time,
    });
  });

  // ---------- Chat ----------
  socket.on("chat_message", ({ text, replyTo }) => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user || !text) return;
    const msg = {
      id: nanoid(6),
      userId: socket.id,
      name: user.name,
      text: String(text).slice(0, 500),
      ts: Date.now(),
    };
    // Pass through reply metadata if present
    if (replyTo && replyTo.id && replyTo.name) {
      msg.replyTo = {
        id: String(replyTo.id).slice(0, 20),
        name: String(replyTo.name).slice(0, 30),
        text: String(replyTo.text || "").slice(0, 80),
      };
    }
    io.to(room.id).emit("chat_message", msg);
  });

  // ---------- Typing indicators (stateless relay) ----------
  socket.on("typing_start", () => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user) return;
    socket.to(room.id).emit("typing_start", {
      userId: socket.id,
      name: user.name,
    });
  });

  socket.on("typing_stop", () => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user) return;
    socket.to(room.id).emit("typing_stop", {
      userId: socket.id,
      name: user.name,
    });
  });

  // ---------- Message reactions (stateless relay) ----------
  socket.on("message_reaction", ({ messageId, emoji }) => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user) return;
    io.to(room.id).emit("message_reaction", {
      messageId,
      emoji,
      userId: socket.id,
      name: user.name,
    });
  });

  // ---------- Reactions ----------
  socket.on("reaction", ({ emoji }) => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    io.to(room.id).emit("reaction", { emoji, id: nanoid(6) });
  });

  socket.on("disconnect", () => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    room.users.delete(socket.id);

    if (room.hostId === socket.id) {
      const next = room.users.keys().next().value;
      room.hostId = next || null;
      if (next) {
        io.to(room.id).emit("host_transfer", {
          newHostId: next,
          name: room.users.get(next)?.name,
        });
      }
    }

    if (room.users.size === 0) {
      rooms.delete(room.id);
    } else {
      broadcastUsers(room);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Watch Together server on :${PORT}`));
