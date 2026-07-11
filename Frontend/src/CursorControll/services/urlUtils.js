/**
 * Utilitários centralizados de URL para o CursorControll.
 */
(function () {
  const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

  function isAllowedUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return ALLOWED_PROTOCOLS.has(parsed.protocol);
    } catch {
      return false;
    }
  }

  function normalizeUrl(url) {
    const trimmed = (url || '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function looksLikeUrl(value) {
    const trimmed = (value || '').trim();
    return trimmed.includes('.') && !trimmed.includes(' ');
  }

  function resolveNavigationTarget(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;
    if (looksLikeUrl(trimmed)) {
      const normalized = normalizeUrl(trimmed);
      return isAllowedUrl(normalized) ? normalized : null;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  function buildGoogleSearchUrl(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return '';
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  function urlsMatch(a, b) {
    if (!a || !b) return false;
    try {
      const ua = new URL(normalizeUrl(a));
      const ub = new URL(normalizeUrl(b));
      return ua.href === ub.href;
    } catch {
      return a.trim() === b.trim();
    }
  }

  window.CursorUrlUtils = {
    isAllowedUrl,
    normalizeUrl,
    looksLikeUrl,
    resolveNavigationTarget,
    buildGoogleSearchUrl,
    urlsMatch,
  };
})();
