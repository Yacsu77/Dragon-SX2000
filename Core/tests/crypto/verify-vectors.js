'use strict';

/**
 * Confere vectors.json contra Backend/API-DSX/Utils/crypto.js.
 * Falha (exit 1) se o Node deixar de produzir os mesmos bytes —
 * esse arquivo é o contrato que o dsx-core em C precisa cumprir.
 */
const crypto = require('crypto');
const assert = require('assert');
const vectors = require('./vectors.json');
const apiCrypto = require('../../../Backend/API-DSX/Utils/crypto');

let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}: ${err.message}`);
  }
}

const byId = Object.fromEntries(vectors.cases.map((c) => [c.id, c]));

check('profile-hash bate com scryptSync(string salt, 64)', () => {
  const c = byId['profile-hash'];
  const hash = crypto.scryptSync(c.secret, c.salt, c.keylen).toString('hex');
  assert.strictEqual(hash, c.hash);
  assert.strictEqual(c.salt.length, 32, 'salt de hashSecret é hex ASCII de 32 chars');
  assert.strictEqual(apiCrypto.verifySecret(c.secret, c.salt, c.hash), true);
  assert.strictEqual(apiCrypto.verifySecret('outra-senha', c.salt, c.hash), false);
  assert.strictEqual(apiCrypto.verifySecret('', c.salt, c.hash), false);
});

check('vault-key usa salt decodificado (16 bytes), não a string', () => {
  const c = byId['vault-key'];
  const salt = Buffer.from(c.saltHex, 'hex');
  assert.strictEqual(salt.length, 16);
  const key = crypto.scryptSync(c.secret, salt, c.keylen).toString('hex');
  assert.strictEqual(key, c.key);
  const asString = crypto.scryptSync(c.secret, c.saltHex, c.keylen).toString('hex');
  assert.notStrictEqual(asString, c.key, 'passar o hex como string tem que divergir');
  assert.deepStrictEqual(apiCrypto.deriveVaultKey(c.secret, c.saltHex), Buffer.from(c.key, 'hex'));
});

check('device-key é dsx-device:{userId}', () => {
  const c = byId['device-key'];
  assert.strictEqual(c.secret, `dsx-device:${c.userId}`);
  const key = apiCrypto.deriveVaultKey(c.secret, c.saltHex).toString('hex');
  assert.strictEqual(key, c.key);
});

check('vault-seal abre com decryptAesGcm e tag de 16 bytes no final', () => {
  const c = byId['vault-seal'];
  const key = Buffer.from(byId['vault-key'].key, 'hex');
  assert.strictEqual(c.tagBytes, 16);
  assert.strictEqual(c.ivBytes ? c.ivBytes : Buffer.from(c.iv, 'base64').length, 12);
  const plain = apiCrypto.decryptAesGcm(c.ciphertext, c.iv, key);
  assert.strictEqual(plain, c.plaintext);

  const payload = Buffer.from(c.ciphertext, 'base64');
  payload[payload.length - 1] ^= 0x01;
  assert.throws(() => apiCrypto.decryptAesGcm(payload.toString('base64'), c.iv, key));
});

check('parâmetros scrypt do arquivo são os defaults do Node', () => {
  assert.strictEqual(vectors.scrypt.N, 16384);
  assert.strictEqual(vectors.scrypt.r, 8);
  assert.strictEqual(vectors.scrypt.p, 1);
});

if (failed) {
  console.error(`${failed} falha(s)`);
  process.exit(1);
}
console.log('crypto vectors ok');
