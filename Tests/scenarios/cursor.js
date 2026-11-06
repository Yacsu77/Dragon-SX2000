/**
 * Teste 11 — cursor.
 *
 * Clica com o esquerdo, o direito e o do meio, e rola a página.
 * A amostra de RAM e CPU fica em volta do gesto, para ver o custo
 * da verificação global que já está ligada.
 */

const { app } = require('electron');
const { call } = require('../lib/drive');
const { sample } = require('../probe/resources');

async function run(win) {
  const before = sample(app);
  const started = Date.now();
  const result = await call(win, 'exerciseCursor');
  const after = sample(app);
  const ramDelta = Math.round((after.ramMB - before.ramMB) * 10) / 10;
  const steps = (result && result.steps) || [{
    name: 'cursor',
    ok: false,
    durationMs: 0,
    error: (result && result.error) || 'sem resultado',
  }];
  steps.push({
    name: 'Custo em memória e CPU',
    ok: true,
    durationMs: Date.now() - started,
    loadMs: Date.now() - started,
    note: `RAM ${before.ramMB} → ${after.ramMB} MB (Δ ${ramDelta} MB). CPU ${before.cpuPercent}% → ${after.cpuPercent}%. ${after.processes} processos.`,
  });
  return {
    ok: !!(result && result.ok),
    steps,
  };
}

module.exports = {
  id: 'cursor',
  name: 'Teste 11 — Cursor',
  run,
};
