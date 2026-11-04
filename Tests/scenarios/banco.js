/**
 * Teste 5 — banco.
 *
 * Cronometra cada operação na API que o app já subiu, com o usuário
 * da suíte. Senha e exclusão seguem o caminho imediato.
 * O usuário só é apagado no fim da suíte, depois dos testes de carga.
 */

const { call } = require('../lib/drive');

async function run(win) {
  const result = await call(win, 'exerciseDatabase', 'suite-pass-1');
  const steps = (result && result.steps) || [{
    name: 'banco',
    ok: false,
    durationMs: 0,
    error: (result && result.error) || 'sem resultado',
  }];
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
