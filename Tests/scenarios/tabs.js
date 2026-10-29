/**
 * Teste 1 — seis abas com mídia diferente.
 *
 * Cada aba espera o webview parar de carregar. A espera de 2 segundos
 * entre uma e outra fica fora do tempo de carga.
 */

const { call } = require('../lib/drive');
const { sleep, STEP_DELAY_MS } = require('../lib/clock');

const PAGES = [
  { title: 'G1', url: 'https://g1.globo.com' },
  { title: 'YouTube', url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' },
  { title: 'Krunker', url: 'https://krunker.io' },
  { title: 'Canva', url: 'https://www.canva.com' },
  { title: 'Excalidraw', url: 'https://excalidraw.com' },
  { title: 'Wikipédia', url: 'https://pt.wikipedia.org/wiki/Wikipédia' },
];

async function run(win) {
  const steps = [];
  for (let index = 0; index < PAGES.length; index += 1) {
    const page = PAGES[index];
    let delayBeforeMs = 0;
    if (index > 0) {
      await sleep(STEP_DELAY_MS);
      delayBeforeMs = STEP_DELAY_MS;
    }
    const result = await call(win, 'openTab', page.url, page.title);
    steps.push({ name: page.title, delayBeforeMs, ...result });
  }
  return steps;
}

module.exports = {
  id: 'abas',
  name: 'Teste 1 — Abas',
  run,
};
