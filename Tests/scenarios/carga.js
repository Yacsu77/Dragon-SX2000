/**
 * Carga de abas.
 *
 * Abre páginas leves até a primeira ser congelada pelo TabWarmth,
 * ou até 16. O relatório diz em qual quantidade isso aconteceu.
 */

const { call } = require('../lib/drive');

async function run(win) {
  const result = await call(win, 'loadUntilFrozen');
  return [{ name: 'Abas até congelar', ...result }];
}

module.exports = {
  id: 'carga',
  name: 'Teste 9 — Carga',
  run,
};
