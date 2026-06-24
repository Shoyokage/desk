const { contextBridge, ipcRenderer } = require('electron');

// Bridge for the desktop sprite companion (companion.html)
contextBridge.exposeInMainWorld('companion', {
  // live snapshot of Desk's day (due / streak / focus) so the sprite can react
  onData: (cb) => ipcRenderer.on('companion-data', (_e, d) => cb(d)),
  // now-playing from the Chrome companion (loopback) → buddy grooves while a song plays
  onNowPlaying: (cb) => ipcRenderer.on('now-playing', (_e, d) => cb(d)),
  // toggle click-through: false while the pointer is over the sprite, true otherwise
  setIgnore: (ignore) => ipcRenderer.send('companion:setIgnore', !!ignore),
  // a click on the sprite → a contextual action handled by the main process
  action: (name) => ipcRenderer.send('companion:action', name),
});
