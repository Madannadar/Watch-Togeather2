import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";

/**
 * Chat — Enhanced for mobile + fullscreen support.
 *
 * Renders the message list + input normally.
 * Used both in the desktop sidebar and the mobile fullscreen overlay.
 */
export default function Chat({ socket, messages, compact = false }) {
  const [text, setText] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function send(e) {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit("chat_message", { text: text.trim() });
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Messages */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-3 space-y-2 ${compact ? "text-xs" : "text-sm"}`}
      >
        {messages.map((m) => (
          <div key={m.id} className="leading-snug">
            <span className="text-indigo-400 font-semibold">{m.name}: </span>
            <span className="text-slate-200 break-words">{m.text}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-slate-500 text-sm">Say hi 👋</div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="flex gap-2 p-3 border-t border-slate-800 bg-slate-900 flex-shrink-0"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-slate-800 rounded-xl px-3 py-2 outline-none text-sm
                     focus:ring-1 focus:ring-indigo-500 transition-all"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                     rounded-xl px-4 text-sm font-semibold transition-colors flex-shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/**
 * MobileChatDrawer — Slide-up chat panel for mobile + fullscreen.
 *
 * Rendered via React Portal into document.body so it works over fullscreen elements.
 * Controlled externally via `open` prop.
 */
export function MobileChatDrawer({ open, onClose, socket, messages, unreadCount }) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[9980] bg-black/60 backdrop-blur-sm transition-opacity duration-300
                    ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Drawer panel */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-[9985]
                    bg-slate-900 border-t border-slate-700 rounded-t-2xl
                    flex flex-col shadow-2xl
                    transition-transform duration-300 ease-out
                    ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ height: "65vh", maxHeight: "600px" }}
      >
        {/* Drawer handle + header */}
        <div
          onClick={onClose}
          className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto" />
          </div>
          <span className="font-semibold text-slate-200 absolute left-1/2 -translate-x-1/2">
            💬 Chat
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        {/* Chat content */}
        <div className="flex-1 min-h-0">
          <Chat socket={socket} messages={messages} compact />
        </div>
      </div>
    </>,
    document.body
  );
}
