/**
 * Teste 3 — AutoTune e wallpaper.
 *
 * A grade recebe o relógio, a lista, o timer, o share e a música
 * pelas células. A música continua mandando pausar, avançar e voltar
 * ao SDK. O wallpaper aplica os três recomendados do app.
 */

const { call } = require('../lib/drive');
const { sleep, STEP_DELAY_MS } = require('../lib/clock');

const AFTER = [
  ['Música pausar', 'mediaCommand', 'pause'],
  ['Música avançar', 'mediaCommand', 'next'],
  ['Música voltar', 'mediaCommand', 'previous'],
  ['Wallpaper WWP', 'applyWallpaper', 0],
  ['Wallpaper WWP1', 'applyWallpaper', 1],
  ['Wallpaper WWP3', 'applyWallpaper', 2],
];

async function run(win) {
  const grid = await call(win, 'exerciseAutotuneGrid');
  const steps = (grid && grid.steps) || [{
    name: 'Grade',
    ok: false,
    durationMs: 0,
    error: (grid && grid.error) || 'sem resultado',
  }];

  for (let index = 0; index < AFTER.length; index += 1) {
    const [name, method, ...args] = AFTER[index];
    await sleep(STEP_DELAY_MS);
    const result = await call(win, method, ...args);
    steps.push({ name, delayBeforeMs: STEP_DELAY_MS, ...result });
  }
  return steps;
}

module.exports = {
  id: 'autotune',
  name: 'Teste 3 — AutoTune e wallpaper',
  run,
};
