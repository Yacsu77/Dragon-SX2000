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

contextBridge.exposeInMainWorld('DragonUser', {
  setActive: (userId) => ipcRenderer.invoke('user:setActive', userId),
  getActive: () => ipcRenderer.invoke('user:getActive'),
  saveAvatarDataUrl: (userId, dataUrl) =>
    ipcRenderer.invoke('user:saveAvatarDataUrl', { userId, dataUrl }),
  deleteUserData: (userId) => ipcRenderer.invoke('user:deleteUserData', userId),
});

contextBridge.exposeInMainWorld('DragonWallpaper', {
  getFilePath: (file) => resolveFilePath(file),
  readState: (userId) => ipcRenderer.invoke('wallpaper:readState', { userId }),
  saveState: (payload, userId) =>
    ipcRenderer.invoke('wallpaper:saveState', { state: payload, userId }),
  importFile: (sourcePath, type, userId) =>
    ipcRenderer.invoke('wallpaper:importFile', { sourcePath, type, userId }),
  importDataUrl: (dataUrl, userId) =>
    ipcRenderer.invoke('wallpaper:importDataUrl', { dataUrl, userId }),
  importBlob: (buffer, ext, userId) =>
    ipcRenderer.invoke('wallpaper:importBlob', { buffer, ext, userId }),
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
  setGlobalCombos: (combos) => {
    const list = Array.isArray(combos) ? combos.filter((c) => typeof c === 'string') : [];
    ipcRenderer.send('shortcuts:set-global-combos', list);
  },
  setGlobalHoldCombos: (combos) => {
    const list = Array.isArray(combos) ? combos.filter((c) => typeof c === 'string') : [];
    ipcRenderer.send('shortcuts:set-global-hold-combos', list);
  },
  onGlobalCombo: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('shortcuts:global-combo', handler);
    return () => ipcRenderer.removeListener('shortcuts:global-combo', handler);
  },
});
