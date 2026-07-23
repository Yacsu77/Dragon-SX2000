const net = require('net');

const memory = new Map();
const rankMemory = new Map();
const SESSION_CACHE_PREFIX = 'session:history:';
const SESSION_CACHE_TTL = 300;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_TIMEOUT_MS = Number(process.env.REDIS_TIMEOUT_MS || 180);
let redisAvailable = false;

function encodeCommand(args) {
  const chunks = [`*${args.length}\r\n`];
  args.forEach((arg) => {
    const value = String(arg);
    chunks.push(`$${Buffer.byteLength(value)}\r\n${value}\r\n`);
  });
  return chunks.join('');
}

function parseReply(buffer) {
  let offset = 0;
  function line() {
    const end = buffer.indexOf('\r\n', offset);
    if (end < 0) throw new Error('Resposta Redis incompleta');
    const value = buffer.slice(offset, end);
    offset = end + 2;
    return value;
  }
  function read() {
    const type = buffer[offset++];
    if (type === '+') return line();
    if (type === '-') throw new Error(line());
    if (type === ':') return Number(line());
    if (type === '$') {
      const size = Number(line());
      if (size < 0) return null;
      const value = buffer.slice(offset, offset + size);
      offset += size + 2;
      return value;
    }
    if (type === '*') {
      const size = Number(line());
      if (size < 0) return null;
      return Array.from({ length: size }, read);
    }
    throw new Error('Resposta Redis inválida');
  }
  return read();
}

function redisCommand(...args) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: REDIS_HOST, port: REDIS_PORT });
    const chunks = [];
    let settled = false;
    const timer = setTimeout(() => socket.destroy(new Error('Redis timeout')), REDIS_TIMEOUT_MS);
    socket.once('connect', () => socket.write(encodeCommand(args)));
    socket.on('data', (chunk) => {
      chunks.push(chunk);
      try {
        const reply = parseReply(Buffer.concat(chunks).toString('utf8'));
        settled = true;
        clearTimeout(timer);
        socket.end();
        resolve(reply);
      } catch (error) {
        if (!String(error.message).includes('incompleta')) {
          settled = true;
          clearTimeout(timer);
          socket.destroy();
          reject(error);
        }
      }
    });
    socket.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    socket.once('end', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(parseReply(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function initializeRedis() {
  try {
    redisAvailable = (await redisCommand('PING')) === 'PONG';
  } catch (_) {
    redisAvailable = false;
  }
  console.log(
    redisAvailable
      ? `[Redis] Conectado em ${REDIS_HOST}:${REDIS_PORT}`
      : '[Redis] Indisponível; ranking continua com fallback SQLite/memória'
  );
}

function isRedisAvailable() {
  return redisAvailable;
}

async function getSessionCache(key) {
  if (redisAvailable) {
    try {
      const raw = await redisCommand('GET', `${SESSION_CACHE_PREFIX}${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      redisAvailable = false;
    }
  }
  const entry = memory.get(`${SESSION_CACHE_PREFIX}${key}`);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memory.delete(`${SESSION_CACHE_PREFIX}${key}`);
    return null;
  }
  return entry.value;
}

async function setSessionCache(key, value, ttl = SESSION_CACHE_TTL) {
  if (redisAvailable) {
    try {
      await redisCommand(
        'SET',
        `${SESSION_CACHE_PREFIX}${key}`,
        JSON.stringify(value),
        'EX',
        String(ttl)
      );
      return;
    } catch (_) {
      redisAvailable = false;
    }
  }
  memory.set(`${SESSION_CACHE_PREFIX}${key}`, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

async function invalidateSessionCache(key) {
  if (redisAvailable) {
    try {
      await redisCommand('DEL', `${SESSION_CACHE_PREFIX}${key}`);
    } catch (_) {
      redisAvailable = false;
    }
  }
  memory.delete(`${SESSION_CACHE_PREFIX}${key}`);
}

async function invalidateAllSessionCache() {
  if (redisAvailable) {
    // As chaves de histórico são curtas e conhecidas; ranking usa namespace separado.
    try {
      const keys = await redisCommand('KEYS', `${SESSION_CACHE_PREFIX}*`);
      if (Array.isArray(keys) && keys.length) await redisCommand('DEL', ...keys);
    } catch (_) {
      redisAvailable = false;
    }
  }
  for (const key of [...memory.keys()]) {
    if (key.startsWith(SESSION_CACHE_PREFIX)) memory.delete(key);
  }
}

function rankKey(userId) {
  return `smart-search:rank:${userId || 'default'}`;
}

async function updateUrlRank(userId, url, score) {
  const key = rankKey(userId);
  if (redisAvailable) {
    try {
      await redisCommand('ZADD', key, String(score), url);
      return;
    } catch (_) {
      redisAvailable = false;
    }
  }
  if (!rankMemory.has(key)) rankMemory.set(key, new Map());
  rankMemory.get(key).set(url, Number(score));
}

async function getRankedUrls(userId, limit = 100) {
  const key = rankKey(userId);
  if (redisAvailable) {
    try {
      const values = await redisCommand('ZREVRANGE', key, '0', String(Math.max(0, limit - 1)));
      return Array.isArray(values) ? values : [];
    } catch (_) {
      redisAvailable = false;
    }
  }
  const values = rankMemory.get(key);
  if (!values) return [];
  return [...values.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([url]) => url);
}

async function removeUrlRank(userId, url) {
  const key = rankKey(userId);
  if (redisAvailable) {
    try {
      await redisCommand('ZREM', key, url);
    } catch (_) {
      redisAvailable = false;
    }
  }
  rankMemory.get(key)?.delete(url);
}

async function clearUrlRank(userId) {
  const key = rankKey(userId);
  if (redisAvailable) {
    try {
      await redisCommand('DEL', key);
    } catch (_) {
      redisAvailable = false;
    }
  }
  rankMemory.delete(key);
}

module.exports = {
  initializeRedis,
  isRedisAvailable,
  getSessionCache,
  setSessionCache,
  invalidateSessionCache,
  invalidateAllSessionCache,
  updateUrlRank,
  getRankedUrls,
  removeUrlRank,
  clearUrlRank,
};
