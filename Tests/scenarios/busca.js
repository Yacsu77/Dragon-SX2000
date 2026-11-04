/**
 * Busca inteligente com digitação humana e cache da guia.
 *
 * A frase "ultimas noticias infomoney" é digitada a cerca de 90 ms
 * por tecla. "You" precisa trazer youtube, porque essa aba já foi aberta.
 * O tempo de recomendação começa no último caractere.
 */

const { call } = require('../lib/drive');
const { sleep, STEP_DELAY_MS } = require('../lib/clock');

const QUERIES = [
  { name: 'Infomoney', text: 'ultimas noticias infomoney', expect: '' },
  { name: 'Cache YouTube', text: 'You', expect: 'youtube' },
];

async function run(win) {
  const steps = [];
  for (let index = 0; index < QUERIES.length; index += 1) {
    const query = QUERIES[index];
    let delayBeforeMs = 0;
    if (index > 0) {
      await sleep(STEP_DELAY_MS);
      delayBeforeMs = STEP_DELAY_MS;
    }
    const result = await call(win, 'typeQuery', query.text, query.expect);
    steps.push({ name: query.name, delayBeforeMs, ...result });
  }
  return steps;
}

module.exports = {
  id: 'busca',
  name: 'Teste 7 — Busca inteligente',
  run,
};
