/**
 * Downloads na lista da sessão.
 *
 * O progresso (criar e atualizar) fica no diário. Apagar sai da lista
 * e o serviço grava o DELETE na hora.
 */

const { randomId } = require('../Utils/crypto');
const { formatDownload } = require('../DTO/downloadsDTO');
const store = require('./sessionStore');

function list(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket || !bucket.opened) return null;
  return Array.from(bucket.downloads.values())
    .sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')))
    .map(formatDownload);
}

function create(bucket, data) {
  const row = {
    id: data.id || randomId(),
    user_id: data.user_id,
    url: data.url,
    filename: data.filename,
    mime: data.mime,
    size: data.size,
    state: data.state,
    save_path: data.save_path,
    started_at: data.started_at,
    finished_at: data.finished_at,
    persisted: false,
  };
  bucket.downloads.set(row.id, row);
  bucket.pendingDownloads.set(row.id, row);
  store.markDirty(bucket);
  return formatDownload(row);
}

function findBucket(userId, id) {
  if (userId) {
    const bucket = store.getBucket(userId);
    if (bucket && bucket.downloads.has(id)) return bucket;
  }
  for (const bucket of store.listBuckets()) {
    if (bucket.downloads.has(id)) return bucket;
  }
  return null;
}

function update(userId, id, data) {
  const bucket = findBucket(userId, id);
  if (!bucket) return null;
  const row = bucket.downloads.get(id);
  if (!row) return null;

  const next = {
    ...row,
    filename: data.filename !== undefined ? data.filename : row.filename,
    mime: data.mime !== undefined ? data.mime : row.mime,
    size: data.size !== undefined ? data.size : row.size,
    state: data.state !== undefined ? data.state : row.state,
    save_path: data.save_path !== undefined ? data.save_path : row.save_path,
    finished_at: data.finished_at !== undefined ? data.finished_at : row.finished_at,
  };
  bucket.downloads.set(id, next);
  bucket.pendingDownloads.set(id, next);
  store.markDirty(bucket);
  return formatDownload(next);
}

function forget(userId, id) {
  const bucket = store.getBucket(userId);
  if (!bucket) return null;
  const row = bucket.downloads.get(id);
  if (!row) return null;
  bucket.downloads.delete(id);
  bucket.pendingDownloads.delete(id);
  return row;
}

function clear(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket) return;
  bucket.downloads.clear();
  bucket.pendingDownloads.clear();
}

module.exports = {
  list,
  create,
  update,
  forget,
  clear,
};
