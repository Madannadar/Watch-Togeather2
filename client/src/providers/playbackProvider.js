/**
 * playbackProvider.js — Abstract playback provider interface.
 *
 * This is the extension-ready abstraction layer.
 * Future providers: Netflix, Prime Video, Twitch, local <video>.
 *
 * A provider is a plain object with a consistent shape.
 * No classes, no inheritance — just factory functions.
 *
 * Provider shape:
 * {
 *   type: string,
 *   play: () => void,
 *   pause: () => void,
 *   seek: (seconds: number) => void,
 *   getCurrentTime: () => number,
 *   getPlayerState: () => 'playing' | 'paused' | 'buffering' | 'idle',
 *   setPlaybackRate: (rate: number) => void,
 *   onStateChange: (callback: (state) => void) => () => void,  // returns unsubscribe fn
 *   destroy: () => void,
 * }
 */

import { youtubeProvider } from "./youtubeProvider.js";
import { html5Provider } from "./html5Provider.js";

/**
 * Factory: create a playback provider by type.
 *
 * @param {'youtube'|'html5'} type
 * @param {object} options  — provider-specific options (player instance, element, etc.)
 * @returns {PlaybackProvider}
 */
export function createPlaybackProvider(type, options = {}) {
  switch (type) {
    case "youtube":
      return youtubeProvider(options);
    case "html5":
      return html5Provider(options);
    default:
      throw new Error(`[PlaybackProvider] Unknown provider type: "${type}"`);
  }
}

/**
 * Validate that a provider conforms to the expected interface.
 * Useful during development to catch incomplete provider implementations.
 *
 * @param {object} provider
 * @returns {boolean}
 */
export function isValidProvider(provider) {
  const required = ["play", "pause", "seek", "getCurrentTime", "getPlayerState", "destroy"];
  return required.every((method) => typeof provider[method] === "function");
}
