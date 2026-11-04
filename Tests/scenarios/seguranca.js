/**
 * Segurança no banco temporário da suíte.
 *
 * Senha errada, texto de injeção e resposta do cofre. Nada disso usa
 * o banco do usuário real.
 */

const { call } = require('../lib/drive');

async function run(win) {
  const result = await call(win, 'exerciseSecurity', 'suite-pass-1');
  return {
    ok: !!(result && result.ok),
    steps: (result && result.steps) || [{
      name: 'segurança',
      ok: false,
      durationMs: 0,
      error: (result && result.error) || 'sem resultado',
    }],
  };
}

module.exports = {
  id: 'seguranca',
  name: 'Teste 10 — Segurança',
  run,
};
