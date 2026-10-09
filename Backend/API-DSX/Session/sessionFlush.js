/**
 * Grava o diário numa transação só.
 *
 * Se a lista não mudou, não toca no disco. Falha devolve o diário para
 * a memória para o próximo timer tentar de novo.
 */

const { run } = require('../DB/sqlite');
const store = require('./sessionStore');

let chain = Promise.resolve();

function exclusive(fn) {
  const runNext = chain.then(fn, fn);
  chain = runNext.then(
    () => {},
    () => {}
  );
  return runNext;
}

async function writeHistory(row) {
  await run(
    `INSERT INTO browser_history
      (id, url, title, visit_count, typed_count, last_visit_time, created_at,
       favicon_url, transition_type, referrer_url, profile_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       url = excluded.url,
       title = excluded.title,
       visit_count = excluded.visit_count,
       typed_count = excluded.typed_count,
       last_visit_time = excluded.last_visit_time,
       favicon_url = excluded.favicon_url,
       transition_type = excluded.transition_type,
       referrer_url = excluded.referrer_url,
       profile_id = excluded.profile_id,
       user_id = excluded.user_id`,
    [
      row.id,
      row.url,
      row.title,
      row.visit_count,
      row.typed_count,
      row.last_visit_time,
      row.created_at,
      row.favicon_url,
      row.transition_type,
      row.referrer_url,
      row.profile_id,
      row.user_id,
    ]
  );
}

async function writeFavorite(row) {
  await run(
    `INSERT INTO favorites (id, user_id, title, url, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
    [row.id, row.user_id, row.title, row.url, row.created_at]
  );
}

async function writeDownload(row) {
  await run(
    `INSERT INTO downloads
      (id, user_id, url, filename, mime, size, state, save_path, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       filename = excluded.filename,
       mime = excluded.mime,
       size = excluded.size,
       state = excluded.state,
       save_path = excluded.save_path,
       finished_at = excluded.finished_at`,
    [
      row.id,
      row.user_id,
      row.url,
      row.filename,
      row.mime,
      row.size,
      row.state,
      row.save_path,
      row.started_at,
      row.finished_at,
    ]
  );
}

async function writeGroup(group) {
  if (!group.persisted) {
    await run(
      `INSERT INTO tab_groups
        (id, user_id, name, color, icon, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         color = excluded.color,
         icon = excluded.icon,
         position = excluded.position,
         updated_at = excluded.updated_at`,
      [
        group.id,
        group.user_id,
        group.name,
        group.color,
        group.icon,
        group.position,
        group.created_at,
        group.updated_at,
      ]
    );
  } else {
    await run(
      `UPDATE tab_groups
       SET name = ?, color = ?, icon = ?, position = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [
        group.name,
        group.color,
        group.icon,
        group.position,
        group.updated_at,
        group.id,
        group.user_id,
      ]
    );
  }

  if (!group.tabsDirty) return;

  await run('DELETE FROM tab_group_tabs WHERE group_id = ? AND user_id = ?', [
    group.id,
    group.user_id,
  ]);
  for (const tab of group.tabs || []) {
    await run(
      `INSERT INTO tab_group_tabs
        (id, group_id, user_id, runtime_tab_id, url, title, favicon_url,
         is_home, active, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tab.id,
        group.id,
        group.user_id,
        tab.runtime_tab_id,
        tab.url,
        tab.title,
        tab.favicon_url,
        tab.is_home ? 1 : 0,
        tab.active ? 1 : 0,
        tab.position || 0,
        tab.created_at,
        tab.updated_at,
      ]
    );
  }
  group.tabsDirty = false;
}

async function writeSnapshot(snapshot) {
  for (const part of snapshot.users) {
    for (const row of part.history.values()) {
      await writeHistory(row);
    }
    for (const row of part.favorites.values()) {
      await writeFavorite(row);
    }
    for (const row of part.downloads.values()) {
      await writeDownload(row);
    }
    for (const group of part.groups.values()) {
      await writeGroup(group);
    }
  }

  for (const [userId, at] of snapshot.touches) {
    await run('UPDATE users SET last_active_at = ?, updated_at = ? WHERE id = ?', [
      at,
      at,
      userId,
    ]);
  }
}

async function flushNow() {
  if (!store.hasWork()) return { flushed: false };

  const snapshot = store.takePending();
  try {
    await run('BEGIN IMMEDIATE');
    await writeSnapshot(snapshot);
    await run('COMMIT');
    store.markPersisted(snapshot);
    return { flushed: true };
  } catch (err) {
    await run('ROLLBACK').catch(() => {});
    store.restorePending(snapshot);
    throw err;
  }
}

function flush() {
  return exclusive(flushNow);
}

module.exports = {
  exclusive,
  flush,
};
