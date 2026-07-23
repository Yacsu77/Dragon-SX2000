const ApiError = require('../Exceptions/ApiError');

const DEFAULT_GROUP_COLOR = '#7a8cff';
const DEFAULT_GROUP_ICON = 'folder';
const MAX_TABS_PER_GROUP = 80;

function requireUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new ApiError('user_id é obrigatório', 400);
  }
  return userId;
}

function normalizeColor(value) {
  const color = typeof value === 'string' ? value.trim() : '';
  if (!color) return DEFAULT_GROUP_COLOR;
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new ApiError('color deve estar no formato #RRGGBB', 400);
  }
  return color;
}

function normalizeIcon(value) {
  const icon = typeof value === 'string' ? value.trim() : '';
  return icon ? icon.slice(0, 48) : DEFAULT_GROUP_ICON;
}

function normalizeName(value, fallback = 'Grupo') {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return fallback;
  if (name.length > 48) {
    throw new ApiError('name deve ter no máximo 48 caracteres', 400);
  }
  return name;
}

function normalizePosition(value, fallback = 0) {
  const position = Number(value);
  if (!Number.isFinite(position)) return fallback;
  return Math.max(0, Math.floor(position));
}

function validateCreateGroup(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }

  return {
    id: typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null,
    user_id: requireUserId(data.user_id),
    name: normalizeName(data.name),
    color: normalizeColor(data.color),
    icon: normalizeIcon(data.icon),
    position: normalizePosition(data.position),
  };
}

function validateUpdateGroup(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }

  const out = {};
  if (data.name !== undefined) out.name = normalizeName(data.name);
  if (data.color !== undefined) out.color = normalizeColor(data.color);
  if (data.icon !== undefined) out.icon = normalizeIcon(data.icon);
  if (data.position !== undefined) out.position = normalizePosition(data.position);
  return out;
}

function validateTabSnapshot(entry, index) {
  if (!entry || typeof entry !== 'object') {
    throw new ApiError('Snapshot de aba inválido', 400);
  }

  const isHome = Boolean(entry.is_home || entry.isHomeTab);
  const url = typeof entry.url === 'string' ? entry.url.trim() : '';
  if (!isHome && !url) {
    throw new ApiError('url é obrigatória para abas do navegador', 400);
  }

  return {
    id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : null,
    runtime_tab_id:
      typeof entry.runtime_tab_id === 'string'
        ? entry.runtime_tab_id
        : typeof entry.tabId === 'string'
          ? entry.tabId
          : null,
    url: isHome ? null : url,
    title: typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim().slice(0, 256) : null,
    favicon_url:
      typeof entry.favicon_url === 'string'
        ? entry.favicon_url
        : typeof entry.faviconUrl === 'string'
          ? entry.faviconUrl
          : null,
    is_home: isHome ? 1 : 0,
    active: entry.active ? 1 : 0,
    position: normalizePosition(entry.position, index),
  };
}

function validateReplaceTabs(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError('Dados inválidos', 400);
  }

  const userId = requireUserId(data.user_id);
  const tabs = Array.isArray(data.tabs) ? data.tabs : [];
  if (tabs.length > MAX_TABS_PER_GROUP) {
    throw new ApiError(`Um grupo pode ter no máximo ${MAX_TABS_PER_GROUP} abas`, 400);
  }

  return {
    user_id: userId,
    tabs: tabs.map(validateTabSnapshot),
  };
}

function formatTabGroup(row, tabs = []) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    color: row.color,
    icon: row.icon || DEFAULT_GROUP_ICON,
    position: row.position || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tabs,
  };
}

function formatTabSnapshot(row) {
  if (!row) return null;
  return {
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id,
    runtime_tab_id: row.runtime_tab_id || null,
    url: row.url || null,
    title: row.title || null,
    favicon_url: row.favicon_url || null,
    is_home: Boolean(row.is_home),
    active: Boolean(row.active),
    position: row.position || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  requireUserId,
  validateCreateGroup,
  validateUpdateGroup,
  validateReplaceTabs,
  formatTabGroup,
  formatTabSnapshot,
};
