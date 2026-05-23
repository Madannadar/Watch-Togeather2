/**
 * useAudio.js — Ambient audio cues via Web Audio API.
 *
 * Zero bundle impact: uses browser's built-in oscillator nodes.
 * AudioContext is created lazily on first user gesture (browser requirement).
 *
 * Cues:
 *  join     — ascending 3-note chime (C5-E5-G5)
 *  leave    — descending 2-note (G4-E4)
 *  play     — single mid-bright ping
 *  pause    — single low soft tone
 *  sync     — brief ascending sweep
 *  error    — low double pulse
 *
 * API:
 *  const audio = useAudio();
 *  audio.play("join");
 *  audio.muted  → boolean
 *  audio.toggle() → toggle mute
 */
import { useCallback, useRef, useState } from "react";

const MUTE_KEY = "wt_audio_muted";

/** Tiny tone generator — plays a frequency for a given duration */
function playTone(ctx, freq, startTime, duration, type = "sine", gain = 0.15) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.01);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Cue definitions: array of [freq, delay, duration, type?, gain?] */
const CUES = {
  join: [
    [523.25, 0.0, 0.12],    // C5
    [659.25, 0.12, 0.12],   // E5
    [783.99, 0.24, 0.18],   // G5
  ],
  leave: [
    [783.99, 0.0, 0.12],    // G5
    [523.25, 0.12, 0.18],   // C5
  ],
  play: [
    [880, 0.0, 0.14, "sine", 0.12],
  ],
  pause: [
    [261.63, 0.0, 0.18, "sine", 0.10],
  ],
  sync: [
    [440, 0.0, 0.06, "sine", 0.08],
    [523.25, 0.06, 0.06],
    [659.25, 0.12, 0.10],
  ],
  error: [
    [200, 0.0, 0.08, "square", 0.06],
    [200, 0.12, 0.08, "square", 0.06],
  ],
};

export function useAudio() {
  const ctxRef = useRef(null);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "true";
    } catch (_) {
      return false;
    }
  });

  /** Lazily create AudioContext on first interaction */
  function getCtx() {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browsers auto-suspend after inactivity)
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  const play = useCallback(
    (cueName) => {
      if (muted) return;
      const cue = CUES[cueName];
      if (!cue) return;

      try {
        const ctx = getCtx();
        const now = ctx.currentTime;
        cue.forEach(([freq, delay, duration, type, gain]) => {
          playTone(ctx, freq, now + delay, duration, type, gain);
        });
      } catch (err) {
        // AudioContext can fail in some environments — silently ignore
        console.warn("[useAudio] playback failed:", err.message);
      }
    },
    [muted]
  );

  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  return { play, muted, toggle };
}
