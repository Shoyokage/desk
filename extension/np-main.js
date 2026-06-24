// Runs in the PAGE's own world so it can read navigator.mediaSession.metadata
// (which the page sets and the isolated content-script world can't see).
// It never talks to the network directly — it just postMessages a snapshot,
// which np-content.js (isolated world) relays to the service worker.
(function () {
  if (window.__deskNPMain) return;
  window.__deskNPMain = true;

  function snapshot() {
    var ms = navigator.mediaSession;
    var meta = ms && ms.metadata;
    var title = meta && meta.title ? String(meta.title) : '';
    var artist = meta && meta.artist ? String(meta.artist) : '';

    // Is something actually playing? Prefer mediaSession state, else inspect media elements.
    var playing = false;
    if (ms && ms.playbackState === 'playing') playing = true;
    else if (ms && ms.playbackState === 'paused') playing = false;
    else {
      var els = document.querySelectorAll('video, audio');
      for (var i = 0; i < els.length; i++) {
        if (!els[i].paused && !els[i].ended && els[i].currentTime > 0) { playing = true; break; }
      }
    }

    // Fall back to the tab title when a page plays audio without media-session metadata.
    if (!title && playing) title = (document.title || '').slice(0, 200);

    // Treat as "real" media only if the page declared metadata, or audio is actively playing —
    // this keeps muted background/ad videos from hijacking the bar.
    var active = !!title && (!!(meta && meta.title) || playing);

    return { active: active, title: title, artist: artist, playing: playing };
  }

  var last = '';
  function tick() {
    var s = snapshot();
    var key = JSON.stringify(s);
    // Post on any change, and keep a heartbeat while active so the bridge + app stay in sync.
    if (key !== last || s.active) {
      last = key;
      try { window.postMessage({ __deskNP: true, payload: s }, '*'); } catch (_) {}
    }
  }

  ['play', 'pause', 'ended', 'loadedmetadata'].forEach(function (ev) {
    document.addEventListener(ev, tick, true);
  });
  setInterval(tick, 4000);
  tick();
})();
