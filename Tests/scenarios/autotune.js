/**
 * Teste 3 — AutoTune e wallpaper.
 *
 * A música manda pausar, avançar e voltar ao SDK. Os outros AutoTunes
 * só ligam e desligam. O wallpaper aplica os três recomendados do app.
 */

const { call } = require('../lib/drive');
const { sleep, STEP_DELAY_MS } = require('../lib/clock');

const PLAN = [
  ['Música ligada', 'toggleAutotune', 'music', true],
  ['Música pausar', 'mediaCommand', 'pause'],
  ['Música avançar', 'mediaCommand', 'next'],
  ['Música voltar', 'mediaCommand', 'previous'],
  ['Música desligada', 'toggleAutotune', 'music', false],
  ['Timer ligado', 'toggleAutotune', 'timer', true],
  ['Timer desligado', 'toggleAutotune', 'timer', false],
  ['Share ligado', 'toggleAutotune', 'share', true],
  ['Share desligado', 'toggleAutotune', 'share', false],
  ['Tasklist ligado', 'toggleAutotune', 'tasklist', true],
  ['Tasklist desligado', 'toggleAutotune', 'tasklist', false],
  ['Relógio ligado', 'toggleAutotune', 'clock', true],
  ['Relógio desligado', 'toggleAutotune', 'clock', false],
  ['Wallpaper WWP', 'applyWallpaper', 0],
  ['Wallpaper WWP1', 'applyWallpaper', 1],
  ['Wallpaper WWP3', 'applyWallpaper', 2],
];

async function run(win) {
  const steps = [];
  for (let index = 0; index < PLAN.length; index += 1) {
    const [name, method, ...args] = PLAN[index];
    let delayBeforeMs = 0;
    if (index > 0) {
      await sleep(STEP_DELAY_MS);
      delayBeforeMs = STEP_DELAY_MS;
    }
    const result = await call(win, method, ...args);
    steps.push({ name, delayBeforeMs, ...result });
  }
  return steps;
}

module.exports = {
  id: 'autotune',
  name: 'Teste 3 — AutoTune e wallpaper',
  run,
};
