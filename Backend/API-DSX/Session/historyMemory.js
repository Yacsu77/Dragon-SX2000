/**
 * Visitas na lista da sessão.
 *
 * Uma URL já conhecida só incrementa contagem. O disco espera o flush.
 * A busca inteligente lê `rows`. A tela de histórico mistura o diário
 * por cima do que já está na tabela.
 */

const { formatHistoryResponse } = require('../DTO/historyDTO');
const store = require('./sessionStore');
const { reserveHistoryId } = require('./sessionHydrate');

async function recordVisit(bucket, data) {
  const userId = data.user_id || data.profile_id || null;
  const now = new Date().toISOString();
  const current = bucket.historyByUrl.get(data.url);

  const row = current
    ? {
        ...current,
        visit_count: Number(current.visit_count || 0) + 1,
        typed_count: Number(current.typed_count || 0) + (data.typed_count || 0),
        last_visit_time: now,
        title: data.title || current.title,
        favicon_url: data.favicon_url || current.favicon_url,
        transition_type: data.transition_type || current.transition_type,
        referrer_url: data.referrer_url || current.referrer_url,
        user_id: userId || current.user_id,
        profile_id: userId || current.profile_id,
      }
    : {
        id: await reserveHistoryId(),
        url: data.url,
        title: data.title || null,
        visit_count: 1,
        typed_count: data.typed_count || 0,
        last_visit_time: now,
        created_at: now,
        favicon_url: data.favicon_url || null,
        transition_type: data.transition_type || 'link',
        referrer_url: data.referrer_url || null,
        profile_id: userId,
        user_id: userId,
        persisted: false,
      };

  bucket.historyById.set(row.id, row);
  bucket.historyByUrl.set(row.url, row);
  bucket.pendingHistory.set(row.id, row);
  store.markDirty(bucket);
  return formatHistoryResponse(row);
}

function rows(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket || !bucket.opened) return null;
  return Array.from(bucket.historyById.values());
}

function find(id) {
  const numeric = Number(id);
  for (const bucket of store.listBuckets()) {
    const row = bucket.historyById.get(numeric);
    if (row) return { bucket, row };
  }
  return null;
}

function forget(id) {
  const found = find(id);
  if (!found) return null;
  const { bucket, row } = found;
  bucket.historyById.delete(row.id);
  bucket.historyByUrl.delete(row.url);
  bucket.pendingHistory.delete(row.id);
  return row;
}

function clear(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket) return;
  bucket.historyById.clear();
  bucket.historyByUrl.clear();
  bucket.pendingHistory.clear();
}

function overlay(userId, dbRows) {
  const bucket = store.getBucket(userId);
  if (!bucket || !bucket.opened) return dbRows;

  const byId = new Map(dbRows.map((row) => [row.id, row]));
  bucket.historyById.forEach((row) => {
    if (!row.persisted || bucket.pendingHistory.has(row.id)) {
      byId.set(row.id, row);
    }
  });
  bucket.pendingHistory.forEach((row) => byId.set(row.id, row));
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = Date.parse(a.last_visit_time || 0) || 0;
    const bTime = Date.parse(b.last_visit_time || 0) || 0;
    return bTime - aTime;
  });
}

module.exports = {
  recordVisit,
  rows,
  find,
  forget,
  clear,
  overlay,
};
