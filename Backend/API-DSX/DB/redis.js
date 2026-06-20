const { createClient } = require('redis');

let client = null;
let isConnected = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const SESSION_CACHE_PREFIX = 'session:history:';
const SESSION_CACHE_TTL = 300;

async function initializeRedis() {
  try {
    client = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: () => false,
        connectTimeout: 2000,
      },
    });

    client.on('error', () => {
      isConnected = false;
    });

    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao conectar')), 2500)
      ),
    ]);

    isConnected = true;
    console.log('[Redis] Conectado');
  } catch (err) {
    isConnected = false;
    if (client) {
      try {
        client.removeAllListeners();
        await client.disconnect();
      } catch {
        // ignore cleanup errors
      }
      client = null;
    }
    console.warn('[Redis] Não foi possível conectar. A API continuará sem cache:', err.message);
  }
}

function isRedisAvailable() {
  return isConnected && client !== null;
}

async function getSessionCache(key) {
  if (!isRedisAvailable()) return null;

  try {
    const data = await client.get(`${SESSION_CACHE_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function setSessionCache(key, value, ttl = SESSION_CACHE_TTL) {
  if (!isRedisAvailable()) return;

  try {
    await client.set(`${SESSION_CACHE_PREFIX}${key}`, JSON.stringify(value), { EX: ttl });
  } catch {
    // Cache failure should not break the API
  }
}

async function invalidateSessionCache(key) {
  if (!isRedisAvailable()) return;

  try {
    await client.del(`${SESSION_CACHE_PREFIX}${key}`);
  } catch {
    // Cache failure should not break the API
  }
}

async function invalidateAllSessionCache() {
  if (!isRedisAvailable()) return;

  try {
    const keys = await client.keys(`${SESSION_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch {
    // Cache failure should not break the API
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
