/**
 * Pede à API-DSX para gravar o diário da sessão.
 *
 * Uma chamada, no fechar. Não observa atividade do usuário.
 */

const http = require('http');

function flushApiSession(port = 3333, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const body = Buffer.from('{}');
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/session/flush',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end(body);
  });
}

module.exports = {
  flushApiSession,
};
