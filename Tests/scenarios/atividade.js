/**
 * Atividade das abas já abertas.
 *
 * Ativa cada aba com 2 segundos entre uma e outra e devolve o mapa
 * de quantas estão quentes, congeladas ou são a home.
 */

const { call } = require('../lib/drive');

async function run(win) {
  const result = await call(win, 'cycleOpenTabs');
  return [result && result.name ? result : { name: 'Percorrer abas', ...result }];
}

module.exports = {
  id: 'atividade',
  name: 'Teste 6 — Atividade das abas',
  run,
};
