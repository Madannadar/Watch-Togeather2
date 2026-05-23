import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import ReactDOM from "react-dom";
import { nameToGradient } from "./NameModal.jsx";

/* ── Emoji quick-pick grid (lightweight, zero dependency) ────────── */
const QUICK_EMOJIS = [
  "😂","❤️","🔥","👏","😮","💯","🎉","😎",
  "👀","💀","🥺","✨","😭","🤣","❤️‍🔥","🙌",
  "😍","🤩","🥰","😤","💪","🫡","🤯","😱",
  "👍","🤝","💔","😈","🎬","🍿","🎵","🎮",
  "⭐","💎","🌟","👑","🏆","🎯","🚀","💫",
];
const MSG_REACTIONS = ["❤️","😂","🔥","👍","😮"];

/* ── Helper: relative time ────────────────────────────────────────── */
function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ── Helper: date separator label ─────────────────────────────────── */
function dateSeparator(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── Avatar ───────────────────────────────────────────────────────── */
const Avatar = memo(function Avatar({ name, size = 32 }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const [from, to] = nameToGradient(name);
  return (
    <div
      className="flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {initials}
    </div>
  );
});

/* ── Typing indicator ─────────────────────────────────────────────── */
function TypingIndicator({ typers }) {
  if (!typers || typers.length === 0) return null;
  const text = typers.length === 1
    ? `${typers[0]} is typing`
    : typers.length === 2
    ? `${typers[0]} and ${typers[1]} are typing`
    : `${typers[0]} and ${typers.length - 1} others are typing`;
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 msg-animate">
      <div className="flex gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-xs text-slate-500 italic">{text}</span>
    </div>
  );
}

/* ── Single message bubble ────────────────────────────────────────── */
const MessageBubble = memo(function MessageBubble({
  msg, isOwn, showAvatar, showName, onReply, onReact, myId,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  return (
    <div
      className={`flex gap-2 msg-animate group ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0 flex items-end">
        {showAvatar && <Avatar name={msg.name} size={30} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] min-w-[120px] relative ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name */}
        {showName && !isOwn && (
          <div className="text-xs font-semibold text-sky-400 mb-0.5 ml-1">{msg.name}</div>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <div
            className="text-xs rounded-lg px-2.5 py-1.5 mb-1 border-l-2 border-sky-500 truncate"
            style={{ background: "#0a1628", color: "#64748b", maxWidth: "100%" }}
          >
            <span className="text-sky-400 font-medium">{msg.replyTo.name}</span>
            <span className="ml-1">{msg.replyTo.text?.slice(0, 60)}</span>
          </div>
        )}

        {/* Message body */}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words relative
                      ${isOwn
                        ? "bg-sky-600 text-white rounded-br-md"
                        : "rounded-bl-md text-slate-200"
                      }`}
          style={isOwn ? {} : { background: "#0d1d35" }}
        >
          <div className="whitespace-pre-wrap">{msg.text}</div>
          <div className={`text-[10px] mt-1 ${isOwn ? "text-sky-200/60" : "text-slate-500"} text-right`}>
            {formatTime(msg.ts)}
          </div>
        </div>

        {/* Reactions on message */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex gap-0.5 mt-0.5 flex-wrap">
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <span
                key={emoji}
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "#0a1628", border: "1px solid #1a3d5c" }}
              >
                {emoji} {users.length > 1 ? users.length : ""}
              </span>
            ))}
          </div>
        )}

        {/* Hover action buttons */}
        {showActions && (
          <div
            className={`absolute top-0 flex gap-0.5 z-10
                        ${isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"}`}
          >
            <button
              onClick={() => onReply?.(msg)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs
                         hover:bg-navy-700 text-slate-400 hover:text-sky-400 transition-colors"
              title="Reply"
            >↩</button>
            <button
              onClick={() => setShowReactionPicker((v) => !v)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs
                         hover:bg-navy-700 text-slate-400 hover:text-sky-400 transition-colors"
              title="React"
            >😀</button>
          </div>
        )}

        {/* Reaction picker popup */}
        {showReactionPicker && (
          <div
            className={`absolute z-20 flex gap-1 rounded-xl p-1.5 shadow-navy-lg glass
                        ${isOwn ? "right-0" : "left-0"}`}
            style={{ top: "-36px" }}
          >
            {MSG_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => { onReact?.(msg.id, e); setShowReactionPicker(false); }}
                className="text-base hover:scale-125 active:scale-110 transition-transform w-7 h-7
                           flex items-center justify-center rounded-lg hover:bg-navy-700"
              >{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

/* ── Emoji picker panel ───────────────────────────────────────────── */
function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 glass rounded-xl p-3 shadow-navy-lg msg-animate z-30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400">Emojis</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">✕</button>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="text-xl h-9 flex items-center justify-center rounded-lg
                       hover:bg-navy-700 active:scale-110 transition-all"
          >{e}</button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Main Chat Component
   ══════════════════════════════════════════════════════════════════════ */
export default function Chat({ socket, messages, myId, compact = false }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typers, setTypers] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const autoScrollRef = useRef(true);

  /* ── Smart auto-scroll ──────────────────────────────────────────── */
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }

  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* ── Typing indicator events ────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;
    const onTyping = ({ name: n, userId }) => {
      if (userId === myId) return;
      setTypers((prev) => (prev.includes(n) ? prev : [...prev, n]));
    };
    const onStopTyping = ({ name: n }) => {
      setTypers((prev) => prev.filter((t) => t !== n));
    };
    socket.on("typing_start", onTyping);
    socket.on("typing_stop", onStopTyping);
    return () => {
      socket.off("typing_start", onTyping);
      socket.off("typing_stop", onStopTyping);
    };
  }, [socket, myId]);

  /* ── Emit typing events ─────────────────────────────────────────── */
  function handleInputChange(e) {
    setText(e.target.value);
    if (!typingRef.current && socket) {
      typingRef.current = true;
      socket.emit("typing_start");
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
      socket?.emit("typing_stop");
    }, 2000);
  }

  /* ── Send message ───────────────────────────────────────────────── */
  function send(e) {
    e?.preventDefault();
    if (!text.trim() || !socket) return;
    const payload = { text: text.trim() };
    if (replyTo) {
      payload.replyTo = { id: replyTo.id, name: replyTo.name, text: replyTo.text?.slice(0, 80) };
    }
    socket.emit("chat_message", payload);
    setText("");
    setReplyTo(null);
    setShowEmoji(false);
    typingRef.current = false;
    clearTimeout(typingTimeoutRef.current);
    socket.emit("typing_stop");
    autoScrollRef.current = true;
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleReply(msg) {
    setReplyTo(msg);
    inputRef.current?.focus();
  }

  function handleReact(msgId, emoji) {
    socket?.emit("message_reaction", { messageId: msgId, emoji });
  }

  function insertEmoji(emoji) {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  /* ── Compute date separators + message grouping ─────────────────── */
  const groupedMessages = useMemo(() => {
    const result = [];
    let lastDate = null;
    let lastSender = null;

    messages.forEach((msg, i) => {
      const msgDate = dateSeparator(msg.ts);
      if (msgDate !== lastDate) {
        result.push({ type: "date", label: msgDate, key: `date-${msg.ts}` });
        lastDate = msgDate;
        lastSender = null;
      }
      const showAvatar = msg.userId !== lastSender;
      const showName = msg.userId !== lastSender;
      result.push({
        type: "msg",
        msg,
        isOwn: msg.userId === myId,
        showAvatar,
        showName,
        key: msg.id,
      });
      lastSender = msg.userId;
    });
    return result;
  }, [messages, myId]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#050d1a" }}>
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="text-4xl">💬</div>
            <p className="text-slate-500 text-sm">No messages yet</p>
            <p className="text-slate-600 text-xs">Be the first to say hi! 👋</p>
          </div>
        )}

        {groupedMessages.map((item) => {
          if (item.type === "date") {
            return (
              <div key={item.key} className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500 font-medium px-2">{item.label}</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            );
          }
          return (
            <MessageBubble
              key={item.key}
              msg={item.msg}
              isOwn={item.isOwn}
              showAvatar={item.showAvatar}
              showName={item.showName}
              onReply={handleReply}
              onReact={handleReact}
              myId={myId}
            />
          );
        })}

        {/* Typing indicator */}
        <TypingIndicator typers={typers} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t relative" style={{ borderColor: "#0d1d35", background: "#071220" }}>
        {/* Emoji picker */}
        {showEmoji && (
          <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
        )}

        {/* Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs border-b" style={{ borderColor: "#0d1d35" }}>
            <div className="flex-1 truncate">
              <span className="text-sky-400 font-medium">↩ {replyTo.name}:</span>
              <span className="text-slate-500 ml-1">{replyTo.text?.slice(0, 50)}</span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-slate-500 hover:text-slate-300 flex-shrink-0"
            >✕</button>
          </div>
        )}

        {/* Input row */}
        <form onSubmit={send} className="flex items-end gap-2 p-2.5">
          {/* Emoji toggle */}
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0
                       transition-colors
                       ${showEmoji ? "bg-sky-600 text-white" : "text-slate-400 hover:text-sky-400 hover:bg-navy-800"}`}
          >
            😊
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-navy-800 rounded-xl px-3 py-2 outline-none text-sm
                       text-white placeholder-slate-500 resize-none max-h-24 focus-sky
                       transition-all leading-relaxed"
            style={{
              background: "#0a1628",
              height: text.includes("\n") ? "auto" : "38px",
              minHeight: "38px",
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                       bg-sky-600 text-white disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-sky-500 active:bg-sky-700 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MobileChatDrawer — portal-rendered slide-up panel
   ══════════════════════════════════════════════════════════════════════ */
export function MobileChatDrawer({ open, onClose, socket, messages, myId, unreadCount }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[9980] transition-opacity duration-300
                    ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(2,13,26,0.75)", backdropFilter: "blur(4px)" }}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-[9985]
                    flex flex-col shadow-2xl rounded-t-2xl
                    transition-transform duration-300 ease-out
                    ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{
          height: "70vh",
          maxHeight: "650px",
          background: "#050d1a",
          borderTop: "1px solid #0d1d35",
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0 cursor-pointer"
          style={{ borderBottom: "1px solid #0d1d35" }}
          onClick={onClose}
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-1 rounded-full" style={{ background: "#1a3d5c" }} />
          </div>
          <span className="font-semibold text-slate-200 text-sm absolute left-1/2 -translate-x-1/2">
            💬 Chat
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg w-8 h-8 flex items-center justify-center
                       rounded-lg transition-colors"
            style={{ background: "#0d1d35" }}
          >✕</button>
        </div>

        {/* Chat */}
        <div className="flex-1 min-h-0">
          <Chat socket={socket} messages={messages} myId={myId} compact />
        </div>
      </div>
    </>,
    document.body
  );
}
