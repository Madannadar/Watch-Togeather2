/**
 * syncEngine.js — Smooth sync correction engine
 *
 * Rules:
 *  drift < 0.75s  → ignore (natural jitter)
 *  0.75s ≤ drift < 2s → adjust playbackRate (soft correction)
 *  drift ≥ 2s     → seekTo directly (hard correction)
 *
 * Rate correction:
 *  - Behind host: rate = 1.06 (catch up slowly)
 *  - Ahead of host: rate = 0.94 (slow down)
 *  - Auto-resets to 1.0 after 8 seconds
 *  - Prevents constant seeking which feels unnatural
 */

const DRIFT_IGNORE_THRESHOLD = 0.75;   // seconds — ignore jitter below this
const DRIFT_SOFT_THRESHOLD = 2.0;      // seconds — soft rate correction below this
const RATE_BEHIND = 1.06;              // playback rate when behind host
const RATE_AHEAD = 0.94;              // playback rate when ahead of host
const RATE_NORMAL = 1.0;
const RATE_CORRECTION_DURATION = 8000; // ms — max time to run rate correction

/**
 * @typedef {'none'|'rate'|'seek'} SyncActionType
 * @typedef {{ type: SyncActionType, target?: number, rate?: number }} SyncAction
 */

/**
 * Compute what sync action should be taken given current and target time.
 *
 * @param {number} currentTime   — local player's current time (seconds)
 * @param {number} targetTime    — host's target time (seconds, lag-adjusted)
 * @param {boolean} isPlaying    — whether playback should be active
 * @returns {SyncAction}
 */
export function computeSyncAction(currentTime, targetTime, isPlaying) {
  const drift = targetTime - currentTime; // positive = we are behind host
  const absDrift = Math.abs(drift);

  if (absDrift < DRIFT_IGNORE_THRESHOLD) {
    return { type: "none" };
  }

  if (absDrift < DRIFT_SOFT_THRESHOLD) {
    const rate = drift > 0 ? RATE_BEHIND : RATE_AHEAD;
    return { type: "rate", rate, target: targetTime };
  }

  return { type: "seek", target: targetTime };
}

/**
 * Apply a SyncAction to a YouTube IFrame Player instance.
 * Handles rate correction timer management via a rateTimerRef.
 *
 * @param {object} player          — YT.Player instance
 * @param {SyncAction} action
 * @param {{ current: boolean }} suppressRef — ref to suppress re-emits
 * @param {{ current: number|null }} rateTimerRef — ref to store rate reset timer
 * @param {boolean} isPlaying
 */
export function applySyncToPlayer(player, action, suppressRef, rateTimerRef, isPlaying) {
  if (!player || !player.seekTo) return;

  if (action.type === "none") {
    // Still ensure play/pause state is correct
    _syncPlayState(player, isPlaying);
    return;
  }

  suppressRef.current = true;

  if (action.type === "seek") {
    // Clear any running rate correction
    if (rateTimerRef.current) {
      clearTimeout(rateTimerRef.current);
      rateTimerRef.current = null;
    }
    if (player.setPlaybackRate) player.setPlaybackRate(RATE_NORMAL);

    player.seekTo(action.target, true);
    _syncPlayState(player, isPlaying);
    setTimeout(() => (suppressRef.current = false), 400);
    return;
  }

  if (action.type === "rate") {
    if (player.setPlaybackRate) {
      player.setPlaybackRate(action.rate);

      // Auto-reset rate after RATE_CORRECTION_DURATION
      if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
      rateTimerRef.current = setTimeout(() => {
        if (player.setPlaybackRate) player.setPlaybackRate(RATE_NORMAL);
        rateTimerRef.current = null;
      }, RATE_CORRECTION_DURATION);
    }
    _syncPlayState(player, isPlaying);
    suppressRef.current = false;
  }
}

/**
 * Compute lag-adjusted target time from server timestamp.
 *
 * @param {number} time        — time reported by host (seconds)
 * @param {number} serverTime  — server epoch when event was sent (ms)
 * @param {boolean} isPlaying  — if playing, we add network lag to compensate
 * @returns {number}           — lag-adjusted target (seconds)
 */
export function lagAdjustedTarget(time, serverTime, isPlaying) {
  const lag = (Date.now() - serverTime) / 1000;
  return time + (isPlaying ? Math.max(0, lag) : 0);
}

function _syncPlayState(player, isPlaying) {
  try {
    const state = player.getPlayerState?.();
    if (isPlaying && state !== 1) player.playVideo?.();
    if (!isPlaying && state === 1) player.pauseVideo?.();
  } catch (_) { /* player may not be ready yet */ }
}
