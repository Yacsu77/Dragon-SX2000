/**
 * Fachada da sessão do perfil.
 *
 * Os outros serviços pedem a lista daqui. Quem grava na hora (senha,
 * login, DELETE) não passa por este módulo, exceto para tirar o item
 * da memória depois que o banco já confirmou.
 */

const store = require('../Session/sessionStore');
const hydrate = require('../Session/sessionHydrate');
const historyMemory = require('../Session/historyMemory');
const favoritesMemory = require('../Session/favoritesMemory');
const downloadsMemory = require('../Session/downloadsMemory');
const groupsMemory = require('../Session/groupsMemory');
const sessionFlush = require('../Session/sessionFlush');

async function open(userId) {
  if (!userId) return null;
  return hydrate.open(userId);
}

async function ensure(userId) {
  return open(userId);
}

function historyRows(userId) {
  return historyMemory.rows(userId);
}

function overlayHistory(userId, dbRows) {
  return historyMemory.overlay(userId, dbRows);
}

function findHistory(id) {
  return historyMemory.find(id);
}

function forgetHistory(id) {
  return historyMemory.forget(id);
}

function clearHistory(userId) {
  historyMemory.clear(userId);
}

async function recordVisit(userId, data) {
  const bucket = await ensure(userId);
  return historyMemory.recordVisit(bucket, data);
}

function listFavorites(userId) {
  return favoritesMemory.list(userId);
}

async function createFavorite(data) {
  const bucket = await ensure(data.user_id);
  return favoritesMemory.create(bucket, data);
}

function forgetFavorite(userId, id) {
  return favoritesMemory.forget(userId, id);
}

function forgetFavoriteByUrl(userId, url) {
  return favoritesMemory.forgetByUrl(userId, url);
}

function clearFavorites(userId) {
  favoritesMemory.clear(userId);
}

function listDownloads(userId) {
  return downloadsMemory.list(userId);
}

async function createDownload(data) {
  const bucket = await ensure(data.user_id);
  return downloadsMemory.create(bucket, data);
}

function updateDownload(userId, id, data) {
  return downloadsMemory.update(userId, id, data);
}

function forgetDownload(userId, id) {
  return downloadsMemory.forget(userId, id);
}

function clearDownloads(userId) {
  downloadsMemory.clear(userId);
}

function listGroups(userId) {
  return groupsMemory.list(userId);
}

async function createGroup(data) {
  const bucket = await ensure(data.user_id);
  return groupsMemory.create(bucket, data);
}

function updateGroup(userId, id, data) {
  return groupsMemory.update(userId, id, data);
}

function replaceGroupTabs(userId, groupId, tabs) {
  return groupsMemory.replaceTabs(userId, groupId, tabs);
}

function forgetGroup(userId, id) {
  return groupsMemory.forget(userId, id);
}

function clearGroups(userId) {
  groupsMemory.clear(userId);
}

function rememberTouch(userId) {
  store.rememberTouch(userId);
}

function drop(userId) {
  historyMemory.clear(userId);
  favoritesMemory.clear(userId);
  downloadsMemory.clear(userId);
  groupsMemory.clear(userId);
  store.drop(userId);
}

function flush() {
  return sessionFlush.flush();
}

function exclusive(fn) {
  return sessionFlush.exclusive(fn);
}

module.exports = {
  open,
  ensure,
  historyRows,
  overlayHistory,
  findHistory,
  forgetHistory,
  clearHistory,
  recordVisit,
  listFavorites,
  createFavorite,
  forgetFavorite,
  forgetFavoriteByUrl,
  clearFavorites,
  listDownloads,
  createDownload,
  updateDownload,
  forgetDownload,
  clearDownloads,
  listGroups,
  createGroup,
  updateGroup,
  replaceGroupTabs,
  forgetGroup,
  clearGroups,
  rememberTouch,
  drop,
  flush,
  exclusive,
};
