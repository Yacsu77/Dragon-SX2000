'use strict';

/**
 * Gera Core/tests/crypto/vectors.json a partir do crypto do Node,
 * os mesmos algoritmos de Backend/API-DSX/Utils/crypto.js.
 *
 * O dsx-core em C tem que reproduzir estes bytes. Dois detalhes que
 * não são óbvios lendo só "scrypt + AES-GCM":
 *
 * 1. hashSecret passa o salt como STRING hex (32 caracteres ASCII) para
 *    scryptSync — o salt efetivo tem 32 bytes, não os 16 bytes decodificados.
 * 2. deriveVaultKey faz o contrário: Buffer.from(saltHex, 'hex') → 16 bytes.
 *
 * Rode: node Core/tests/crypto/generate-vectors.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SALT_HEX = '00112233445566778899aabbccddeeff';
const SECRET = 'dsx-test-password';
const DEVICE_USER = 'user-fixed-id';
const DEVICE_SECRET = `dsx-device:${DEVICE_USER}`;
const PLAINTEXT = 'senha-do-site-ção';
const IV = Buffer.from('0102030405060708090a0b0c', 'hex');

function scryptHex(secret, salt, keylen) {
  return crypto.scryptSync(String(secret), salt, keylen).toString('hex');
}

const profileHash = scryptHex(SECRET, SALT_HEX, 64);
const vaultKeyHex = scryptHex(SECRET, Buffer.from(SALT_HEX, 'hex'), 32);
const deviceKeyHex = scryptHex(DEVICE_SECRET, Buffer.from(SALT_HEX, 'hex'), 32);

function seal(plain, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, IV);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
    iv: IV.toString('base64'),
    tagBytes: tag.length,
  };
}

const vectors = {
  source: 'Backend/API-DSX/Utils/crypto.js',
  node: process.versions.node,
  openssl: process.versions.openssl,
  scrypt: {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
    note: 'Defaults de crypto.scryptSync quando options não é passado.',
  },
  aes: {
    algorithm: 'aes-256-gcm',
    ivBytes: 12,
    tagBytes: 16,
    tagPlacement: 'appended-to-ciphertext',
    encoding: 'ciphertext e iv em base64, separados',
  },
  saltEncoding: {
    hashSecret: 'string hex de 32 caracteres ASCII (NAO os 16 bytes decodificados)',
    deriveVaultKey: 'Buffer.from(saltHex, "hex") — 16 bytes',
  },
  cases: [
    {
      id: 'profile-hash',
      op: 'hashSecret',
      secret: SECRET,
      salt: SALT_HEX,
      saltPassedAs: 'utf8-string',
      keylen: 64,
      hash: profileHash,
    },
    {
      id: 'vault-key',
      op: 'deriveVaultKey',
      secret: SECRET,
      saltHex: SALT_HEX,
      saltPassedAs: 'hex-decoded-bytes',
      keylen: 32,
      key: vaultKeyHex,
    },
    {
      id: 'device-key',
      op: 'deriveVaultKey',
      secret: DEVICE_SECRET,
      userId: DEVICE_USER,
      secretFormat: 'dsx-device:{userId}',
      saltHex: SALT_HEX,
      saltPassedAs: 'hex-decoded-bytes',
      keylen: 32,
      key: deviceKeyHex,
    },
    {
      id: 'vault-seal',
      op: 'encryptAesGcm',
      keyFrom: 'vault-key',
      plaintext: PLAINTEXT,
      plaintextEncoding: 'utf8',
      ivHex: IV.toString('hex'),
      ...seal(PLAINTEXT, vaultKeyHex),
    },
  ],
};

const out = path.join(__dirname, 'vectors.json');
fs.writeFileSync(out, `${JSON.stringify(vectors, null, 2)}\n`);
console.log(`wrote ${out}`);
