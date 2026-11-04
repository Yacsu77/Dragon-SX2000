/**
 * Orquestra a suíte no app que já está aberto.
 *
 * Espera a janela real, cria um usuário, roda os testes e grava
 * o relatório. No fim apaga o usuário e pede para o Electron fechar.
 */

const path = require('path');
const { install, call } = require('./lib/drive');
const { now, sleep } = require('./lib/clock');
const machine = require('./probe/machine');
const resources = require('./probe/resources');
const writer = require('./report/writer');
const boot = require('./scenarios/boot');
const tabs = require('./scenarios/tabs');
const janelas = require('./scenarios/janelas');
const autotune = require('./scenarios/autotune');
const atalhos = require('./scenarios/atalhos');
const banco = require('./scenarios/banco');
const atividade = require('./scenarios/atividade');
const busca = require('./scenarios/busca');
const sdk = require('./scenarios/sdk');
const carga = require('./scenarios/carga');
const seguranca = require('./scenarios/seguranca');

const SCENARIOS = [tabs, janelas, autotune, atalhos, banco, atividade, busca, sdk, carga, seguranca];

async function waitForWindow(BrowserWindow) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const win = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed());
    if (win && !win.webContents.isLoading()) return win;
    await sleep(150);
  }
  throw new Error('A janela do DSX não ficou pronta.');
}

function normalizeSteps(steps) {
  return (steps || []).map((step) => ({
    name: step.name,
    ok: step.ok !== false && !step.error,
    startedAt: step.startedAt || null,
    finishedAt: step.finishedAt || null,
    durationMs: step.durationMs || step.loadMs || 0,
    loadMs: step.loadMs != null ? step.loadMs : null,
    delayBeforeMs: step.delayBeforeMs || 0,
    recommendMs: step.recommendMs != null ? step.recommendMs : null,
    note: step.note || null,
    tabs: step.tabs || null,
    frozenAt: step.frozenAt != null ? step.frozenAt : null,
    error: step.error || null,
  }));
}

async function runScenario(scenario, win) {
  console.log(`[suite] ${scenario.name}`);
  const started = now();
  try {
    const result = await scenario.run(win);
    const steps = normalizeSteps(result.steps || result);
    const finished = now();
    return {
      id: scenario.id,
      name: scenario.name,
      ok: steps.every((step) => step.ok),
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date(finished).toISOString(),
      durationMs: finished - started,
      steps,
    };
  } catch (err) {
    const finished = now();
    return {
      id: scenario.id,
      name: scenario.name,
      ok: false,
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date(finished).toISOString(),
      durationMs: finished - started,
      steps: [{
        name: scenario.name,
        ok: false,
        durationMs: finished - started,
        loadMs: null,
        delayBeforeMs: 0,
        error: err && err.message ? err.message : String(err),
      }],
    };
  }
}

async function runSuite({ startedAt, app, BrowserWindow }) {
  const probe = resources.start(app, 2000);
  const info = await machine.describe(app);
  const win = await waitForWindow(BrowserWindow);
  const windowLoadedAt = now();
  await install(win);

  const nickname = `suite-${String(startedAt).slice(-8)}`;
  console.log(`[suite] criando usuário ${nickname}`);
  const user = await boot.run(win, nickname);
  const tests = [];
  if (user && user.ok) {
    for (const scenario of SCENARIOS) {
      tests.push(await runScenario(scenario, win));
    }
    console.log('[suite] apagando usuário da suíte');
    await call(win, 'deleteSuiteUser');
  }
  probe.stop();

  const report = {
    version: 1,
    collectedAt: info.collectedAt,
    machine: info,
    boot: {
      startedAt: new Date(startedAt).toISOString(),
      windowLoadedAt: new Date(windowLoadedAt).toISOString(),
      durationMs: windowLoadedAt - startedAt,
    },
    user: {
      nickname,
      id: user && user.userId ? user.userId : null,
      ok: !!(user && user.ok),
      createMs: user && user.createMs ? user.createMs : null,
      workspaceMs: user && user.workspaceMs ? user.workspaceMs : null,
      error: user && user.error ? user.error : null,
    },
    samples: probe.samples,
    tests,
    gates: [],
  };

  const written = writer.write(path.join(__dirname, '..'), report);
  const failed = !report.user.ok || tests.some((test) => !test.ok);
  console.log(`[suite] relatório ${written.mdPath}`);
  console.log(`[suite] ${failed ? 'falhou' : 'ok'}`);
  app.exitCode = failed ? 1 : 0;
  app.quit();
}

module.exports = {
  runSuite,
};
