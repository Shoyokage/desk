// Isolated world: bridges page-world postMessages to the extension service worker.
if (window.__deskNPRelay) { /* already wired (avoid double inject) */ } else {
window.__deskNPRelay = true;
window.addEventListener('message', function (e) {
  if (e.source !== window) return;
  var d = e.data;
  if (!d || d.__deskNP !== true || !d.payload) return;
  try {
    chrome.runtime.sendMessage({ deskNP: d.payload });
  } catch (_) {
    // extension context invalidated (e.g. just reloaded) — ignore
  }
});
}
