'use strict';

const path = require('path');
const fs = require('fs').promises;
const { isFileDialogs } = require('../contracts/IFileDialogs');

/**
 * FileDialogs — readDir / home / pickFolder.
 *
 * @implements {import('../contracts/IFileDialogs').IFileDialogs}
 */
class FileDialogs {
  /**
   * @param {{ app: Electron.App, dialog: Electron.Dialog }} deps
   */
  constructor({ app, dialog }) {
    if (!app || !dialog) throw new Error('FileDialogs: app e dialog obrigatórios');
    this._app = app;
    this._dialog = dialog;
  }

  async readDir(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirPath, entry.name),
    }));
  }

  getHome() {
    return this._app.getPath('home');
  }

  async pickFolder() {
    const result = await this._dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  }
}

function createFileDialogs(deps) {
  const files = new FileDialogs(deps);
  if (!isFileDialogs(files)) {
    throw new Error('FileDialogs não satisfaz IFileDialogs');
  }
  return files;
}

module.exports = { FileDialogs, createFileDialogs };
