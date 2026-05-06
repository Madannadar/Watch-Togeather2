import React from "react";

export const EMOJIS = ["🔥", "😂", "👏", "❤️", "😮"];

export function ReactionBar({ onReact }) {
  return (
    <div className="flex gap-2">
      {EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onReact(e)}
          className="text-2xl hover:scale-125 transition-transform"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// Floating reactions overlay. Each reaction has a random horizontal offset.
export function FloatingReactions({ items }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it) => (
        <span
          key={it.id}
          className="float-emoji absolute text-4xl"
          style={{ left: `${it.x}%`, bottom: "10%" }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
}
