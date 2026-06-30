'use strict';

const os = require('os');
const WindowsController = require('./WindowsController');
const MacOSController = require('./MacOSController');
const LinuxController = require('./LinuxController');
const NullController = require('./NullController');

function createControllerForPlatform(opts = {}) {
  const platform = opts.forcePlatform || os.platform();
  switch (platform) {
    case 'win32':
      return new WindowsController(opts);
    case 'darwin':
      return new MacOSController(opts);
    case 'linux':
      return new LinuxController(opts);
    case 'null':
    default:
      return new NullController(opts);
  }
}

module.exports = {
  createControllerForPlatform,
  WindowsController,
  MacOSController,
  LinuxController,
  NullController,
};
