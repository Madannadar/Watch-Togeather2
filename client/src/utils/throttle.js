/**
 * throttle.js — Lightweight throttle utility (no lodash needed)
 */

/**
 * Returns a throttled version of fn that fires at most once per `ms` milliseconds.
 * Leading-edge: fires immediately then blocks until ms elapsed.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Creates a ref-based throttle guard for use inside React components.
 * Returns a function that, given a callback, only invokes it if `ms` have passed
 * since the last call. Use `lastRef.current` to track state without re-renders.
 *
 * Usage:
 *   const throttleRef = useRef(createThrottleRef(2000));
 *   throttleRef.current.maybe(() => socket.emit("presence_update", data));
 *
 * @param {number} ms
 * @returns {{ maybe: (fn: Function) => void }}
 */
export function createThrottleRef(ms) {
  let last = 0;
  return {
    maybe(fn) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn();
      }
    },
    reset() {
      last = 0;
    },
  };
}
