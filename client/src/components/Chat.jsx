import React, { useEffect, useRef, useState } from "react";

export default function Chat({ socket, messages }) {
  const [text, setText] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function send(e) {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit("chat_message", { text: text.trim() });
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      <div className="px-4 py-3 border-b border-slate-800 font-semibold">Chat</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="text-indigo-400 font-semibold">{m.name}: </span>
            <span className="text-slate-200">{m.text}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-slate-500 text-sm">Say hi 👋</div>
        )}
      </div>
      <form onSubmit={send} className="p-3 border-t border-slate-800 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-slate-800 rounded-lg px-3 py-2 outline-none text-sm"
        />
        <button className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 text-sm font-semibold">
          Send
        </button>
      </form>
    </div>
  );
}
