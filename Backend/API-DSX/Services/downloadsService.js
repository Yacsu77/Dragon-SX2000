const { run, get, all } = require('../DB/sqlite');
const { randomId } = require('../Utils/crypto');
const { formatDownload } = require('../DTO/downloadsDTO');
const ApiError = require('../Exceptions/ApiError');

async function listDownloads(userId) {
  const rows = await all(
    'SELECT * FROM downloads WHERE user_id = ? ORDER BY started_at DESC',
    [userId]
  );
  return rows.map(formatDownload);
}

async function createDownload(data) {
  const id = data.id || randomId();
  await run(
    `INSERT INTO downloads
     (id, user_id, url, filename, mime, size, state, save_path, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.user_id,
      data.url,
      data.filename,
      data.mime,
      data.size,
      data.state,
      data.save_path,
      data.started_at,
      data.finished_at,
    ]
  );
  return formatDownload(await get('SELECT * FROM downloads WHERE id = ?', [id]));
}

async function updateDownload(id, data) {
  const row = await get('SELECT * FROM downloads WHERE id = ?', [id]);
  if (!row) throw new ApiError('Download não encontrado', 404);

  const next = {
    filename: data.filename !== undefined ? data.filename : row.filename,
    mime: data.mime !== undefined ? data.mime : row.mime,
    size: data.size !== undefined ? data.size : row.size,
    state: data.state !== undefined ? data.state : row.state,
    save_path: data.save_path !== undefined ? data.save_path : row.save_path,
    finished_at: data.finished_at !== undefined ? data.finished_at : row.finished_at,
  };

  await run(
    `UPDATE downloads
     SET filename = ?, mime = ?, size = ?, state = ?, save_path = ?, finished_at = ?
     WHERE id = ?`,
    [next.filename, next.mime, next.size, next.state, next.save_path, next.finished_at, id]
  );

  return formatDownload(await get('SELECT * FROM downloads WHERE id = ?', [id]));
}

async function deleteDownload(id, userId) {
  const row = await get('SELECT * FROM downloads WHERE id = ?', [id]);
  if (!row) throw new ApiError('Download não encontrado', 404);
  if (userId && row.user_id !== userId) {
    throw new ApiError('Download não pertence ao usuário', 403);
  }
  await run('DELETE FROM downloads WHERE id = ?', [id]);
  return { id, deleted: true };
}

async function clearDownloads(userId) {
  const result = await run('DELETE FROM downloads WHERE user_id = ?', [userId]);
  return { deleted: result.changes };
}

module.exports = {
  listDownloads,
  createDownload,
  updateDownload,
  deleteDownload,
  clearDownloads,
};
