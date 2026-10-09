/**
 * Abre a lista do perfil a partir do SQLite, uma vez.
 *
 * Histórico entra em recorte (recentes + mais visitados). Favoritos,
 * downloads e grupos cabem inteiros: são poucos e a tela precisa deles.
 */

const { get, all } = require('../DB/sqlite');
const { HISTORY_RECENT, HISTORY_TOP } = require('./constants');
const store = require('./sessionStore');

let nextHistoryId = 0;

async function reserveHistoryId() {
  if (!nextHistoryId) {
    const row = await get('SELECT COALESCE(MAX(id), 0) AS maxId FROM browser_history');
    nextHistoryId = Number(row && row.maxId) || 0;
  }
  nextHistoryId += 1;
  return nextHistoryId;
}

function putHistory(bucket, row) {
  const copy = { ...row, persisted: true };
  bucket.historyById.set(copy.id, copy);
  if (copy.url) bucket.historyByUrl.set(copy.url, copy);
}

async function loadHistory(bucket, userId) {
  const recent = await all(
    `SELECT * FROM browser_history
     WHERE user_id = ? OR (user_id IS NULL AND profile_id = ?)
     ORDER BY last_visit_time DESC
     LIMIT ?`,
    [userId, userId, HISTORY_RECENT]
  );
  const top = await all(
    `SELECT * FROM browser_history
     WHERE user_id = ? OR (user_id IS NULL AND profile_id = ?)
     ORDER BY visit_count DESC
     LIMIT ?`,
    [userId, userId, HISTORY_TOP]
  );
  recent.forEach((row) => putHistory(bucket, row));
  top.forEach((row) => putHistory(bucket, row));
}

async function loadFavorites(bucket, userId) {
  const rows = await all(
    'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  rows.forEach((row) => {
    bucket.favorites.set(row.id, { ...row, persisted: true });
  });
}

async function loadDownloads(bucket, userId) {
  const rows = await all(
    'SELECT * FROM downloads WHERE user_id = ? ORDER BY started_at DESC',
    [userId]
  );
  rows.forEach((row) => {
    bucket.downloads.set(row.id, { ...row, persisted: true });
  });
}

async function loadGroups(bucket, userId) {
  const groups = await all(
    `SELECT * FROM tab_groups
     WHERE user_id = ?
     ORDER BY position ASC, created_at ASC`,
    [userId]
  );
  const tabs = await all(
    `SELECT * FROM tab_group_tabs
     WHERE user_id = ?
     ORDER BY position ASC, created_at ASC`,
    [userId]
  );
  const byGroup = new Map();
  tabs.forEach((tab) => {
    if (!byGroup.has(tab.group_id)) byGroup.set(tab.group_id, []);
    byGroup.get(tab.group_id).push(tab);
  });
  groups.forEach((group) => {
    bucket.groups.set(group.id, {
      ...group,
      tabs: byGroup.get(group.id) || [],
      persisted: true,
    });
  });
}

async function open(userId) {
  const bucket = store.ensureBucket(userId);
  if (bucket.opened) return bucket;

  await loadHistory(bucket, userId);
  await loadFavorites(bucket, userId);
  await loadDownloads(bucket, userId);
  await loadGroups(bucket, userId);
  bucket.opened = true;
  return bucket;
}

module.exports = {
  open,
  reserveHistoryId,
};
