/**
 * Entrada só da suíte. Não entra no instalador.
 *
 * Sobe o mesmo main.js do desenvolvimento e, em seguida, o runner.
 * npm start não passa por aqui.
 */

const startedAt = Date.now();

require('./main.js');

const { app, BrowserWindow } = require('electron');
const { runSuite } = require('./Tests/runner');

app.whenReady().then(() => {
  runSuite({ startedAt, app, BrowserWindow }).catch((err) => {
    console.error('[suite]', err);
    app.exit(1);
  });
});
