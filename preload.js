const { contextBridge, ipcRenderer, webUtils } = require('electron');

function resolveFilePath(file) {
  if (!file) return null;
  try {
    if (webUtils && typeof webUtils.getPathForFile === 'function') {
      return webUtils.getPathForFile(file);
    }
  } catch (_) { /* ignore */ }
  return file.path || null;
}

contextBridge.exposeInMainWorld('DragonFiles', {
  readDir: (dirPath) => ipcRenderer.invoke('files:readDir', dirPath),
  getHome: () => ipcRenderer.invoke('files:getHome'),
  pickFolder: () => ipcRenderer.invoke('files:pickFolder'),
});

contextBridge.exposeInMainWorld('DragonWallpaper', {
  getFilePath: (file) => resolveFilePath(file),
  readState: () => ipcRenderer.invoke('wallpaper:readState'),
  saveState: (payload) => ipcRenderer.invoke('wallpaper:saveState', payload),
  importFile: (sourcePath, type) => ipcRenderer.invoke('wallpaper:importFile', { sourcePath, type }),
  importDataUrl: (dataUrl) => ipcRenderer.invoke('wallpaper:importDataUrl', { dataUrl }),
  importBlob: (buffer, ext) => ipcRenderer.invoke('wallpaper:importBlob', { buffer, ext }),
});

contextBridge.exposeInMainWorld('DragonBrowser', {
  onOpenUrl: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, url) => callback(url);
    ipcRenderer.on('browser:open-url', handler);
    return () => ipcRenderer.removeListener('browser:open-url', handler);
  },
});

contextBridge.exposeInMainWorld('DragonCursorControl', {
  createWindow: (url) => ipcRenderer.invoke('cursor:create-window', { url }),
  consumePendingUrl: () => ipcRenderer.invoke('cursor:consume-pending-url'),
});

contextBridge.exposeInMainWorld('DragonShortcuts', {
  // Informa ao processo principal quais combos devem ser capturados mesmo
  // quando o foco está dentro de um site (webview).
  setGlobalCombos: (combos) => {
    const list = Array.isArray(combos) ? combos.filter((c) => typeof c === 'string') : [];
    ipcRenderer.send('shortcuts:set-global-combos', list);
  },
  // Recebe do main um combo global disparado dentro de um webview.
  onGlobalCombo: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, combo) => callback(combo);
    ipcRenderer.on('shortcuts:global-combo', handler);
    return () => ipcRenderer.removeListener('shortcuts:global-combo', handler);
  },
});
