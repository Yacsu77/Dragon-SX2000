/**
 * Logger discreto do CursorControll.
 */
(function () {
  const PREFIX = '[CursorControll]';
  const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';

  function log(level, message, detail) {
    if (!isDev && level === 'debug') return;
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (detail !== undefined) {
      fn(`${PREFIX} ${message}`, detail);
    } else {
      fn(`${PREFIX} ${message}`);
    }
  }

  window.CursorLogger = {
    debug: (msg, detail) => log('debug', msg, detail),
    info: (msg, detail) => log('info', msg, detail),
    warn: (msg, detail) => log('warn', msg, detail),
    error: (msg, detail) => log('error', msg, detail),
  };
})();
