/**
 * Detecção centralizada de contexto do clique.
 *
 * Prioridade:
 * 1. Campo editável
 * 2. Texto selecionado
 * 3. Link
 * 4. Aba
 * 5. Página comum
 * 6. Desconhecido
 */
(function () {
  const urlUtils = () => window.CursorUrlUtils;
  const favorites = () => window.Favoritos;

  function getWebviewState(webview) {
    let currentUrl = '';
    let canGoBack = false;
    let canGoForward = false;
    let isMuted = false;

    if (!webview) {
      return { currentUrl, canGoBack, canGoForward, isMuted };
    }

    try {
      currentUrl = webview.getURL() || '';
      canGoBack = webview.canGoBack();
      canGoForward = webview.canGoForward();
      isMuted = typeof webview.isAudioMuted === 'function' ? webview.isAudioMuted() : false;
    } catch (err) {
      window.CursorLogger?.warn('Falha ao ler estado do webview', err);
    }

    return { currentUrl, canGoBack, canGoForward, isMuted };
  }

  function isFavoriteUrl(url) {
    if (!url || !favorites() || typeof favorites().isFavorite !== 'function') return false;
    return favorites().isFavorite(url);
  }

  /**
   * @param {import('../types/cursorControll.types').CursorContext} partial
   * @returns {import('../types/cursorControll.types').CursorContextType}
   */
  function resolveContextType(partial) {
    if (partial.isEditable && !partial.isReadOnly && !partial.isDisabled) return 'text-input';
    if (partial.selectedText && partial.selectedText.trim()) return 'selected-text';
    if (partial.linkUrl) return 'link';
    if (partial.tabId) return 'tab';
    if (partial.currentUrl || partial.webview) return 'page';
    return 'unknown';
  }

  /**
   * Contexto a partir do evento context-menu do webview.
   * @param {Electron.ContextMenuParams} params
   * @param {Electron.WebviewTag} webview
   * @param {{ x: number, y: number }} screenPosition
   */
  function fromWebviewContextMenu(params, webview, screenPosition) {
    const tabId = webview?.dataset?.id || '';
    const state = getWebviewState(webview);
    const selectionText = (params.selectionText || '').trim();
    const linkUrl = params.linkURL || '';
    const isEditable = Boolean(params.isEditable);
    const editFlags = params.editFlags || 0;
    const isReadOnly = Boolean(editFlags & 2);
    const isDisabled = Boolean(editFlags & 1);

    const partial = {
      type: 'unknown',
      position: screenPosition,
      selectedText: selectionText || undefined,
      linkUrl: linkUrl || undefined,
      linkText: params.linkText || undefined,
      currentUrl: state.currentUrl || undefined,
      tabId: tabId || undefined,
      isEditable,
      isReadOnly,
      isDisabled,
      canGoBack: state.canGoBack,
      canGoForward: state.canGoForward,
      isMuted: state.isMuted,
      isFavorite: isFavoriteUrl(state.currentUrl),
      webview,
    };

    partial.type = resolveContextType(partial);
    return partial;
  }

  /**
   * Contexto de clique na barra de abas.
   */
  function fromTabElement(tabElement, screenPosition) {
    const tabId = tabElement?.dataset?.id || '';
    const titleEl = tabElement?.querySelector('.tab-title');
    const tabTitle = titleEl?.textContent?.trim() || '';
    const isHomeTab = tabId.startsWith('home-tab');
    const webview = isHomeTab ? null : document.querySelector(`webview[data-id="${tabId}"]`);
    const state = getWebviewState(webview);

    return {
      type: 'tab',
      position: screenPosition,
      tabId,
      tabTitle,
      currentUrl: state.currentUrl || undefined,
      canGoBack: state.canGoBack,
      isMuted: state.isMuted,
      isFavorite: isFavoriteUrl(state.currentUrl),
      webview: webview || undefined,
      targetElement: tabElement,
    };
  }

  window.CursorContextDetection = {
    resolveContextType,
    fromWebviewContextMenu,
    fromTabElement,
    getWebviewState,
  };
})();
