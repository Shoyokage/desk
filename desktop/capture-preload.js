const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cap', {
  submit: (text) => ipcRenderer.send('capture', text),
  cancel: () => ipcRenderer.send('capture-cancel'),
});
