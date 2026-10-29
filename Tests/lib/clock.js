/**
 * Relógio da suíte.
 *
 * A espera de 2 segundos entre passos não entra no tempo de carga.
 */

const STEP_DELAY_MS = 2000;
const LOAD_TIMEOUT_MS = 45000;

function now() {
  return Date.now();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  STEP_DELAY_MS,
  LOAD_TIMEOUT_MS,
  now,
  sleep,
};
