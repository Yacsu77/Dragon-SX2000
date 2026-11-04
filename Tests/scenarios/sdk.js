/**
 * SDK de mídia.
 *
 * Manda pausar, tocar, avançar, voltar e parar. Confere o formato do
 * snapshot. Sem faixa tocando, os campos podem vir vazios.
 */

const { call } = require('../lib/drive');

async function run(win) {
  const result = await call(win, 'inspectSdk');
  return [{ name: 'Comandos e snapshot', ...result }];
}

module.exports = {
  id: 'sdk',
  name: 'Teste 8 — SDK',
  run,
};
