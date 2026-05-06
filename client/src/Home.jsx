import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "./config.js";

export default function Home() {
  const nav = useNavigate();
  const [joinId, setJoinId] = useState("");
  const [busy, setBusy] = useState(false);

  async function createRoom() {
    setBusy(true);
    const res = await fetch(`${SERVER_URL}/api/rooms`, { method: "POST" });
    const { id } = await res.json();
    nav(`/room/${id}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
        <h1 className="text-3xl font-bold mb-2">🎬 Watch Together</h1>
        <p className="text-slate-400 mb-6">Sync YouTube with friends in real time.</p>
        <button
          onClick={createRoom}
          disabled={busy}
          className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg py-3 font-semibold mb-4"
        >
          Create Room
        </button>
        <div className="flex gap-2">
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Room ID"
            className="flex-1 bg-slate-800 rounded-lg px-3 py-2 outline-none"
          />
          <button
            onClick={() => joinId && nav(`/room/${joinId.trim()}`)}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg px-4"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
