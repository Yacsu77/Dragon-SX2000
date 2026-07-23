/**
 * Bootstrap da API-DSX.
 *
 * Dev (Desktop/iCloud): copia o código para userData e instala deps via npm
 * (fora do iCloud) para evitar ETIMEDOUT.
 *
 * Build empacotado: usa node_modules já incluídos no app (extraResources) —
 * sem depender de npm no computador do usuário.
 */
'use strict';

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const Module = require('module');
const { spawnSync } = require('child_process');

const SOURCE_ROOT = __dirname;
const PROJECT_ROOT = process.env.DSX_PROJECT_ROOT
  ? path.resolve(process.env.DSX_PROJECT_ROOT)
  : path.resolve(SOURCE_ROOT, '..', '..');
const IS_PACKAGED = process.env.DSX_PACKAGED === '1';

function resolveRuntimeRoot() {
  if (process.env.DSX_USER_DATA) {
    return path.join(process.env.DSX_USER_DATA, 'API-DSX');
  }
  // Fallback legado (dev macOS / iCloud)
  return path.join(os.homedir(), 'Library', 'Application Support', 'Dragon-SX2000', 'API-DSX');
}

const RUNTIME_ROOT = resolveRuntimeRoot();
const SOURCE_SKIP = new Set(['node_modules', '.git', 'coverage', 'Docs']);

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

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })),
        ms
      );
    }),
  ]);
}

async function copyFileTimed(src, dest, timeoutMs = 8000) {
  const data = await withTimeout(fsp.readFile(src), timeoutMs);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.writeFile(dest, data);
}

async function copyTextIfExists(src, dest, timeoutMs = 4000) {
  try {
    await withTimeout(fsp.access(src, fs.constants.R_OK), 1000);
  } catch {
    return false;
  }
  try {
    await copyFileTimed(src, dest, timeoutMs);
    return true;
  } catch (err) {
    console.warn(
      `[API-DSX] copy skip ${path.relative(SOURCE_ROOT, src)}: ${err.code || err.message}`
    );
    return false;
  }
}

async function copyJsTree(srcDir, destDir) {
  let entries;
  try {
    entries = await withTimeout(fsp.readdir(srcDir, { withFileTypes: true }), 3000);
  } catch {
    return;
  }
  await fsp.mkdir(destDir, { recursive: true });
  for (const entry of entries) {
    if (SOURCE_SKIP.has(entry.name)) continue;
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyJsTree(from, to);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(js|cjs|mjs|json|sql)$/i.test(entry.name)) continue;
    if (entry.name === 'boot.js') continue;
    await copyTextIfExists(from, to);
  }
}

async function syncSourceTree() {
  await fsp.mkdir(RUNTIME_ROOT, { recursive: true });

  await copyTextIfExists(
    path.join(SOURCE_ROOT, 'package.json'),
    path.join(RUNTIME_ROOT, 'package.json')
  );
  await copyTextIfExists(
    path.join(SOURCE_ROOT, 'package-lock.json'),
    path.join(RUNTIME_ROOT, 'package-lock.json')
  );
  await copyTextIfExists(path.join(SOURCE_ROOT, '.env'), path.join(RUNTIME_ROOT, '.env'));
  await copyTextIfExists(path.join(SOURCE_ROOT, 'app.js'), path.join(RUNTIME_ROOT, 'app.js'));

  await copyJsTree(SOURCE_ROOT, RUNTIME_ROOT);

  const srcDb = path.join(SOURCE_ROOT, 'DB', 'dsx-browser.db');
  const dstDb = path.join(RUNTIME_ROOT, 'DB', 'dsx-browser.db');
  try {
    await fsp.access(dstDb, fs.constants.R_OK);
  } catch {
    await copyTextIfExists(srcDb, dstDb, 30000);
  }
}

function depsInstalled(root) {
  try {
    fs.accessSync(path.join(root, 'node_modules', 'express', 'package.json'));
    fs.accessSync(path.join(root, 'node_modules', 'sqlite3', 'package.json'));
    return true;
  } catch {
    return false;
  }
}

function ensureRuntimeDeps() {
  if (depsInstalled(RUNTIME_ROOT)) {
    console.log('[API-DSX] runtime deps ok (userData)');
    return true;
  }

  console.log('[API-DSX] instalando deps em userData…');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(
    npmCmd,
    ['install', '--omit=dev', '--no-fund', '--no-audit'],
    {
      cwd: RUNTIME_ROOT,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      encoding: 'utf8',
      timeout: 300000,
    }
  );

  if (result.error) {
    console.error('[API-DSX] npm install falhou:', result.error.message);
    return false;
  }
  if (result.status !== 0) {
    console.error('[API-DSX] npm install exit=', result.status);
    if (result.stderr) console.error(result.stderr.slice(-2000));
    return false;
  }

  if (!depsInstalled(RUNTIME_ROOT)) {
    console.error('[API-DSX] deps ainda ausentes após npm install');
    return false;
  }

  console.log('[API-DSX] deps instaladas no runtime');
  return true;
}

function installRequireRetry() {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request) {
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
        const wait = Math.min(400 * 2 ** attempt, 8000);
        console.warn(
          `[API-DSX] require retry "${request}": ${code} (${attempt + 1}/8, wait ${wait}ms)`
        );
        sleepSync(wait);
      }
    }
    throw lastErr;
  };
}

function ensureDbDir() {
  const dbPath = process.env.DSX_API_DB_PATH;
  if (!dbPath) return;
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch (_) {
    /* ignore */
  }
}

function loadApp(appPath) {
  process.env.DSX_PROJECT_ROOT = PROJECT_ROOT;
  ensureDbDir();
  installRequireRetry();
  console.log('[API-DSX] carregando', appPath);
  require(appPath);
}

(async () => {
  try {
    // Build: deps já vêm no pacote — sobe direto (DB em userData via env).
    if (IS_PACKAGED && depsInstalled(SOURCE_ROOT)) {
      console.log('[API-DSX] modo empacotado — usando deps bundled');
      loadApp(path.join(SOURCE_ROOT, 'app.js'));
      return;
    }

    // Dev com node_modules locais (sem iCloud): sobe direto.
    if (!IS_PACKAGED && depsInstalled(SOURCE_ROOT) && process.env.DSX_FORCE_RUNTIME !== '1') {
      console.log('[API-DSX] modo desenvolvimento — deps locais');
      loadApp(path.join(SOURCE_ROOT, 'app.js'));
      return;
    }

    console.log('[API-DSX] preparando runtime em userData…');
    await syncSourceTree();
    if (!ensureRuntimeDeps()) {
      console.warn('[API-DSX] fallback: tentando app.js na origem');
      loadApp(path.join(SOURCE_ROOT, 'app.js'));
      return;
    }

    process.chdir(RUNTIME_ROOT);
    loadApp(path.join(RUNTIME_ROOT, 'app.js'));
  } catch (err) {
    console.error('[API-DSX] boot falhou:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
