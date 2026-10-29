/**
 * Teste 5 — banco.
 *
 * Cronometra cada operação na API que o app já subiu, com o usuário
 * da suíte. Senha e exclusão seguem o caminho imediato.
 */

const { call } = require('../lib/drive');

async function run(win) {
  const result = await call(win, 'exerciseDatabase', 'suite-pass-1');
  const cleanup = await call(win, 'deleteSuiteUser');
  const steps = (result && result.steps) || [];
  steps.push({
    name: 'usuário: apagar',
    ok: !!(cleanup && cleanup.ok),
    durationMs: 0,
    loadMs: 0,
    error: cleanup && cleanup.ok ? null : (cleanup && cleanup.error) || 'não apagou',
  });
  return {
    ok: steps.every((step) => step.ok),
    steps,
  };
}

module.exports = {
  id: 'banco',
  name: 'Teste 5 — Banco',
  run,
};
