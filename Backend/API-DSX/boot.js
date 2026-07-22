/**
 * Bootstrap da API-DSX.
 *
 * Em pastas sincronizadas (Desktop/Documents no iCloud, APFS dataless),
 * o primeiro require do dia pode falhar com ETIMEDOUT no readFileSync.
 * Este boot:
 *   1) materializa código local + deps críticas
 *   2) envolve o loader do Node com retry em ETIMEDOUT
 *   3) só então carrega app.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = __dirname;

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* spin */
    }
  }
}

function hydrateFile(filePath, retries = 10) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const fd = fs.openSync(filePath, 'r');
      try {
        const st = fs.fstatSync(fd);
        const n = Math.min(Math.max(st.size || 1, 1), 256 * 1024);
        fs.readSync(fd, Buffer.alloc(n), 0, n, 0);
      } finally {
        fs.closeSync(fd);
      }
      return true;
    } catch (err) {
      const code = err && err.code;
      if (code === 'ENOENT') return false;
      if (code === 'ETIMEDOUT' || code === 'EAGAIN' || code === 'EIO' || code === 'ENOTCONN') {
        const wait = Math.min(500 * 2 ** attempt, 8000);
        console.warn(
          `[API-DSX] hydrate ${path.relative(ROOT, filePath) || filePath}: ${code} (tentativa ${attempt + 1}/${retries}, wait ${wait}ms)`
        );
        sleepSync(wait);
        continue;
      }
      return false;
    }
  }
  console.error(`[API-DSX] hydrate falhou após retries: ${filePath}`);
  return false;
}

function walkHydrate(dir, depth = 0, maxDepth = 10) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === '.' || entry.name === '..') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'coverage') continue;
      walkHydrate(full, depth + 1, maxDepth);
      continue;
    }
    if (/\.(js|cjs|mjs|node|json)$/i.test(entry.name)) {
      hydrateFile(full);
    }
  }
}

function hydrateCritical() {
  const started = Date.now();
  console.log('[API-DSX] materializando arquivos locais (anti-ETIMEDOUT)…');

  const localDirs = [
    'DB',
    'routes',
    'services',
    'utils',
    'middleware',
    'Exceptions',
    'Models',
    'controllers',
  ];

  hydrateFile(path.join(ROOT, 'app.js'));
  for (const dir of localDirs) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) walkHydrate(full, 0, 6);
  }

  // Deps que o app.js exige de imediato + nativo sqlite3.
  const deps = [
    'sqlite3',
    'express',
    'cors',
    'dotenv',
    'ioredis',
    'body-parser',
    'qs',
    'debug',
    'accepts',
    'send',
    'finalhandler',
    'type-is',
    'mime',
    'mime-types',
    'negotiator',
    'proxy-addr',
    'raw-body',
    'content-type',
    'cookie',
    'encodeurl',
    'escape-html',
    'etag',
    'fresh',
    'http-errors',
    'merge-descriptors',
    'methods',
    'on-finished',
    'parseurl',
    'path-to-regexp',
    'range-parser',
    'serve-static',
    'statuses',
    'utils-merge',
    'vary',
  ];
  for (const dep of deps) {
    const depRoot = path.join(ROOT, 'node_modules', dep);
    if (fs.existsSync(depRoot)) walkHydrate(depRoot, 0, 8);
  }

  const sqliteBinding = path.join(
    ROOT,
    'node_modules',
    'sqlite3',
    'build',
    'Release',
    'node_sqlite3.node'
  );
  if (fs.existsSync(sqliteBinding)) hydrateFile(sqliteBinding);

  console.log(`[API-DSX] hydrate ok em ${Date.now() - started}ms`);
}

/** Retry de Module._load quando o SO ainda está materializando o arquivo. */
function installRequireRetry() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    let lastErr;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        return originalLoad.apply(this, arguments);
      } catch (err) {
        lastErr = err;
        const code = err && err.code;
        if (code !== 'ETIMEDOUT' && code !== 'EAGAIN' && code !== 'EIO' && code !== 'ENOTCONN') {
          throw err;
        }
        const wait = Math.min(500 * 2 ** attempt, 8000);
        console.warn(
          `[API-DSX] require retry "${request}": ${code} (tentativa ${attempt + 1}/8, wait ${wait}ms)`
        );
        sleepSync(wait);
      }
    }
    throw lastErr;
  };
}

try {
  hydrateCritical();
  installRequireRetry();
  require('./app.js');
} catch (err) {
  console.error('[API-DSX] boot falhou:', err && err.stack ? err.stack : err);
  process.exit(1);
}
