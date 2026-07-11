/**
 * Ações de clipboard do CursorControll.
 */
(function () {
  async function copyText(text) {
    const value = (text || '').trim();
    if (!value) return { ok: false, error: 'empty' };

    try {
      await navigator.clipboard.writeText(value);
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao copiar texto', err);
      return { ok: false, error: 'clipboard-unavailable' };
    }
  }

  async function readText() {
    try {
      const text = await navigator.clipboard.readText();
      return { ok: true, text: text || '' };
    } catch (err) {
      window.CursorLogger?.error('Falha ao ler clipboard', err);
      return { ok: false, error: 'clipboard-unavailable', text: '' };
    }
  }

  async function copyFromWebview(webview) {
    if (!webview || typeof webview.copy !== 'function') {
      return { ok: false, error: 'no-webview' };
    }
    try {
      webview.copy();
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao copiar do webview', err);
      return { ok: false, error: 'webview-copy-failed' };
    }
  }

  async function cutFromWebview(webview) {
    if (!webview || typeof webview.cut !== 'function') {
      return { ok: false, error: 'no-webview' };
    }
    try {
      webview.cut();
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao cortar do webview', err);
      return { ok: false, error: 'webview-cut-failed' };
    }
  }

  async function pasteIntoWebview(webview) {
    if (!webview || typeof webview.paste !== 'function') {
      return { ok: false, error: 'no-webview' };
    }
    try {
      webview.paste();
      return { ok: true };
    } catch (err) {
      window.CursorLogger?.error('Falha ao colar no webview', err);
      return { ok: false, error: 'webview-paste-failed' };
    }
  }

  window.CursorClipboardActions = {
    copyText,
    readText,
    copyFromWebview,
    cutFromWebview,
    pasteIntoWebview,
  };
})();
