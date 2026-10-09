/**
 * Grupos de abas na lista da sessão.
 *
 * Criar, renomear e o snapshot das abas esperam o flush. Apagar o grupo
 * sai da lista na hora; o serviço grava o DELETE.
 */

const { randomId } = require('../Utils/crypto');
const { formatTabGroup, formatTabSnapshot } = require('../DTO/tabGroupsDTO');
const store = require('./sessionStore');

function present(group) {
  const tabs = (group.tabs || []).map(formatTabSnapshot);
  return formatTabGroup(group, tabs);
}

function list(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket || !bucket.opened) return null;
  return Array.from(bucket.groups.values())
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map(present);
}

function create(bucket, data) {
  const now = new Date().toISOString();
  const group = {
    id: data.id || randomId(),
    user_id: data.user_id,
    name: data.name,
    color: data.color,
    icon: data.icon,
    position: data.position || 0,
    created_at: now,
    updated_at: now,
    tabs: [],
    persisted: false,
    tabsDirty: false,
  };
  bucket.groups.set(group.id, group);
  bucket.pendingGroups.set(group.id, group);
  store.markDirty(bucket);
  return present(group);
}

function update(userId, id, data) {
  const bucket = store.getBucket(userId);
  if (!bucket || !bucket.opened) return null;
  const group = bucket.groups.get(id);
  if (!group) return null;

  if (data.name !== undefined) group.name = data.name;
  if (data.color !== undefined) group.color = data.color;
  if (data.icon !== undefined) group.icon = data.icon;
  if (data.position !== undefined) group.position = data.position;
  group.updated_at = new Date().toISOString();
  bucket.pendingGroups.set(id, group);
  store.markDirty(bucket);
  return present(group);
}

function replaceTabs(userId, groupId, tabs) {
  const bucket = store.getBucket(userId);
  if (!bucket || !bucket.opened) return null;
  const group = bucket.groups.get(groupId);
  if (!group) return null;

  const now = new Date().toISOString();
  group.tabs = tabs.map((tab, index) => ({
    id: tab.id || randomId(),
    group_id: groupId,
    user_id: userId,
    runtime_tab_id: tab.runtime_tab_id,
    url: tab.url,
    title: tab.title,
    favicon_url: tab.favicon_url,
    is_home: tab.is_home,
    active: tab.active,
    position: tab.position != null ? tab.position : index,
    created_at: now,
    updated_at: now,
  }));
  group.updated_at = now;
  group.tabsDirty = true;
  bucket.pendingGroups.set(groupId, group);
  store.markDirty(bucket);
  return present(group);
}

function forget(userId, id) {
  const bucket = store.getBucket(userId);
  if (!bucket) return null;
  const group = bucket.groups.get(id);
  if (!group) return null;
  bucket.groups.delete(id);
  bucket.pendingGroups.delete(id);
  return group;
}

function clear(userId) {
  const bucket = store.getBucket(userId);
  if (!bucket) return;
  bucket.groups.clear();
  bucket.pendingGroups.clear();
}

module.exports = {
  list,
  create,
  update,
  replaceTabs,
  forget,
  clear,
};
