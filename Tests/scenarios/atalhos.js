/**
 * Teste 4 — atalhos.
 *
 * Abre a tela de atalhos, troca a combinação de cada um, dispara a ação
 * e devolve a tecla original. O passo passa se o atalho continua o mesmo.
 */

const { call } = require('../lib/drive');

async function run(win) {
  const result = await call(win, 'exerciseShortcuts');
  return {
    ok: !!(result && result.ok),
    steps: (result && result.steps) || [{
      name: 'atalhos',
      ok: false,
      durationMs: 0,
      error: (result && result.error) || 'sem resultado',
    }],
  };
}

module.exports = {
  id: 'atalhos',
  name: 'Teste 4 — Atalhos',
  run,
};
