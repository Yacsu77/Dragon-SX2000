const { run, get, all } = require('../DB/sqlite');
const { randomId } = require('../Utils/crypto');
const {
  formatTabGroup,
  formatTabSnapshot,
} = require('../DTO/tabGroupsDTO');
const ApiError = require('../Exceptions/ApiError');
const sessionService = require('./sessionService');

async function listTabsForGroup(groupId, userId) {
  const rows = await all(
    `SELECT * FROM tab_group_tabs
     WHERE group_id = ? AND user_id = ?
     ORDER BY position ASC, created_at ASC`,
    [groupId, userId]
  );
  return rows.map(formatTabSnapshot);
}

async function hydrateGroup(row) {
  const tabs = await listTabsForGroup(row.id, row.user_id);
  return formatTabGroup(row, tabs);
}

async function ensureGroupForUser(groupId, userId) {
  const row = await get('SELECT * FROM tab_groups WHERE id = ? AND user_id = ?', [groupId, userId]);
  if (!row) throw new ApiError('Grupo de abas não encontrado', 404);
  return row;
}

async function listGroups(userId) {
  const cached = sessionService.listGroups(userId);
  if (cached) return cached;

  const rows = await all(
    `SELECT * FROM tab_groups
     WHERE user_id = ?
     ORDER BY position ASC, created_at ASC`,
    [userId]
  );
  const groups = [];
  for (const row of rows) {
    groups.push(await hydrateGroup(row));
  }
  return groups;
}

async function createGroup(data) {
  return sessionService.createGroup(data);
}

async function updateGroup(id, userId, data) {
  const cached = sessionService.updateGroup(userId, id, data);
  if (cached) return cached;

  const row = await ensureGroupForUser(id, userId);
  const next = {
    name: data.name !== undefined ? data.name : row.name,
    color: data.color !== undefined ? data.color : row.color,
    icon: data.icon !== undefined ? data.icon : row.icon,
    position: data.position !== undefined ? data.position : row.position,
  };
  const now = new Date().toISOString();

  await run(
    `UPDATE tab_groups
     SET name = ?, color = ?, icon = ?, position = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [next.name, next.color, next.icon, next.position, now, id, userId]
  );

  return hydrateGroup(await ensureGroupForUser(id, userId));
}

async function deleteGroup(id, userId) {
  const cached = sessionService.forgetGroup(userId, id);
  if (cached && !cached.persisted) return { id, deleted: true };

  if (!cached) await ensureGroupForUser(id, userId);
  await run('DELETE FROM tab_group_tabs WHERE group_id = ? AND user_id = ?', [id, userId]);
  await run('DELETE FROM tab_groups WHERE id = ? AND user_id = ?', [id, userId]);
  return { id, deleted: true };
}

async function replaceGroupTabs(groupId, userId, tabs) {
  const cached = sessionService.replaceGroupTabs(userId, groupId, tabs);
  if (cached) return cached;

  await ensureGroupForUser(groupId, userId);
  const now = new Date().toISOString();

  await run('BEGIN TRANSACTION');
  try {
    await run('DELETE FROM tab_group_tabs WHERE group_id = ? AND user_id = ?', [groupId, userId]);

    for (const tab of tabs) {
      await run(
        `INSERT INTO tab_group_tabs
         (id, group_id, user_id, runtime_tab_id, url, title, favicon_url, is_home, active, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tab.id || randomId(),
          groupId,
          userId,
          tab.runtime_tab_id,
          tab.url,
          tab.title,
          tab.favicon_url,
          tab.is_home,
          tab.active,
          tab.position,
          now,
          now,
        ]
      );
    }

    await run('UPDATE tab_groups SET updated_at = ? WHERE id = ? AND user_id = ?', [now, groupId, userId]);
    await run('COMMIT');
  } catch (err) {
    await run('ROLLBACK').catch(() => {});
    throw err;
  }

  return hydrateGroup(await ensureGroupForUser(groupId, userId));
}

async function deleteUserGroups(userId) {
  await run('DELETE FROM tab_group_tabs WHERE user_id = ?', [userId]);
  const result = await run('DELETE FROM tab_groups WHERE user_id = ?', [userId]);
  return { deleted: result.changes };
}

module.exports = {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  replaceGroupTabs,
  deleteUserGroups,
};
