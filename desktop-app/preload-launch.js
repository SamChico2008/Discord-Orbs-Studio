'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startupUpdateChoice: (choice) => ipcRenderer.invoke('startup-update-choice', choice)
});
