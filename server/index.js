// Watch Together — Express + Socket.IO server
// In-memory room store. Rooms hold mode, video state, users, and host.
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

/** rooms: Map<roomId, Room>
 * Room = {
 *   id, hostId, mode: 'youtube'|'manual',
 *   videoId, playing, currentTime, lastUpdate,
 *   users: Map<socketId, {id, name}>
 * }
 */
const rooms = new Map();

function makeRoom(id) {
  const room = {
    id,
    hostId: null,
    mode: "youtube",
    videoId: null,
    playing: false,
    currentTime: 0,
    lastUpdate: Date.now(),
    users: new Map(),
  };
  rooms.set(id, room);
  return room;
}

// Project current playback time accounting for elapsed wall clock since lastUpdate.
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
    if (!room) room = makeRoom(roomId); // allow joining via link before REST create
    joinedRoomId = roomId;
    socket.join(roomId);

    room.users.set(socket.id, { id: socket.id, name: name || "Guest" });
    // First user becomes host. Prevent multiple hosts: only set if none.
    if (!room.hostId) room.hostId = socket.id;

    // Send current state immediately so late joiners sync instantly.
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
    // Include server timestamp so clients can compensate for network delay.
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

  // Periodic drift sync from host (debounced on client side).
  socket.on("sync_state", ({ time, playing }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    room.currentTime = time;
    room.playing = playing;
    room.lastUpdate = Date.now();
    socket.to(room.id).emit("sync_state", {
      time,
      playing,
      serverTime: Date.now(),
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

  // ---------- Manual sync ----------
  // A. Button Sync — broadcast a target timestamp + instruction.
  socket.on("manual_sync", ({ time }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    io.to(room.id).emit("manual_sync", { time });
  });

  // B. Countdown Sync — broadcast startAt (epoch ms) so clients show 5s countdown.
  socket.on("countdown_start", () => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    const startAt = Date.now() + 5000;
    io.to(room.id).emit("countdown_start", { startAt });
  });

  // C. Soft Sync — host periodically reports its time; clients compute drift.
  socket.on("host_time", ({ time }) => {
    const room = rooms.get(joinedRoomId);
    if (!room || socket.id !== room.hostId) return;
    socket.to(room.id).emit("host_time", { time, serverTime: Date.now() });
  });

  socket.on("resync_request", () => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    io.to(room.hostId).emit("resync_request", { from: socket.id });
  });

  // ---------- Chat ----------
  socket.on("chat_message", ({ text }) => {
    const room = rooms.get(joinedRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user || !text) return;
    io.to(room.id).emit("chat_message", {
      id: nanoid(6),
      userId: socket.id,
      name: user.name,
      text: String(text).slice(0, 500),
      ts: Date.now(),
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
    // Promote a new host if needed (prevents multiple hosts; first remaining wins).
    if (room.hostId === socket.id) {
      const next = room.users.keys().next().value;
      room.hostId = next || null;
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
