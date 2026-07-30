'use strict';

/**
 * Main/ — módulos do processo main (Composition Root).
 *
 * Arquitetura: Version/Docs/MainProcess.md
 */

const bootstrap = require('./bootstrap');
const backend = require('./backend');
const browser = require('./browser');
const windows = require('./windows');
const janelas = require('./janelas');
const user = require('./user');
const wallpaper = require('./wallpaper');
const files = require('./files');
const downloads = require('./downloads');
const shortcuts = require('./shortcuts');

module.exports = {
  ...bootstrap,
  ...backend,
  ...browser,
  ...windows,
  ...janelas,
  ...user,
  ...wallpaper,
  ...files,
  ...downloads,
  ...shortcuts,
};
