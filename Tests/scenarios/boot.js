/**
 * Arranque e usuário da suíte.
 *
 * Mede o tempo até a janela existir e, em seguida, cria o perfil pelo
 * formulário real. Os outros testes usam esse perfil.
 */

const { call } = require('../lib/drive');

async function run(win, nickname) {
  return call(win, 'createSuiteUser', nickname, 'suite-pass-1');
}

module.exports = {
  run,
};
