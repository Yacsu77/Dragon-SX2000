/**
 * Picture in Picture — controle estilo Safari para vídeos da webview.
 *
 * O PiP nativo pertence ao Chromium/SO; a moldura não aceita CSS do app.
 * O menu do Top fornece o layout moderno e integra a mídia ao Dragon Media.
 */
(function () {
  if (window.PictureInPictureControl) return;

  const TEMPLATE_PATH = 'Top/PictureInPicture/PictureInPicture.html';
  const REFRESH_MS = 750;

  let initialized = false;
  let button = null;
  let control = null;
  let menu = null;
  let actionButton = null;
  let actionLabel = null;
  let sourceLabel = null;
  let mediaTitle = null;
  let mediaArtist = null;
  let coverImage = null;
  let coverFallback = null;
  let positionLabel = null;
  let durationLabel = null;
  let progressFill = null;
  let playIcon = null;
  let pauseIcon = null;
  let message = null;
  let refreshTimer = null;
  let refreshToken = 0;
  let isOpen = false;
  let ownerWebview = null;
  let ownerTabId = null;
  let unregisterMediaSource = null;
  let lastPublishedKey = '';
  let unbindPerfIdle = null;

  let state = emptyState();

  function emptyState() {
    return {
      available: false,
      active: false,
      supported: true,
      title: '',
      artist: '',
      album: '',
      cover: '',
      app: '',
      url: '',
      paused: true,
      position: 0,
      duration: 0,
    };
  }

  /** Poll só com menu aberto ou PiP nativo ativo — não a cada 750ms no idle. */
  function wantsPoll() {
    if (document.hidden) return false;
    return Boolean(isOpen || state.active);
  }

  function stopPoll() {
    if (!refreshTimer) return;
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function startPoll() {
    if (refreshTimer || !wantsPoll()) return;
    refreshTimer = setInterval(() => {
      if (!wantsPoll()) {
        stopPoll();
        return;
      }
      refresh();
    }, REFRESH_MS);
  }

  function syncPoll() {
    if (wantsPoll()) startPoll();
    else stopPoll();
  }

  function scheduleRefresh() {
    setTimeout(refresh, 60);
  }

  const INSPECT_SCRIPT = `
    (() => {
      const collectVideos = (root, output) => {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('video').forEach((video) => output.push(video));
        root.querySelectorAll('*').forEach((node) => {
          if (node.shadowRoot) collectVideos(node.shadowRoot, output);
        });
      };
      const videos = [];
      collectVideos(document, videos);
      const pipVideo = document.pictureInPictureElement;
      const playing = videos
        .filter((video) =>
          !video.paused &&
          !video.ended &&
          video.readyState >= 2
        )
        .sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return (br.width * br.height) - (ar.width * ar.height);
        })[0] || null;
      const target = pipVideo || playing;
      const metadata = navigator.mediaSession && navigator.mediaSession.metadata;
      const artwork = metadata && Array.isArray(metadata.artwork)
        ? metadata.artwork[metadata.artwork.length - 1]
        : null;
      let app = '';
      try { app = location.hostname.replace(/^www\\./, ''); } catch (_) {}

      return {
        available: Boolean(target),
        active: Boolean(pipVideo),
        supported: Boolean(
          document.pictureInPictureEnabled &&
          target &&
          typeof target.requestPictureInPicture === 'function'
        ),
        title: (metadata && metadata.title) || document.title || 'Vídeo da aba atual',
        artist: (metadata && metadata.artist) || '',
        album: (metadata && metadata.album) || '',
        cover: (artwork && artwork.src) || '',
        app,
        url: location.href,
        paused: target ? Boolean(target.paused) : true,
        position: target && Number.isFinite(target.currentTime) ? target.currentTime : 0,
        duration: target && Number.isFinite(target.duration) ? target.duration : 0
      };
    })()
  `;

  const OPEN_SCRIPT = `
    (async () => {
      const collectVideos = (root, output) => {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('video').forEach((video) => output.push(video));
        root.querySelectorAll('*').forEach((node) => {
          if (node.shadowRoot) collectVideos(node.shadowRoot, output);
        });
      };
      if (document.pictureInPictureElement) {
        return { ok: true, active: true };
      }
      if (!document.pictureInPictureEnabled) {
        return { ok: false, error: 'unsupported' };
      }
      const videos = [];
      collectVideos(document, videos);
      const video = videos
        .filter((item) => !item.paused && !item.ended && item.readyState >= 2)
        .sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return (br.width * br.height) - (ar.width * ar.height);
        })[0];
      if (!video || typeof video.requestPictureInPicture !== 'function') {
        return { ok: false, error: 'no-video' };
      }
      video.disablePictureInPicture = false;

      // Fallback para sites sem Media Session própria. Isso permite ao
      // Chromium/SO e ao Dragon Media SDK identificarem e controlarem o vídeo.
      if (navigator.mediaSession && !navigator.mediaSession.metadata) {
        try {
          const icon = document.querySelector('link[rel~="icon"]');
          navigator.mediaSession.metadata = new MediaMetadata({
            title: document.title || 'Vídeo em Picture in Picture',
            artist: location.hostname.replace(/^www\\./, ''),
            artwork: icon && icon.href ? [{ src: icon.href }] : []
          });
          navigator.mediaSession.setActionHandler('play', () => video.play());
          navigator.mediaSession.setActionHandler('pause', () => video.pause());
          navigator.mediaSession.setActionHandler('seekbackward', (detail) => {
            video.currentTime = Math.max(0, video.currentTime - (detail.seekOffset || 10));
          });
          navigator.mediaSession.setActionHandler('seekforward', (detail) => {
            const end = Number.isFinite(video.duration) ? video.duration : video.currentTime + 10;
            video.currentTime = Math.min(end, video.currentTime + (detail.seekOffset || 10));
          });
          navigator.mediaSession.setActionHandler('seekto', (detail) => {
            if (Number.isFinite(detail.seekTime)) video.currentTime = detail.seekTime;
          });
        } catch (_) {
          /* O site/Chromium pode restringir algum handler. */
        }
      }

      try {
        await video.requestPictureInPicture();
        return { ok: true, active: true };
      } catch (error) {
        return { ok: false, error: error && error.name ? error.name : 'request-failed' };
      }
    })()
  `;

  const CLOSE_SCRIPT = `
    (async () => {
      if (!document.pictureInPictureElement) return { ok: true, active: false };
      try {
        await document.exitPictureInPicture();
        return { ok: true, active: false };
      } catch (error) {
        return { ok: false, error: error && error.name ? error.name : 'exit-failed' };
      }
    })()
  `;

  function buildMediaCommandScript(action) {
    return `
      (async () => {
        const action = ${JSON.stringify(action)};
        const collectVideos = (root, output) => {
          if (!root || !root.querySelectorAll) return;
          root.querySelectorAll('video').forEach((video) => output.push(video));
          root.querySelectorAll('*').forEach((node) => {
            if (node.shadowRoot) collectVideos(node.shadowRoot, output);
          });
        };
        const videos = [];
        collectVideos(document, videos);
        const video = document.pictureInPictureElement ||
          videos.find((item) => !item.paused && !item.ended) ||
          videos[0];
        if (!video) return { ok: false, error: 'no-video' };

        try {
          if (action === 'play_pause') {
            if (video.paused) await video.play();
            else video.pause();
            return { ok: true };
          }
          if (action === 'play') {
            await video.play();
            return { ok: true };
          }
          if (action === 'pause') {
            video.pause();
            return { ok: true };
          }
          if (action === 'stop') {
            video.pause();
            video.currentTime = 0;
            return { ok: true };
          }
          if (action !== 'next' && action !== 'prev') {
            return { ok: false, passthrough: true, error: 'unsupported-action' };
          }

          const selectors = action === 'next'
            ? [
                '.ytp-next-button',
                '[aria-label*="Next"]',
                '[aria-label*="Próximo"]',
                '[title*="Next"]',
                '[title*="Próximo"]'
              ]
            : [
                '.ytp-prev-button',
                '[aria-label*="Previous"]',
                '[aria-label*="Anterior"]',
                '[title*="Previous"]',
                '[title*="Anterior"]'
              ];
          const target = selectors
            .map((selector) => document.querySelector(selector))
            .find((element) => element && !element.disabled);
          if (target) {
            target.click();
            return { ok: true };
          }
          return { ok: false, passthrough: true, error: 'site-action-unavailable' };
        } catch (error) {
          return {
            ok: false,
            error: error && error.name ? error.name : 'command-failed'
          };
        }
      })()
    `;
  }

  function getActiveWebview() {
    return document.querySelector('#browser webview.active');
  }

  function isUsableWebview(webview) {
    return Boolean(webview && webview.isConnected &&
      typeof webview.executeJavaScript === 'function');
  }

  async function executeInWebview(webview, script) {
    if (!isUsableWebview(webview)) return null;
    try {
      return await webview.executeJavaScript(script, true);
    } catch (_) {
      return null;
    }
  }

  function normalizeState(result) {
    if (!result || typeof result !== 'object') return emptyState();
    return {
      available: Boolean(result.available),
      active: Boolean(result.active),
      supported: result.supported !== false,
      title: result.title || 'Vídeo da aba atual',
      artist: result.artist || '',
      album: result.album || '',
      cover: result.cover || '',
      app: result.app || 'Navegador',
      url: result.url || '',
      paused: result.paused !== false,
      position: Number(result.position) || 0,
      duration: Number(result.duration) || 0,
    };
  }

  function getSnapshot() {
    if (!state.active) return null;
    return {
      app: `PiP · ${state.app || 'Navegador'}`,
      title: state.title || 'Vídeo em Picture in Picture',
      artist: state.artist || state.app || '',
      album: state.album || '',
      cover: state.cover || '',
      duration: state.duration,
      position: state.position,
      paused: state.paused,
      timestamp: Date.now(),
      pip: true,
      tabId: ownerTabId,
      url: state.url,
    };
  }

  function publishState(forceChange) {
    const snapshot = getSnapshot();
    const key = snapshot
      ? `${snapshot.tabId}|${snapshot.title}|${snapshot.paused}|${Math.floor(snapshot.position)}`
      : 'none';
    const event = forceChange || key !== lastPublishedKey ? 'media_change' : 'media_progress';
    lastPublishedKey = key;

    document.dispatchEvent(new CustomEvent('dragon-pip:changed', {
      detail: snapshot,
    }));
    window.DragonMedia?.notifyLocalSourceChanged?.(event);
  }

  function fmtTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function setMessage(text) {
    if (!message) return;
    message.textContent = text || '';
    message.hidden = !text;
  }

  function paint() {
    if (!button || !control) return;
    control.hidden = !state.available;
    button.classList.toggle('is-active', state.active);
    button.setAttribute(
      'aria-label',
      state.active ? 'Picture in Picture ativo' : 'Abrir opções de Picture in Picture'
    );
    button.title = state.active ? 'Picture in Picture ativo' : 'Picture in Picture';

    if (sourceLabel) sourceLabel.textContent = state.app || 'Vídeo da aba atual';
    if (mediaTitle) mediaTitle.textContent = state.title || 'Vídeo da aba atual';
    if (mediaArtist) {
      mediaArtist.textContent = [state.artist, state.album].filter(Boolean).join(' — ') ||
        state.app || '';
    }
    if (positionLabel) positionLabel.textContent = fmtTime(state.position);
    if (durationLabel) durationLabel.textContent = fmtTime(state.duration);
    if (progressFill) {
      const percent = state.duration > 0
        ? Math.max(0, Math.min(100, state.position / state.duration * 100))
        : 0;
      progressFill.style.width = `${percent}%`;
    }
    if (playIcon) playIcon.hidden = !state.paused;
    if (pauseIcon) pauseIcon.hidden = state.paused;

    if (coverImage && coverFallback) {
      if (state.cover) {
        if (coverImage.src !== state.cover) coverImage.src = state.cover;
        coverImage.hidden = false;
        coverFallback.hidden = true;
      } else {
        coverImage.removeAttribute('src');
        coverImage.hidden = true;
        coverFallback.hidden = false;
      }
    }
    if (actionLabel) {
      actionLabel.textContent = state.active
        ? 'Fechar Picture in Picture'
        : 'Abrir Picture in Picture';
    }
    if (actionButton) {
      actionButton.classList.toggle('is-close', state.active);
      actionButton.disabled = !state.supported && !state.active;
    }
    if (!state.available && isOpen) close();
  }

  async function inspect(webview) {
    return normalizeState(await executeInWebview(webview, INSPECT_SCRIPT));
  }

  async function refresh() {
    const token = ++refreshToken;
    let next = emptyState();
    let activeWebview = getActiveWebview();

    if (isUsableWebview(ownerWebview)) {
      const ownerState = await inspect(ownerWebview);
      if (token !== refreshToken) return;
      if (ownerState.active) {
        next = ownerState;
      } else {
        ownerWebview = null;
        ownerTabId = null;
      }
    }

    if (!next.active && isUsableWebview(activeWebview)) {
      next = await inspect(activeWebview);
      if (token !== refreshToken) return;
      if (next.active) {
        ownerWebview = activeWebview;
        ownerTabId = activeWebview.dataset.id || null;
      }
    }

    const activeChanged = state.active !== next.active;
    state = next;
    paint();
    publishState(activeChanged);
    syncPoll();
  }

  async function command(action) {
    const webview = state.active ? ownerWebview : getActiveWebview();
    const result = await executeInWebview(webview, buildMediaCommandScript(action));
    setTimeout(refresh, 60);
    return result || { ok: false, passthrough: true, error: 'webview-unavailable' };
  }

  function positionMenu() {
    if (!menu || !button) return;
    const rect = button.getBoundingClientRect();
    const width = menu.offsetWidth || 300;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(rect.bottom + 8)}px`;
  }

  async function open() {
    await refresh();
    if (!state.available || !menu) return;
    setMessage('');
    isOpen = true;
    syncPoll();
    positionMenu();
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    button?.setAttribute('aria-expanded', 'true');
  }

  function close() {
    if (!menu) return;
    isOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    button?.setAttribute('aria-expanded', 'false');
    setMessage('');
    syncPoll();
  }

  function errorMessage(error) {
    if (error === 'unsupported') return 'Este vídeo não oferece suporte ao PiP.';
    if (error === 'no-video') return 'O vídeo parou ou não está mais disponível.';
    if (error === 'NotAllowedError') return 'O site bloqueou a abertura do PiP.';
    return 'Não foi possível alterar o Picture in Picture.';
  }

  async function togglePictureInPicture() {
    if (!actionButton) return;
    actionButton.disabled = true;
    setMessage('');

    const webview = state.active ? ownerWebview : getActiveWebview();
    const result = await executeInWebview(
      webview,
      state.active ? CLOSE_SCRIPT : OPEN_SCRIPT
    );
    actionButton.disabled = false;

    if (!result?.ok) {
      setMessage(errorMessage(result?.error));
      await refresh();
      return;
    }

    if (result.active) {
      ownerWebview = webview;
      ownerTabId = webview?.dataset?.id || null;
    } else {
      ownerWebview = null;
      ownerTabId = null;
    }
    await refresh();
    close();
  }

  function bindWebview(webview) {
    if (!webview || webview.dataset.pipControlBound === '1') return;
    webview.dataset.pipControlBound = '1';
    webview.addEventListener('media-started-playing', scheduleRefresh);
    webview.addEventListener('media-paused', scheduleRefresh);
    webview.addEventListener('dom-ready', scheduleRefresh);
    webview.addEventListener('did-navigate', scheduleRefresh);
    webview.addEventListener('did-navigate-in-page', scheduleRefresh);
    webview.addEventListener('destroyed', scheduleRefresh);
  }

  function bindWebviews() {
    document.querySelectorAll('#browser webview').forEach(bindWebview);
  }

  async function buildMenu() {
    if (menu) return;
    const response = await fetch(TEMPLATE_PATH);
    if (!response.ok) return;

    menu = document.createElement('div');
    menu.className = 'pip-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = (await response.text()).trim();
    document.body.appendChild(menu);

    actionButton = menu.querySelector('[data-role="pip-action"]');
    actionLabel = menu.querySelector('[data-role="pip-action-label"]');
    sourceLabel = menu.querySelector('[data-role="pip-source"]');
    mediaTitle = menu.querySelector('[data-role="pip-title"]');
    mediaArtist = menu.querySelector('[data-role="pip-artist"]');
    coverImage = menu.querySelector('[data-role="pip-cover"]');
    coverFallback = menu.querySelector('[data-role="pip-cover-fallback"]');
    positionLabel = menu.querySelector('[data-role="pip-position"]');
    durationLabel = menu.querySelector('[data-role="pip-duration"]');
    progressFill = menu.querySelector('[data-role="pip-progress-fill"]');
    playIcon = menu.querySelector('[data-icon="pip-play"]');
    pauseIcon = menu.querySelector('[data-icon="pip-pause"]');
    message = menu.querySelector('[data-role="pip-message"]');

    actionButton?.addEventListener('click', togglePictureInPicture);
    menu.querySelectorAll('[data-pip-media-action]').forEach((mediaButton) => {
      mediaButton.addEventListener('click', async () => {
        const action = mediaButton.dataset.pipMediaAction;
        if (!action) return;
        mediaButton.disabled = true;
        const result = await window.DragonMedia?.command?.(action);
        mediaButton.disabled = false;
        if (!result?.ok) setMessage('Este site não oferece esse controle.');
      });
    });
  }

  async function init() {
    if (initialized) return;
    initialized = true;

    control = document.getElementById('pipControl');
    button = document.getElementById('pipButton');
    if (!control || !button) return;

    await buildMenu();
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (isOpen) close();
      else open();
    });
    document.addEventListener('click', (event) => {
      if (!isOpen) return;
      if (menu?.contains(event.target) || control?.contains(event.target)) return;
      close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    const onTabSurfaceChange = () => {
      if (isOpen) close();
      // Um único refresh leve — sem poll; botão PiP atualiza sob demanda.
      scheduleRefresh();
    };
    document.addEventListener('app:tab-created', () => {
      bindWebviews();
      onTabSurfaceChange();
    });
    document.addEventListener('app:tab-changed', onTabSurfaceChange);
    document.addEventListener('app:tab-closed', onTabSurfaceChange);
    document.addEventListener('app:tabs-cleared', onTabSurfaceChange);
    document.addEventListener('app:webview-navigated', onTabSurfaceChange);
    document.addEventListener('app:home-shown', onTabSurfaceChange);
    window.addEventListener('resize', () => {
      if (isOpen) positionMenu();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopPoll();
      else {
        scheduleRefresh();
        syncPoll();
      }
    });
    unbindPerfIdle = window.JanelasNS?.PerfIdle?.onChange?.((active) => {
      if (active) {
        scheduleRefresh();
        syncPoll();
      } else if (!state.active) {
        stopPoll();
      }
    }) || null;

    const browser = document.getElementById('browser');
    if (browser) {
      new MutationObserver(bindWebviews).observe(browser, { childList: true });
    }

    unregisterMediaSource = window.DragonMedia?.registerLocalSource?.({
      id: 'picture-in-picture',
      getSnapshot,
      command,
    }) || null;

    bindWebviews();
    refresh();
  }

  function dispose() {
    stopPoll();
    unbindPerfIdle?.();
    unbindPerfIdle = null;
    unregisterMediaSource?.();
    unregisterMediaSource = null;
    close();
    initialized = false;
  }

  window.PictureInPictureControl = {
    init,
    dispose,
    refresh,
    open,
    close,
    command,
    getSnapshot,
    getState: () => ({ ...state, tabId: ownerTabId }),
  };
})();
