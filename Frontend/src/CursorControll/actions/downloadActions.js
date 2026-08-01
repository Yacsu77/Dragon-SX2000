/**
 * Ações de download (imagens e URLs) do CursorControll.
 */
(function () {
  function guessNameFromUrl(url) {
    try {
      const pathname = new URL(url).pathname || '';
      const base = pathname.split('/').filter(Boolean).pop() || '';
      if (base && /\.[a-z0-9]{2,5}$/i.test(base)) return decodeURIComponent(base);
    } catch (_) {
      /* ignore */
    }
    return `image-${Date.now()}.png`;
  }

  function findWebview(context) {
    if (context?.webview) return context.webview;
    if (context?.tabId) {
      return document.querySelector(`webview[data-id="${context.tabId}"]`);
    }
    return document.querySelector('#browser webview.active');
  }

  /**
   * @param {{ url: string, mode: 'downloads'|'save-as', context?: object, position?: {x:number,y:number} }} opts
   */
  async function downloadImage(opts) {
    const url = String(opts?.url || '').trim();
    if (!url) return { ok: false, error: 'no-url' };

    const mode = opts.mode === 'save-as' ? 'save-as' : 'downloads';
    const suggestedName = guessNameFromUrl(url);
    const position = opts.position || opts.context?.position || null;

    if (!window.DragonDownloads?.prepare) {
      return { ok: false, error: 'ipc-unavailable' };
    }

    const prepared = await window.DragonDownloads.prepare({
      url,
      mode,
      suggestedName,
    });
    if (!prepared?.ok) {
      return prepared?.canceled
        ? { ok: false, canceled: true }
        : { ok: false, error: prepared?.error || 'prepare-failed' };
    }

    const webview = findWebview(opts.context);
    try {
      if (webview && typeof webview.downloadURL === 'function') {
        webview.downloadURL(url);
      } else {
        // Fallback: navega com download via link temporário no host (raro).
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      window.CursorLogger?.error('Falha ao iniciar download', err);
      return { ok: false, error: 'download-failed' };
    }

    window.TopDownloads?.playFlyAnimation?.(position, url);
    return { ok: true };
  }

  window.CursorDownloadActions = {
    downloadImage,
    guessNameFromUrl,
  };
})();
