/**
 * Timer único de 5 minutos.
 *
 * Não observa mouse, teclado nem vídeo. Se o diário está vazio, o
 * despertar não abre transação.
 */

const { FLUSH_INTERVAL_MS } = require('./constants');
const { flush } = require('./sessionFlush');

let timer = null;

function start() {
  if (timer) return;
  timer = setInterval(() => {
    flush().catch((err) => {
      console.error('[Session] flush agendado falhou:', err.message);
    });
  }, FLUSH_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

function stop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = {
  start,
  stop,
};
