'use strict';

/**
 * Runner standalone do Dragon Media SDK.
 *
 * Uso:
 *   node server.js               # padrão (info, port 8974)
 *   node server.js --debug       # logs detalhados
 *   node server.js --port=9000   # porta customizada
 */

const { DragonMediaSDK } = require('./index');

function parseArgs(argv) {
  const opts = {};
  for (const arg of argv.slice(2)) {
    if (arg === '--debug') opts.logLevel = 'debug';
    else if (arg === '--silent') opts.logLevel = 'silent';
    else if (arg.startsWith('--port=')) opts.port = Number(arg.split('=')[1]);
    else if (arg.startsWith('--host=')) opts.host = arg.split('=')[1];
    else if (arg.startsWith('--platform=')) opts.forcePlatform = arg.split('=')[1];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  const sdk = new DragonMediaSDK(opts);

  const shutdown = async (signal) => {
    console.log(`\n[Dragon Media SDK] Recebido ${signal}, encerrando...`);
    try {
      await sdk.stop();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await sdk.start();
  } catch (err) {
    console.error('[Dragon Media SDK] Falha ao iniciar:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
