/**
 * timeFormat.js — Shared time formatting utilities
 */

/**
 * Format seconds to HH:MM:SS or MM:SS
 * @param {number} sec
 * @returns {string}
 */
export function fmt(sec) {
  sec = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Format drift in seconds to a compact string e.g. "-4s" or "+2s"
 * @param {number} drift  positive = user is behind host
 * @returns {string}
 */
export function fmtDrift(drift) {
  if (drift === null || drift === undefined || isNaN(drift)) return "";
  const abs = Math.abs(drift).toFixed(1);
  return drift > 0 ? `-${abs}s` : `+${abs}s`;
}

/**
 * Parse "mm:ss" or plain seconds string into a number of seconds.
 * @param {string} input
 * @returns {number}
 */
export function parseTime(input) {
  if (!input) return 0;
  const str = String(input).trim();
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  return Number(str) || 0;
}
