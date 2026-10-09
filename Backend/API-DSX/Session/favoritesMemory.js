/**
 * Favoritos na lista da sessão.
 *
 * Criar só entra na memória. Apagar grava no banco na hora, no serviço,
 * e aqui tira o item da lista para ele não voltar no flush.
 */

const { randomId } = require('../Utils/crypto');
const { formatFavorite } = require('../DTO/favoritesDTO');
const store = require('./sessionStore');

function list(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket || !bucket.opened) return null;
  return Array.from(bucket.favorites.values())
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(formatFavorite);
}

function create(bucket, data) {
  const existing = Array.from(bucket.favorites.values()).find((row) => row.url === data.url);
  if (existing) return formatFavorite(existing);

  const row = {
    id: data.id || randomId(),
    user_id: data.user_id,
    title: data.title,
    url: data.url,
    created_at: new Date().toISOString(),
    persisted: false,
  };
  bucket.favorites.set(row.id, row);
  bucket.pendingFavorites.set(row.id, row);
  store.markDirty(bucket);
  return formatFavorite(row);
}

function forget(userId, id) {
  const bucket = store.getBucket(userId);
  if (!bucket) return null;
  const row = bucket.favorites.get(id);
  if (!row) return null;
  bucket.favorites.delete(id);
  bucket.pendingFavorites.delete(id);
  return row;
}

function forgetByUrl(userId, url) {
  const bucket = store.getBucket(userId);
  if (!bucket) return 0;
  let removed = 0;
  bucket.favorites.forEach((row) => {
    if (row.url !== url) return;
    bucket.favorites.delete(row.id);
    bucket.pendingFavorites.delete(row.id);
    removed += 1;
  });
  return removed;
}

function clear(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket) return;
  bucket.favorites.clear();
  bucket.pendingFavorites.clear();
}

module.exports = {
  list,
  create,
  forget,
  forgetByUrl,
  clear,
};
