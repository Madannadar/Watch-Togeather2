/**
 * html5Provider.js — HTML5 <video> element playback provider stub.
 *
 * Future use: local video files, MP4 streams, or any HTML5 video element.
 * Implement this when adding local video support.
 *
 * @param {{ element: HTMLVideoElement }} options
 * @returns {PlaybackProvider}
 */
export function html5Provider({ element } = {}) {
  let _el = element;

  function play() {
    _el?.play?.();
  }

  function pause() {
    _el?.pause?.();
  }

  function seek(seconds) {
    if (_el) _el.currentTime = seconds;
  }

  function getCurrentTime() {
    return _el?.currentTime ?? 0;
  }

  function getPlayerState() {
    if (!_el) return "idle";
    if (_el.paused) return "paused";
    if (_el.readyState < 3) return "buffering";
    return "playing";
  }

  function setPlaybackRate(rate) {
    if (_el) _el.playbackRate = rate;
  }

  function onStateChange(callback) {
    // TODO: wire to 'play', 'pause', 'waiting', 'playing' events on _el
    return () => {};
  }

  function destroy() {
    _el = null;
  }

  return {
    type: "html5",
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
