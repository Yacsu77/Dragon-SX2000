const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DragonFiles', {
  readDir: (dirPath) => ipcRenderer.invoke('files:readDir', dirPath),
  getHome: () => ipcRenderer.invoke('files:getHome'),
  pickFolder: () => ipcRenderer.invoke('files:pickFolder'),
});

contextBridge.exposeInMainWorld('DragonBrowser', {
  onOpenUrl: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, url) => callback(url);
    ipcRenderer.on('browser:open-url', handler);
    return () => ipcRenderer.removeListener('browser:open-url', handler);
  },
});
