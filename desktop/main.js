const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, nativeImage, shell, session, systemPreferences, screen } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// allow the open chime to play on launch without a user gesture (must be set before app is ready)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let win = null, tray = null, captureWin = null, quitting = false, npServer = null, closing = false;
let buddyWin = null;                                   // the desktop sprite companion
const MANIFEST_PATH = path.join(__dirname, 'app', 'sprite.json');
const BUDDY_W = 210, BUDDY_H = 300;
function readManifest() {                              // { h|w, default, anims:{name:{file,cols,rows,fps}} }
  let m = null;
  try { m = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch (_) {}
  if (!m || !m.anims) return null;
  const anyArt = Object.values(m.anims).some(a => fs.existsSync(path.join(__dirname, 'app', a.file)));
  return anyArt ? m : null;
}
const NP_PORT = 7682; // loopback port the Chrome "now playing" companion posts to

// transport commands queued for Chrome; the extension long-polls GET /cmd to pull them
let cmdQueue = [], cmdHeldRes = null, cmdHeldTimer = null;
function deliverCmd() {
  if (!cmdHeldRes || !cmdQueue.length) return;
  const res = cmdHeldRes; cmdHeldRes = null;
  if (cmdHeldTimer) { clearTimeout(cmdHeldTimer); cmdHeldTimer = null; }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(JSON.stringify(cmdQueue.shift()));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600,
    backgroundColor: '#0D0D0F',            // no white launch flash
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'preload.js'), autoplayPolicy: 'no-user-gesture-required' }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // allow mic access for voice mode (still gated by the macOS system prompt)
  win.webContents.session.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'media' || perm === 'microphone' || perm === 'audioCapture'));
  win.webContents.session.setPermissionCheckHandler((wc, perm) => perm === 'media' || perm === 'microphone' || perm === 'audioCapture');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // native full-screen → tell the renderer to bring the buddy inside the app.
  // (the desktop buddy already sits out of full-screen spaces via visibleOnFullScreen:false)
  win.on('enter-full-screen', () => { if (win && !win.isDestroyed()) win.webContents.send('app-fullscreen', true); });
  win.on('leave-full-screen', () => { if (win && !win.isDestroyed()) win.webContents.send('app-fullscreen', false); });
  // keep the buddy on whatever display Desk is on (re-pin only when the display actually changes)
  win.on('move', () => {
    if (!buddyWin || buddyWin.isDestroyed()) return;
    try { const d = screen.getDisplayMatching(win.getBounds()); if (d.id !== _buddyDispId) positionBuddy(); } catch (_) {}
  });
  // keep the app alive in the background; play the outro (quote) before hiding instead of blinking to black
  win.on('close', (e) => {
    if (quitting) return;                 // real quit (tray → Quit) closes for good
    e.preventDefault();
    if (closing) return;                  // outro already playing
    closing = true;
    win.webContents.send('app-closing');
    setTimeout(() => { if (win && !win.isDestroyed()) win.hide(); closing = false; }, 3200);
  });
}

function showWin() {
  if (!win || win.isDestroyed()) { createWindow(); return; }
  const wasHidden = !win.isVisible();
  win.show(); win.focus();
  if (wasHidden) win.webContents.send('app-shown'); // reopened from tray/minimize → renderer hides the outro (no chime; the chime is cold-start only)
}

function openCapture() {
  if (captureWin && !captureWin.isDestroyed()) { captureWin.show(); captureWin.focus(); return; }
  captureWin = new BrowserWindow({
    width: 540, height: 92, frame: false, resizable: false, alwaysOnTop: true,
    transparent: true, backgroundColor: '#00000000', show: false, skipTaskbar: true,
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'capture-preload.js') }
  });
  captureWin.loadFile(path.join(__dirname, 'capture.html'));
  captureWin.once('ready-to-show', () => { captureWin.center(); captureWin.show(); captureWin.focus(); });
  captureWin.on('blur', () => { if (captureWin) captureWin.hide(); });
  captureWin.on('closed', () => { captureWin = null; });
}

// Local loopback bridge: the Chrome companion extension POSTs {title,artist,playing,...}
// here, and we forward it to the renderer. Bound to 127.0.0.1 only — nothing leaves the machine.
function startNowPlayingServer() {
  if (npServer) return;
  npServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');           // chrome-extension:// origin
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method === 'GET' && req.url === '/ping') { res.writeHead(200); res.end('desk'); return; }
    // long-poll: the extension pulls queued transport commands here
    if (req.method === 'GET' && (req.url || '').split('?')[0] === '/cmd') {
      if (cmdQueue.length) { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end(JSON.stringify(cmdQueue.shift())); return; }
      if (cmdHeldRes) { try { cmdHeldRes.end(''); } catch (_) {} if (cmdHeldTimer) clearTimeout(cmdHeldTimer); }
      cmdHeldRes = res;
      cmdHeldTimer = setTimeout(() => { if (cmdHeldRes === res) { cmdHeldRes = null; try { res.end(''); } catch (_) {} } }, 25000);
      req.on('close', () => { if (cmdHeldRes === res) { cmdHeldRes = null; if (cmdHeldTimer) { clearTimeout(cmdHeldTimer); cmdHeldTimer = null; } } });
      return;
    }
    if (req.method !== 'POST' || (req.url || '').split('?')[0] !== '/np') { res.writeHead(404); res.end(); return; }
    let body = '', tooBig = false;
    req.on('data', (c) => { body += c; if (body.length > 16384) { tooBig = true; req.destroy(); } });
    req.on('end', () => {
      if (tooBig) return;
      let data; try { data = JSON.parse(body || '{}'); } catch (_) { res.writeHead(400); res.end(); return; }
      const np = {
        title:  typeof data.title  === 'string' ? data.title.slice(0, 200)  : '',
        artist: typeof data.artist === 'string' ? data.artist.slice(0, 200) : '',
        playing: data.playing !== false,
        cleared: !!data.cleared,
        source: typeof data.source === 'string' ? data.source.slice(0, 24) : 'Chrome',
      };
      if (win && !win.isDestroyed()) win.webContents.send('now-playing', np);
      if (buddyWin && !buddyWin.isDestroyed()) buddyWin.webContents.send('now-playing', np);  // buddy grooves while music plays
      res.writeHead(200); res.end('ok');
    });
  });
  npServer.on('error', (e) => console.warn('[desk] now-playing server:', e.message)); // port busy → non-fatal
  npServer.listen(NP_PORT, '127.0.0.1');
}

// ---- Desk buddy: a transparent always-on-top sprite companion that sits in a corner ----
let _buddyDispId = null;
// Pick the display the user is actually on: the one holding the main window, else the one
// under the cursor, else primary. (Without this the buddy pins to the primary display's
// bottom-right, which on a multi-monitor setup can land mid-screen on another display.)
function buddyDisplay() {
  try { if (win && !win.isDestroyed() && win.isVisible()) return screen.getDisplayMatching(win.getBounds()); } catch (_) {}
  try { return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()); } catch (_) {}
  return screen.getPrimaryDisplay();
}
function positionBuddy() {
  if (!buddyWin || buddyWin.isDestroyed()) return;
  const disp = buddyDisplay();
  _buddyDispId = disp.id;
  const { workArea } = disp;
  const x = Math.round(workArea.x + workArea.width - BUDDY_W - 24);
  const y = Math.round(workArea.y + workArea.height - BUDDY_H - 20);   // bottom-right of the active display
  buddyWin.setBounds({ x, y, width: BUDDY_W, height: BUDDY_H });
}
function createBuddy() {
  if (buddyWin && !buddyWin.isDestroyed()) { buddyWin.showInactive(); return; }
  const manifest = readManifest();
  if (!manifest) return;                               // no manifest / no art yet → no companion
  buddyWin = new BrowserWindow({
    width: BUDDY_W, height: BUDDY_H, frame: false, transparent: true, backgroundColor: '#00000000',
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    hasShadow: false, skipTaskbar: true, focusable: false, acceptFirstMouse: true, show: false,
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, 'companion-preload.js') }
  });
  buddyWin.loadFile(path.join(__dirname, 'app', 'companion.html'), { query: { manifest: JSON.stringify(manifest) } });
  buddyWin.setAlwaysOnTop(true, 'floating');
  buddyWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  buddyWin.setIgnoreMouseEvents(true, { forward: true });   // click-through; renderer flips it off over the sprite
  buddyWin.once('ready-to-show', () => { positionBuddy(); buddyWin.showInactive(); setTimeout(positionBuddy, 600); });
  buddyWin.on('closed', () => { buddyWin = null; });
}
function toggleBuddy() {
  if (buddyWin && !buddyWin.isDestroyed()) { buddyWin.destroy(); buddyWin = null; return; }
  if (!readManifest()) { if (win && !win.isDestroyed()) win.webContents.send('toast', 'Add the sprite sheets first'); return; }
  createBuddy();
}

function makeTray() {
  let img = nativeImage.createFromPath(path.join(__dirname, 'build', 'tray.png'));
  if (img.isEmpty()) img = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon_512.png')).resize({ width: 18, height: 18 });
  tray = new Tray(img);
  tray.setToolTip('Desk');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Desk', click: showWin },
    { label: 'Quick capture…   (⌥⌘Space)', click: openCapture },
    { label: 'Desk buddy', type: 'checkbox', checked: !!buddyWin, click: toggleBuddy },
    { type: 'separator' },
    { label: 'Quit Desk', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', showWin);
}

app.whenReady().then(() => {
  loadAiCfg();                                          // restore the user's Ollama host/model choice
  createWindow();
  makeTray();
  startNowPlayingServer();
  createBuddy();                                        // appears only if app/sprite.png exists
  globalShortcut.register('Alt+Command+Space', openCapture);
  app.on('activate', showWin);
  // re-pin the buddy when monitors are added/removed/rearranged
  screen.on('display-metrics-changed', positionBuddy);
  screen.on('display-added', positionBuddy);
  screen.on('display-removed', positionBuddy);
});

// Desk buddy IPC: click-through toggle + click actions
ipcMain.on('companion:setIgnore', (_e, ignore) => { if (buddyWin && !buddyWin.isDestroyed()) buddyWin.setIgnoreMouseEvents(!!ignore, { forward: true }); });
ipcMain.on('companion:action', (_e, name) => {
  if (name === 'capture') { openCapture(); return; }
  showWin();
  if (win && !win.isDestroyed()) win.webContents.send('companion-cmd', name);  // 'due' | 'focus' | 'show'
});

ipcMain.on('media-control', (_e, action) => {
  if (['play', 'pause', 'playpause', 'next', 'prev'].includes(action)) { cmdQueue.push({ action }); deliverCmd(); }
});
ipcMain.on('show-window', showWin);
ipcMain.on('capture', (_e, text) => { if (win && !win.isDestroyed() && text) win.webContents.send('quick-capture', text); if (captureWin) captureWin.hide(); });

// Desktop widgets: the renderer pushes a small JSON snapshot; we write it to a stable file
// (~/Library/Application Support/desk/desk-widgets.json) that the Übersicht widgets read.
ipcMain.on('widgets:write', (_e, data) => {
  try {
    const json = JSON.stringify(data || {});
    if (json.length > 65536) return;                       // ignore anything unexpectedly large
    fs.writeFileSync(path.join(app.getPath('userData'), 'desk-widgets.json'), json);
    if (buddyWin && !buddyWin.isDestroyed()) buddyWin.webContents.send('companion-data', data);  // feed the sprite
  } catch (e) { /* non-fatal */ }
});
ipcMain.on('capture-cancel', () => { if (captureWin) captureWin.hide(); });

// ---- Voice mode: local Whisper (speech→text) + Gemma via Ollama (intent + chat) ----
// ---- Voice & AI config: where the local LLM lives. Persisted so other users can point Desk at
// their own Ollama host / model from the in-app Settings page (defaults to a local Ollama + gemma3:1b). ----
function aiCfgPath() { return path.join(app.getPath('userData'), 'desk-ai-config.json'); }
let aiCfg = { ollamaHost: 'http://127.0.0.1:11434', ollamaModel: 'qwen2.5:7b' };  // conversational agent; switchable in Settings → Voice & AI
function loadAiCfg() { try { const s = JSON.parse(fs.readFileSync(aiCfgPath(), 'utf8')); if (s && typeof s === 'object') aiCfg = Object.assign(aiCfg, s); } catch (_) {} }
function saveAiCfg() { try { fs.writeFileSync(aiCfgPath(), JSON.stringify(aiCfg)); } catch (_) {} }
ipcMain.handle('voice:getConfig', () => aiCfg);
ipcMain.on('voice:setConfig', (_e, cfg) => {
  if (!cfg || typeof cfg !== 'object') return;
  if (typeof cfg.ollamaHost === 'string' && cfg.ollamaHost.trim()) aiCfg.ollamaHost = cfg.ollamaHost.trim().replace(/\/+$/, '');
  if (typeof cfg.ollamaModel === 'string' && cfg.ollamaModel.trim()) aiCfg.ollamaModel = cfg.ollamaModel.trim();
  saveAiCfg();
});
// "Test connection": is Ollama reachable, and is the chosen model installed?
ipcMain.handle('voice:status', async () => {
  try {
    const r = await fetch(aiCfg.ollamaHost + '/api/tags', { method: 'GET' });
    if (!r.ok) return { reachable: false, error: 'HTTP ' + r.status, cfg: aiCfg };
    const d = await r.json();
    const models = (d.models || []).map(m => m.name);
    const base = (n) => String(n).split(':')[0];
    return { reachable: true, models, hasModel: models.some(n => n === aiCfg.ollamaModel || base(n) === base(aiCfg.ollamaModel)), cfg: aiCfg };
  } catch (e) { return { reachable: false, error: String(e && e.message || e), cfg: aiCfg }; }
});

let asrPromise = null;
function getAsr() {
  if (!asrPromise) asrPromise = (async () => {
    const tf = await import('@huggingface/transformers');
    tf.env.allowLocalModels = true;
    tf.env.localModelPath = path.join(__dirname, 'models');  // use a bundled model if present…
    tf.env.allowRemoteModels = true;                         // …otherwise auto-download from HuggingFace on first use (~240MB, cached)
    // session_options disable onnxruntime's CPU memory arena — under Electron's V8 build the arena
    // (BFCArena::Extend) traps with SIGTRAP and crashes the app; disabling it transcribes cleanly,
    // at a negligible perf cost for short clips. Works in-process (no subprocess / system node needed).
    return tf.pipeline('automatic-speech-recognition', 'Xenova/whisper-small.en', {
      dtype: 'q8',                                                    // bundled in models/ → loads fully offline (a source clone without models/ auto-downloads once)
      session_options: { enableCpuMemArena: false, enableMemPattern: false },
    });
  })();
  return asrPromise;
}
ipcMain.handle('voice:ensureMic', async () => {
  try {
    if (process.platform === 'darwin' && systemPreferences.askForMediaAccess) return { ok: await systemPreferences.askForMediaAccess('microphone') };
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
ipcMain.handle('voice:transcribe', async (_e, pcm) => {
  try {
    const asr = await getAsr();
    const audio = pcm instanceof Float32Array ? pcm : new Float32Array(pcm);
    const out = await asr(audio, { chunk_length_s: 30 });
    return { ok: true, text: ((out && out.text) || '').trim() };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
ipcMain.handle('voice:ask', async (_e, payload) => {
  try {
    const body = { model: aiCfg.ollamaModel, stream: false, options: { temperature: (payload && typeof payload.temperature === 'number') ? payload.temperature : 0.2 }, messages: (payload && payload.messages) || [] };
    if (payload && payload.schema) body.format = payload.schema;
    const r = await fetch(aiCfg.ollamaHost + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return { ok: false, error: 'ollama ' + r.status };
    const d = await r.json();
    return { ok: true, content: (d.message && d.message.content) || '' };
  } catch (e) { return { ok: false, error: 'Ollama not reachable — is it running? (' + String(e && e.message || e) + ')' }; }
});

app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* keep running in the menu bar */ });
