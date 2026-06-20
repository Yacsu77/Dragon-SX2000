const ApiError = require('../Exceptions/ApiError');

function validateCreateHistory(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }

  const { url, title, favicon_url, transition_type, referrer_url, profile_id, typed_count } = data;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new ApiError('O campo url é obrigatório', 400);
  }

  return {
    url: url.trim(),
    title: title || null,
    favicon_url: favicon_url || null,
    transition_type: transition_type || 'link',
    referrer_url: referrer_url || null,
    profile_id: profile_id || null,
    typed_count: typeof typed_count === 'number' ? typed_count : 0,
  };
}

function formatHistoryResponse(row) {
  if (!row) return null;

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    visit_count: row.visit_count,
    typed_count: row.typed_count,
    last_visit_time: row.last_visit_time,
    created_at: row.created_at,
    favicon_url: row.favicon_url,
    transition_type: row.transition_type,
    referrer_url: row.referrer_url,
    profile_id: row.profile_id,
  };
}

module.exports = {
  validateCreateHistory,
  formatHistoryResponse,
};
