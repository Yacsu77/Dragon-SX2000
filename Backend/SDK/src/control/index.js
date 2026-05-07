'use strict';

const os = require('os');
const WindowsController = require('./WindowsController');
const MacOSController = require('./MacOSController');
const NullController = require('./NullController');

function createControllerForPlatform(opts = {}) {
  const platform = opts.forcePlatform || os.platform();
  switch (platform) {
    case 'win32':
      return new WindowsController(opts);
    case 'darwin':
      return new MacOSController(opts);
    case 'null':
    default:
      return new NullController(opts);
  }
}

module.exports = {
  createControllerForPlatform,
  WindowsController,
  MacOSController,
  NullController,
};
