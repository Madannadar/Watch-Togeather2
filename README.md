# Watch Together

A Teleparty-style real-time YouTube watch party with chat, emoji reactions, and three manual sync methods.

## Stack
- Frontend: React (Vite) + Tailwind CSS
- Backend: Node.js + Express + Socket.IO
- Video: YouTube IFrame Player API
- Storage: in-memory (no DB)

## Run locally

```bash
# 1. Server
cd server
npm install
npm start          # http://localhost:4000

# 2. Client (new terminal)
cd client
npm install
npm run dev        # http://localhost:5173
```

Open the client URL, click **Create Room**, and share the `/room/:id` link.

## Features
- Room system with shareable links, host election, reconnect handling
- **YouTube Sync mode**: paste any YouTube URL, play/pause/seek synced across all clients with periodic drift correction (5s)
- **Manual Sync mode**: 3 methods — Button Sync, 5s Countdown Sync, Soft Sync (drift display + resync)
- Real-time chat with auto-scroll
- Floating emoji reactions (🔥 😂 👏 ❤️ 😮)
- Responsive layout
