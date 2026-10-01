'use strict';

/**
 * Contrato HTTP da API-DSX atual (golden da Etapa 1).
 * Sobe boot.js numa porta livre, com SQLite temporário, exercita as rotas
 * e derruba o processo. Não usa a porta 3333 nem o banco do usuário.
 *
 * Rode: node Core/tests/contract/api-contract.js
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const PORT = Number(process.env.DSX_CONTRACT_PORT) || 3341;
const BASE = `http://127.0.0.1:${PORT}`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dsx-contract-'));
const DB_PATH = path.join(TMP, 'contract.db');

const FEATURES = [
  'users',
  'history',
  'favorites',
  'downloads',
  'vault',
  'tab-groups',
  'smart-suggestions',
  'janelas',
  'tab-warmth',
];

let failed = 0;
let child = null;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}: ${err.message}`);
  }
}

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(
      `${BASE}${pathname}`,
      {
        method,
        headers: payload
          ? { 'content-type': 'application/json', 'content-length': payload.length }
          : {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode, json, text });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error(`timeout ${method} ${pathname}`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function electronBin() {
  // require('electron') em Node puro devolve o path do binário.
  return require(path.join(ROOT, 'node_modules', 'electron'));
}

function startApi() {
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(PORT),
    DSX_API_DB_PATH: DB_PATH,
    DSX_FORCE_RUNTIME: '',
  };
  child = spawn(electronBin(), [path.join(ROOT, 'Backend/API-DSX/boot.js')], {
    cwd: path.join(ROOT, 'Backend/API-DSX'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (c) => {
    log += c;
  });
  child.stderr.on('data', (c) => {
    log += c;
  });
  child.on('exit', (code) => {
    if (code && failed >= 0 && !shuttingDown) {
      console.error(log.slice(-2000));
    }
  });
  return () => log;
}

let shuttingDown = false;

async function waitReady(getLog) {
  const deadline = Date.now() + 30000;
  let last = '';
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`API saiu com ${child.exitCode}\n${getLog().slice(-2000)}`);
    }
    try {
      const res = await request('GET', '/ready');
      last = `${res.status} ${res.text.slice(0, 200)}`;
      if (res.status === 200 && res.json && res.json.success) return res.json;
    } catch (err) {
      last = err.message;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`API não ficou pronta: ${last}\n${getLog().slice(-2000)}`);
}

function stopApi() {
  shuttingDown = true;
  if (child && child.exitCode == null) {
    child.kill('SIGTERM');
  }
  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

async function main() {
  const getLog = startApi();
  try {
    const ready = await waitReady(getLog);

    await check('GET /ready expõe version 3 e as features', async () => {
      assert(ready.version === 3, `version ${ready.version}`);
      assert(ready.starting === false, 'starting');
      for (const feature of FEATURES) {
        assert(ready.features.includes(feature), `falta feature ${feature}`);
      }
      assert(ready.db_path === DB_PATH, `db_path ${ready.db_path}`);
    });

    await check('GET /health', async () => {
      const res = await request('GET', '/health');
      assert(res.status === 200, String(res.status));
      assert(res.json.success === true, 'success');
      assert(res.json.starting === false, 'starting');
    });

    await check('POST /users rejeita nickname curto', async () => {
      const res = await request('POST', '/users', { nickname: 'a' });
      assert(res.status === 400, String(res.status));
      assert(res.json.success === false, 'success');
    });

    let userId = null;
    await check('POST /users cria perfil com senha', async () => {
      const res = await request('POST', '/users', { nickname: 'Contrato', password: 'test-pass-1' });
      assert(res.status === 201, `${res.status} ${res.text}`);
      assert(res.json.data.nickname === 'Contrato', 'nickname');
      assert(res.json.data.has_password === true, 'has_password');
      assert(!('password_hash' in res.json.data), 'hash não pode vazar');
      userId = res.json.data.id;
      assert(typeof userId === 'string' && userId.length > 0, 'id');
    });

    await check('GET /users/:id', async () => {
      const res = await request('GET', `/users/${userId}`);
      assert(res.status === 200, String(res.status));
      assert(res.json.data.id === userId, 'id');
    });

    await check('POST /users/:id/unlock confere a senha', async () => {
      const bad = await request('POST', `/users/${userId}/unlock`, { password: 'errada' });
      assert(bad.status === 401, `bad ${bad.status} ${bad.text}`);
      const ok = await request('POST', `/users/${userId}/unlock`, { password: 'test-pass-1' });
      assert(ok.status === 200 && ok.json.success === true, ok.text);
    });

    let historyId = null;
    await check('POST /history exige url e grava a visita', async () => {
      const bad = await request('POST', '/history', { user_id: userId });
      assert(bad.status === 400, String(bad.status));
      const res = await request('POST', '/history', {
        user_id: userId,
        url: 'https://example.com/contrato',
        title: 'Contrato',
        typed_count: 1,
      });
      assert(res.status === 201, res.text);
      assert(res.json.data.url === 'https://example.com/contrato', 'url');
      assert(res.json.data.user_id === userId, 'user_id');
      historyId = res.json.data.id;
    });

    await check('GET /history filtra por user_id', async () => {
      const res = await request('GET', `/history?user_id=${encodeURIComponent(userId)}`);
      assert(res.status === 200, String(res.status));
      assert(res.json.data.some((row) => row.id === historyId), 'histórico do user');
    });

    await check('favoritos: criar, listar, apagar', async () => {
      const created = await request('POST', '/favorites', {
        user_id: userId,
        url: 'https://example.com/fav',
        title: 'Fav',
      });
      assert(created.status === 201, created.text);
      const list = await request('GET', `/favorites?user_id=${encodeURIComponent(userId)}`);
      assert(list.json.data.some((row) => row.id === created.json.data.id), 'list');
      const removed = await request(
        'DELETE',
        `/favorites/${created.json.data.id}?user_id=${encodeURIComponent(userId)}`
      );
      assert(removed.status === 200 && removed.json.success === true, removed.text);
    });

    await check('downloads: criar e atualizar estado', async () => {
      const created = await request('POST', '/downloads', {
        user_id: userId,
        url: 'https://example.com/file.bin',
        filename: 'file.bin',
        state: 'progressing',
      });
      assert(created.status === 201, created.text);
      const updated = await request('PATCH', `/downloads/${created.json.data.id}`, {
        state: 'completed',
        user_id: userId,
      });
      assert(updated.status === 200, updated.text);
      assert(updated.json.data.state === 'completed', updated.text);
    });

    let token = null;
    await check('vault unlock com senha do perfil (TTL 12h)', async () => {
      const bad = await request('POST', '/vault/unlock', { user_id: userId, password: 'errada' });
      assert(bad.status === 401, bad.text);
      const res = await request('POST', '/vault/unlock', { user_id: userId, password: 'test-pass-1' });
      assert(res.status === 200, res.text);
      assert(res.json.data.unlocked === true, 'unlocked');
      assert(res.json.data.expires_in_ms === 12 * 60 * 60 * 1000, `ttl ${res.json.data.expires_in_ms}`);
      assert(typeof res.json.data.token === 'string' && res.json.data.token.length === 48, 'token hex 24 bytes');
      token = res.json.data.token;
    });

    let vaultId = null;
    await check('vault cria sem devolver a senha e reveal devolve', async () => {
      const created = await request('POST', '/vault', {
        user_id: userId,
        origin: 'https://example.com',
        username: 'ada',
        password: 'senha-do-site-ção',
        token,
      });
      assert(created.status === 201, created.text);
      assert(!('password' in created.json.data), 'password vazou na listagem');
      assert(!('ciphertext' in created.json.data), 'ciphertext vazou');
      vaultId = created.json.data.id;
      const revealed = await request('POST', `/vault/${vaultId}/reveal`, { user_id: userId, token });
      assert(revealed.status === 200, revealed.text);
      assert(revealed.json.data.password === 'senha-do-site-ção', revealed.text);
    });

    await check('vault lock invalida o token', async () => {
      const locked = await request('POST', '/vault/lock', { user_id: userId, token });
      assert(locked.status === 200, locked.text);
      const revealed = await request('POST', `/vault/${vaultId}/reveal`, { user_id: userId, token });
      assert(revealed.status === 401, revealed.text);
    });

    await check('tab groups: criar, substituir abas, listar', async () => {
      const created = await request('POST', '/tab-groups', {
        user_id: userId,
        name: 'Contrato',
        color: '#7a8cff',
      });
      assert(created.status === 201, created.text);
      const replaced = await request('PUT', `/tab-groups/${created.json.data.id}/tabs`, {
        user_id: userId,
        tabs: [{ url: 'https://example.com/aba', title: 'Aba', active: true }],
      });
      assert(replaced.status === 200, replaced.text);
      assert(replaced.json.data.tabs.length === 1, replaced.text);
      assert(replaced.json.data.tabs[0].url === 'https://example.com/aba', 'url da aba');
    });

    await check('DELETE /users/:id remove o perfil', async () => {
      const res = await request('DELETE', `/users/${userId}`);
      assert(res.status === 200, res.text);
      const gone = await request('GET', `/users/${userId}`);
      assert(gone.status === 404, `${gone.status} ${gone.text}`);
    });
  } finally {
    stopApi();
  }

  if (failed) {
    console.error(`${failed} falha(s) — log:\n${getLog().slice(-2000)}`);
    process.exit(1);
  }
  console.log('api contract ok');
}

main().catch((err) => {
  console.error(err);
  stopApi();
  process.exit(1);
});
