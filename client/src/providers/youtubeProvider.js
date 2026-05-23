/**
 * youtubeProvider.js — YouTube IFrame API playback provider.
 *
 * Wraps the YT.Player instance in the standard provider interface.
 * This logic is extracted from YouTubePlayer.jsx — that component
 * continues to work directly with the YT.Player for now.
 * This provider is ready for use by future extension-based sync.
 *
 * @param {{ player: YT.Player }} options
 * @returns {PlaybackProvider}
 */
export function youtubeProvider({ player } = {}) {
  let _player = player;
  const _listeners = new Set();

  function setPlayer(p) {
    _player = p;
  }

  function play() {
    _player?.playVideo?.();
  }

  function pause() {
    _player?.pauseVideo?.();
  }

  function seek(seconds) {
    _player?.seekTo?.(seconds, true);
  }

  function getCurrentTime() {
    return _player?.getCurrentTime?.() ?? 0;
  }

  function getPlayerState() {
    if (!_player?.getPlayerState) return "idle";
    const state = _player.getPlayerState();
    // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    switch (state) {
      case 1: return "playing";
      case 2: return "paused";
      case 3: return "buffering";
      default: return "idle";
    }
  }

  function setPlaybackRate(rate) {
    _player?.setPlaybackRate?.(rate);
  }

  function onStateChange(callback) {
    _listeners.add(callback);
    return () => _listeners.delete(callback);
  }

  function destroy() {
    _listeners.clear();
    _player?.destroy?.();
    _player = null;
  }

  return {
    type: "youtube",
    setPlayer,
    play,
    pause,
    seek,
    getCurrentTime,
    getPlayerState,
    setPlaybackRate,
    onStateChange,
    destroy,
  };
}
