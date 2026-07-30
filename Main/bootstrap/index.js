'use strict';

/**
 * Main/bootstrap — Composition Root + ciclo de vida Electron.
 *
 * Contrato: IAppBootstrap
 * Ver: Version/Docs/MainProcess.md (Fase 7)
 */

const { AppLifecycle, createAppLifecycle } = require('./AppLifecycle');
const { createMainApp } = require('./createMainApp');

module.exports = {
  createMainApp,
  AppLifecycle,
  createAppLifecycle,
};
