import { useState, useCallback } from "react";

/**
 * useDraggable — Generic draggable position hook.
 *
 * Persists position to localStorage by storageKey.
 * Uses CSS transform for GPU-composited, zero-layout-cost dragging.
 * Works on both desktop (mouse) and mobile (touch).
 *
 * @param {string} storageKey  — localStorage key for persisting position
 * @param {{ x: number, y: number }} defaultPos — fallback initial position
 * @returns {{ x, y, isDragging, dragHandleProps }}
 */
export function useDraggable(storageKey, defaultPos = { x: 20, y: 20 }) {
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return defaultPos;
  });

  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = useCallback(
    (e) => {
      // Ignore right-click and non-primary buttons
      if (e.button !== undefined && e.button !== 0) return;

      const startX = (e.clientX ?? e.touches?.[0]?.clientX) - pos.x;
      const startY = (e.clientY ?? e.touches?.[0]?.clientY) - pos.y;
      setIsDragging(true);

      function onMove(ev) {
        const cx = ev.clientX ?? ev.touches?.[0]?.clientX;
        const cy = ev.clientY ?? ev.touches?.[0]?.clientY;
        if (cx === undefined) return;

        const newX = Math.max(0, Math.min(window.innerWidth - 320, cx - startX));
        const newY = Math.max(0, Math.min(window.innerHeight - 60, cy - startY));
        setPos({ x: newX, y: newY });
      }

      function onUp() {
        setIsDragging(false);
        setPos((p) => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(p));
          } catch (_) {}
          return p;
        });
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onUp);
    },
    [pos.x, pos.y, storageKey]
  );

  const dragHandleProps = {
    onMouseDown,
    onTouchStart: onMouseDown,
    style: { cursor: isDragging ? "grabbing" : "grab", userSelect: "none" },
  };

  return { x: pos.x, y: pos.y, isDragging, dragHandleProps };
}
