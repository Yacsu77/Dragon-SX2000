/**
 * Identifica a máquina e a GPU para o relatório.
 *
 * O nome da GPU vem do Electron. O percentual de uso só entra se o
 * sistema informar sem pedir senha de administrador.
 */

const os = require('os');
const { execFileSync } = require('child_process');

function read(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', timeout: 4000 }).trim();
  } catch {
    return null;
  }
}

function model() {
  if (process.platform === 'darwin') {
    return read('sysctl', ['-n', 'hw.model']) || os.hostname();
  }
  if (process.platform === 'win32') {
    return read('wmic', ['computersystem', 'get', 'model']) || os.hostname();
  }
  return read('cat', ['/sys/devices/virtual/dmi/id/product_name']) || os.hostname();
}

function gpuUsage() {
  return {
    percent: null,
    note: 'Uso percentual da GPU não é exposto sem senha de administrador.',
  };
}

async function describe(app) {
  let gpuName = null;
  try {
    const info = await app.getGPUInfo('basic');
    const device = info && Array.isArray(info.gpuDevice) ? info.gpuDevice[0] : null;
    gpuName = device
      ? [device.vendorId, device.deviceId, device.driverVendor].filter(Boolean).join(' ')
      : null;
    if (!gpuName && info && info.auxAttributes) {
      gpuName = info.auxAttributes.glRenderer || null;
    }
  } catch {
    gpuName = null;
  }

  const cpu = os.cpus()[0];
  return {
    collectedAt: new Date().toISOString(),
    model: model(),
    hostname: os.hostname(),
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    cpu: cpu ? cpu.model : null,
    cpuCount: os.cpus().length,
    ramTotalMB: Math.round(os.totalmem() / (1024 * 1024)),
    electron: process.versions.electron,
    gpu: {
      name: gpuName,
      usagePercent: gpuUsage().percent,
      note: gpuUsage().note,
    },
  };
}

module.exports = {
  describe,
};
