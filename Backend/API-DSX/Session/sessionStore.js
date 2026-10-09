/**
 * Listas em memória por perfil e o diário que ainda não foi ao disco.
 *
 * Cada bucket é a navegação atual daquele usuário. `pending*` é o que o
 * flush grava. `takePending` troca o diário por mapas vazios para a
 * navegação continuar enquanto a transação roda.
 */

const buckets = new Map();
const pendingTouches = new Map();

function createBucket(userId) {
  return {
    userId,
    opened: false,
    historyById: new Map(),
    historyByUrl: new Map(),
    favorites: new Map(),
    downloads: new Map(),
    groups: new Map(),
    pendingHistory: new Map(),
    pendingFavorites: new Map(),
    pendingDownloads: new Map(),
    pendingGroups: new Map(),
    dirty: false,
  };
}

function getBucket(userId) {
  if (!userId) return null;
  return buckets.get(userId) || null;
}

function listBuckets() {
  return Array.from(buckets.values());
}

function ensureBucket(userId) {
  let bucket = buckets.get(userId);
  if (!bucket) {
    bucket = createBucket(userId);
    buckets.set(userId, bucket);
  }
  return bucket;
}

function markDirty(bucket) {
  if (bucket) bucket.dirty = true;
}

function rememberTouch(userId) {
  if (!userId) return;
  pendingTouches.set(userId, new Date().toISOString());
  const bucket = buckets.get(userId);
  if (bucket) bucket.dirty = true;
}

function hasWork() {
  if (pendingTouches.size > 0) return true;
  for (const bucket of buckets.values()) {
    if (!bucket.dirty) continue;
    if (
      bucket.pendingHistory.size ||
      bucket.pendingFavorites.size ||
      bucket.pendingDownloads.size ||
      bucket.pendingGroups.size
    ) {
      return true;
    }
  }
  return false;
}

function takePending() {
  const snapshot = {
    touches: new Map(pendingTouches),
    users: [],
  };
  pendingTouches.clear();

  for (const bucket of buckets.values()) {
    if (!bucket.dirty) continue;
    snapshot.users.push({
      userId: bucket.userId,
      history: new Map(bucket.pendingHistory),
      favorites: new Map(bucket.pendingFavorites),
      downloads: new Map(bucket.pendingDownloads),
      groups: new Map(bucket.pendingGroups),
    });
    bucket.pendingHistory = new Map();
    bucket.pendingFavorites = new Map();
    bucket.pendingDownloads = new Map();
    bucket.pendingGroups = new Map();
    bucket.dirty = false;
  }

  return snapshot;
}

function restorePending(snapshot) {
  snapshot.touches.forEach((value, userId) => {
    if (!pendingTouches.has(userId)) pendingTouches.set(userId, value);
  });

  snapshot.users.forEach((part) => {
    const bucket = buckets.get(part.userId);
    if (!bucket) return;
    part.history.forEach((row, id) => {
      if (!bucket.pendingHistory.has(id)) bucket.pendingHistory.set(id, row);
    });
    part.favorites.forEach((row, id) => {
      if (!bucket.pendingFavorites.has(id)) bucket.pendingFavorites.set(id, row);
    });
    part.downloads.forEach((row, id) => {
      if (!bucket.pendingDownloads.has(id)) bucket.pendingDownloads.set(id, row);
    });
    part.groups.forEach((row, id) => {
      if (!bucket.pendingGroups.has(id)) bucket.pendingGroups.set(id, row);
    });
    bucket.dirty = true;
  });
}

function markPersisted(snapshot) {
  snapshot.users.forEach((part) => {
    const bucket = buckets.get(part.userId);
    if (!bucket) return;
    part.history.forEach((row) => {
      const live = bucket.historyById.get(row.id);
      if (live) live.persisted = true;
    });
    part.favorites.forEach((row) => {
      const live = bucket.favorites.get(row.id);
      if (live) live.persisted = true;
    });
    part.downloads.forEach((row) => {
      const live = bucket.downloads.get(row.id);
      if (live) live.persisted = true;
    });
    part.groups.forEach((row) => {
      const live = bucket.groups.get(row.id);
      if (live) live.persisted = true;
    });
  });
}

function drop(userId) {
  buckets.delete(userId);
  pendingTouches.delete(userId);
}

module.exports = {
  getBucket,
  listBuckets,
  ensureBucket,
  markDirty,
  rememberTouch,
  hasWork,
  takePending,
  restorePending,
  markPersisted,
  drop,
};
