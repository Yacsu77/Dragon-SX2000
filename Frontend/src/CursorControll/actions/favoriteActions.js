/**
 * Ações de favoritos do CursorControll.
 */
(function () {
  function getFavoritos() {
    return window.Favoritos;
  }

  function isFavorite(url) {
    const fav = getFavoritos();
    if (!fav || typeof fav.isFavorite !== 'function' || !url) return false;
    return fav.isFavorite(url);
  }

  async function toggleFavorite(title, url) {
    const fav = getFavoritos();
    if (!fav || !url) return { ok: false, error: 'invalid' };

    try {
      if (typeof fav.toggle === 'function') {
        const result = fav.toggle(title, url);
        return { ok: true, isFavorite: result.isFavorite };
      }

      if (isFavorite(url) && typeof fav.removeByUrl === 'function') {
        fav.removeByUrl(url);
        return { ok: true, isFavorite: false };
      }

      if (typeof fav.add === 'function') {
        fav.add(title || url, url);
        return { ok: true, isFavorite: true };
      }

      return { ok: false, error: 'api-unavailable' };
    } catch (err) {
      window.CursorLogger?.error('Falha ao alternar favorito', err);
      return { ok: false, error: 'favorite-failed' };
    }
  }

  window.CursorFavoriteActions = {
    isFavorite,
    toggleFavorite,
  };
})();
