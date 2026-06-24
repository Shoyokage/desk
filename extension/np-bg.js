// Service worker: collects "now playing" snapshots from every tab, picks the
// best one (a playing tab beats a paused one; newest wins ties) and POSTs it to
// the Desk app on loopback. Sends {cleared:true} when nothing is playing anymore.
const DESK_URL = 'http://127.0.0.1:7682/np';
const CMD_URL = 'http://127.0.0.1:7682/cmd';
const tabs = new Map(); // tabId -> { payload, ts }
let lastSent = '';
let currentTab = null;   // the tab whose media we're currently showing/controlling
let polling = false;

function pickWinner() {
  let best = null;
  for (const [id, e] of tabs) {
    const p = e.payload;
    if (!p || !p.active || !p.title) continue;
    if (!best) { best = { id, payload: p, ts: e.ts }; continue; }
    if (p.playing && !best.payload.playing) { best = { id, payload: p, ts: e.ts }; continue; }
    if (p.playing === best.payload.playing && e.ts > best.ts) { best = { id, payload: p, ts: e.ts }; }
  }
  return best;
}

async function flush() {
  const w = pickWinner();
  if (w) currentTab = w.id; // remember the active media tab for transport commands
  const body = w
    ? { title: w.payload.title, artist: w.payload.artist, playing: w.payload.playing, source: 'Chrome' }
    : { cleared: true };
  const key = JSON.stringify(body);
  if (key === lastSent) return;
  lastSent = key;
  try {
    // text/plain keeps it a "simple" request (no CORS preflight)
    await fetch(DESK_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
  } catch (_) {
    lastSent = ''; // Desk app not running — let the next update retry
  }
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !msg.deskNP || !sender.tab) return;
  tabs.set(sender.tab.id, { payload: msg.deskNP, ts: Date.now() });
  flush();
});

// Chrome does NOT auto-inject content scripts into tabs that were already open
// when the extension loads. Inject into existing tabs so a playing tab is picked
// up immediately, without the user having to reload it.
function injectExisting() {
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (list) => {
    if (chrome.runtime.lastError || !list) return;
    for (const t of list) {
      if (!t.id) continue;
      chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['np-main.js'], world: 'MAIN' }).catch(() => {});
      chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['np-content.js'], world: 'ISOLATED' }).catch(() => {});
    }
  });
}
chrome.runtime.onInstalled.addListener(injectExisting);
chrome.runtime.onStartup.addListener(injectExisting);

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTab) currentTab = null;
  if (tabs.delete(tabId)) flush();
});

// A tab starting to load a new page drops its old "now playing" state.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading' && tabs.delete(tabId)) flush();
});

// ----- transport control: pull queued commands from Desk and run them in the media tab -----
// Runs in the PAGE world. Toggles the media element directly for play/pause (most reliable),
// and clicks the site's own next/prev controls (covers YouTube, YT Music, Spotify, SoundCloud).
function pageAction(action) {
  function mediaEls() { return Array.prototype.slice.call(document.querySelectorAll('video,audio')); }
  function activeMedia() { var e = mediaEls(); return e.find(function (m) { return m.currentTime > 0 && !m.ended; }) || e.find(function (m) { return m.readyState > 0; }) || e[0] || null; }
  function clickFirst(sels) { for (var i = 0; i < sels.length; i++) { var b = document.querySelector(sels[i]); if (b) { b.click(); return true; } } return false; }
  var m;
  if (action === 'playpause') { m = activeMedia(); if (m) { if (m.paused) m.play(); else m.pause(); return; } clickFirst(['[data-testid="control-button-playpause"]', '.ytp-play-button', '[aria-label*="Pause" i]', '[aria-label*="Play" i]', '[title*="Play" i]']); }
  else if (action === 'play') { m = activeMedia(); if (m) m.play(); }
  else if (action === 'pause') { m = activeMedia(); if (m) m.pause(); }
  else if (action === 'next') { clickFirst(['[data-testid="control-button-skip-forward"]', '.ytp-next-button', 'ytmusic-player-bar .next-button', 'tp-yt-paper-icon-button.next-button', '.skipControl__next', '[aria-label*="Next" i]', '[title*="Next" i]']); }
  else if (action === 'prev') { clickFirst(['[data-testid="control-button-skip-back"]', '.ytp-prev-button', 'ytmusic-player-bar .previous-button', 'tp-yt-paper-icon-button.previous-button', '.skipControl__previous', '[aria-label*="Previous" i]', '[aria-label*="Prev" i]', '[title*="Previous" i]']); }
}

function exec(tabId, action) {
  if (tabId == null) return;
  chrome.scripting.executeScript({ target: { tabId: tabId }, world: 'MAIN', func: pageAction, args: [action] }).catch(function () {});
}

function runCommand(cmd) {
  if (!cmd || !cmd.action) return;
  if (currentTab != null) { exec(currentTab, cmd.action); return; }
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (t) { if (t && t[0]) exec(t[0].id, cmd.action); }); // fallback: focused tab
}

async function pollCommands() {
  if (polling) return; polling = true;
  // long-poll keeps this service worker alive and delivers commands with ~no latency
  for (;;) {
    try {
      const r = await fetch(CMD_URL, { method: 'GET' });
      if (r.ok) { const txt = await r.text(); if (txt) { try { runCommand(JSON.parse(txt)); } catch (_) {} } }
    } catch (_) {
      await new Promise(function (res) { setTimeout(res, 2000); }); // Desk app down → back off, then retry
    }
  }
}
pollCommands();
