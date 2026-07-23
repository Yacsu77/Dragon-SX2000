const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const AES_KEYLEN = 32;

function randomId() {
  return crypto.randomUUID();
}

function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(secret), salt, SCRYPT_KEYLEN).toString('hex');
  return { salt, hash };
}

function verifySecret(secret, salt, expectedHash) {
  if (!secret || !salt || !expectedHash) return false;
  try {
    const hash = crypto.scryptSync(String(secret), salt, SCRYPT_KEYLEN).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function deriveVaultKey(secret, saltHex) {
  return crypto.scryptSync(String(secret), Buffer.from(saltHex, 'hex'), AES_KEYLEN);
}

function encryptAesGcm(plainText, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, tag]);
  return {
    ciphertext: payload.toString('base64'),
    iv: iv.toString('base64'),
  };
}

function decryptAesGcm(ciphertextB64, ivB64, key) {
  const payload = Buffer.from(ciphertextB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = payload.subarray(payload.length - 16);
  const data = payload.subarray(0, payload.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = {
  randomId,
  hashSecret,
  verifySecret,
  deriveVaultKey,
  encryptAesGcm,
  decryptAesGcm,
};
