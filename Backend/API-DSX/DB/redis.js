/**
 * Cache de sessão opcional.
 * Implementação em memória — a dependência `redis` (v6) travava o require()
 * e impedia a API de subir (`listen` nunca era alcançado).
 *
 * Interface mantida para SyncAdapter/histórico; trocar o backend depois
 * sem mudar Services.
 */

const memory = new Map();
const SESSION_CACHE_PREFIX = 'session:history:';
const SESSION_CACHE_TTL = 300;

let warned = false;

async function initializeRedis() {
  if (!warned) {
    warned = true;
    console.log('[Cache] Usando cache em memória (Redis desabilitado no boot local)');
  }
}

function isRedisAvailable() {
  return true;
}

async function getSessionCache(key) {
  const entry = memory.get(`${SESSION_CACHE_PREFIX}${key}`);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memory.delete(`${SESSION_CACHE_PREFIX}${key}`);
    return null;
  }
  return entry.value;
}

async function setSessionCache(key, value, ttl = SESSION_CACHE_TTL) {
  memory.set(`${SESSION_CACHE_PREFIX}${key}`, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

async function invalidateSessionCache(key) {
  memory.delete(`${SESSION_CACHE_PREFIX}${key}`);
}

async function invalidateAllSessionCache() {
  for (const key of [...memory.keys()]) {
    if (key.startsWith(SESSION_CACHE_PREFIX)) memory.delete(key);
  }
}

module.exports = {
  initializeRedis,
  isRedisAvailable,
  getSessionCache,
  setSessionCache,
  invalidateSessionCache,
  invalidateAllSessionCache,
};
