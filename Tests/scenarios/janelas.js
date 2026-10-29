/**
 * Teste 2 — janela lateral, divisão e nova janela.
 *
 * Liga o painel lateral sempre carregado, abre WhatsApp, Discord e
 * Instagram, divide a janela atual e pede outra janela a partir de uma aba.
 */

const { call } = require('../lib/drive');
const { sleep, STEP_DELAY_MS } = require('../lib/clock');

const STEPS = [
  { name: 'Lateral WhatsApp', method: 'openSidePanel', args: ['https://web.whatsapp.com', 'WhatsApp', 'suite-whatsapp'] },
  { name: 'Lateral Discord', method: 'openSidePanel', args: ['https://discord.com/app', 'Discord', 'suite-discord'] },
  { name: 'Lateral Instagram', method: 'openSidePanel', args: ['https://www.instagram.com', 'Instagram', 'suite-instagram'] },
  { name: 'Janela dividida', method: 'splitFirstTab', args: [] },
  { name: 'Nova janela a partir da aba', method: 'openWindowFromTab', args: [] },
];

async function run(win) {
  const steps = [];
  for (let index = 0; index < STEPS.length; index += 1) {
    const step = STEPS[index];
    let delayBeforeMs = 0;
    if (index > 0) {
      await sleep(STEP_DELAY_MS);
      delayBeforeMs = STEP_DELAY_MS;
    }
    const result = await call(win, step.method, ...step.args);
    steps.push({ name: step.name, delayBeforeMs, ...result });
  }
  return steps;
}

module.exports = {
  id: 'janelas',
  name: 'Teste 2 — Janelas',
  run,
};
