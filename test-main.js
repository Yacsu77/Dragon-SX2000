/**
 * Entrada só da suíte. Não entra no instalador.
 *
 * Sobe o mesmo main.js do desenvolvimento, com um SQLite temporário.
 * A pasta some no will-quit, junto com os arquivos WAL.
 * npm start não passa por aqui.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const startedAt = Date.now();
const suiteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsx-suite-'));
process.env.DSX_SUITE_DB = path.join(suiteDir, 'suite.db');

const { app, BrowserWindow } = require('electron');

app.on('will-quit', () => {
  try {
    fs.rmSync(suiteDir, { recursive: true, force: true });
  } catch (_) {
    /* a pasta pode já ter sido removida */
  }
});

require('./main.js');

const { runSuite } = require('./Tests/runner');

app.whenReady().then(() => {
  console.log(`[suite] banco temporário ${process.env.DSX_SUITE_DB}`);
  runSuite({ startedAt, app, BrowserWindow }).catch((err) => {
    console.error('[suite]', err);
    app.exit(1);
  });
});
