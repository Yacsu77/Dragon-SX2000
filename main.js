const { app, BrowserWindow, ipcMain, dialog, session, screen, desktopCapturer } = require('electron');

/**
 * main.js — entry do processo main (Electron).
 *
 * Composition Root: Main/bootstrap (createMainApp).
 * Arquitetura: Version/Docs/MainProcess.md
 */

const { MediaDrmManager } = require('./MediaDrm');
const { createMainApp } = require('./Main/bootstrap');

createMainApp({
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  screen,
  desktopCapturer,
  projectRoot: __dirname,
  MediaDrmManager,
}).start();
