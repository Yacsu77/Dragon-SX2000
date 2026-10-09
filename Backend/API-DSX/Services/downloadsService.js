const { run, get, all } = require('../DB/sqlite');
const { formatDownload } = require('../DTO/downloadsDTO');
const ApiError = require('../Exceptions/ApiError');
const sessionService = require('./sessionService');

async function listDownloads(userId) {
  const cached = sessionService.listDownloads(userId);
  if (cached) return cached;
  const rows = await all(
    'SELECT * FROM downloads WHERE user_id = ? ORDER BY started_at DESC',
    [userId]
  );
  return rows.map(formatDownload);
}

async function createDownload(data) {
  return sessionService.createDownload(data);
}

async function updateDownload(id, data) {
  const cached = sessionService.updateDownload(data.user_id, id, data);
  if (cached) return cached;

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
  const cached = sessionService.forgetDownload(userId, id);
  if (cached && !cached.persisted) return { id, deleted: true };

  const row = cached || (await get('SELECT * FROM downloads WHERE id = ?', [id]));
  if (!row) throw new ApiError('Download não encontrado', 404);
  if (userId && row.user_id !== userId) {
    throw new ApiError('Download não pertence ao usuário', 403);
  }
  await run('DELETE FROM downloads WHERE id = ?', [id]);
  sessionService.forgetDownload(userId || row.user_id, id);
  return { id, deleted: true };
}

async function clearDownloads(userId) {
  const result = await run('DELETE FROM downloads WHERE user_id = ?', [userId]);
  sessionService.clearDownloads(userId);
  return { deleted: result.changes };
}

module.exports = {
  listDownloads,
  createDownload,
  updateDownload,
  deleteDownload,
  clearDownloads,
};
