const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desk', {
  isElectron: true,
  // main forwards menu-bar / hotkey captures here
  onQuickCapture: (cb) => ipcRenderer.on('quick-capture', (_e, text) => cb(text)),
  // bring the window forward (e.g. from a notification click)
  show: () => ipcRenderer.send('show-window'),
  // main forwards "now playing" updates from the Chrome companion extension (loopback)
  onNowPlaying: (cb) => ipcRenderer.on('now-playing', (_e, data) => cb(data)),
  // send a transport command (play/pause/next/prev) back out to Chrome via the extension
  mediaControl: (action) => ipcRenderer.send('media-control', action),
  // fires when the window is reopened from the menu bar (so the renderer can play the open chime)
  onAppShown: (cb) => ipcRenderer.on('app-shown', () => cb()),
  // fires when the window is about to close (so the renderer can play the outro before it hides)
  onAppClosing: (cb) => ipcRenderer.on('app-closing', () => cb()),
  // voice mode: local Whisper transcription + Gemma (via Ollama) + mic permission
  voiceAvailable: true,
  voiceEnsureMic: () => ipcRenderer.invoke('voice:ensureMic'),
  voiceTranscribe: (pcm) => ipcRenderer.invoke('voice:transcribe', pcm),
  voiceAsk: (payload) => ipcRenderer.invoke('voice:ask', payload),
  // Voice & AI settings: read/update the Ollama host + model, and test the connection
  voiceGetConfig: () => ipcRenderer.invoke('voice:getConfig'),
  voiceSetConfig: (cfg) => ipcRenderer.send('voice:setConfig', cfg),
  voiceStatus: () => ipcRenderer.invoke('voice:status'),
  // desktop widgets: renderer pushes a small snapshot; main writes it to a file Übersicht reads
  writeWidgets: (data) => ipcRenderer.send('widgets:write', data),
  // desk buddy: contextual click action routed back to the renderer ('due' | 'focus' | 'show')
  onCompanionCmd: (cb) => ipcRenderer.on('companion-cmd', (_e, name) => cb(name)),
  onToast: (cb) => ipcRenderer.on('toast', (_e, msg) => cb(msg)),
  // native full-screen enter/leave → renderer brings the buddy inside the app
  onFullScreen: (cb) => ipcRenderer.on('app-fullscreen', (_e, on) => cb(!!on)),
});
