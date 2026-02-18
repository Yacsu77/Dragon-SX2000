const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  win.loadFile('Frontend/src/index.html');
}

app.whenReady().then(createWindow);
