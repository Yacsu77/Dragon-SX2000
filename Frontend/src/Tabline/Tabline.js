/**
 * Tabline — dock lateral integrado (tools, llm, chats, widgets, footer).
 */
(function () {
  const TEMPLATE_PATH = 'Tabline/Tabline.html';

  const CUSTOMISE_BASE = '../../UserINTer/Tabline/idget/Customise';
  const WIDGET_SCRIPTS = [
    '../../UserINTer/Tabline/idget/Wallpaper/index.js',
    '../../UserINTer/Tabline/idget/Tema/index.js',
    `${CUSTOMISE_BASE}/core/keys.js`,
    `${CUSTOMISE_BASE}/core/utils.js`,
    `${CUSTOMISE_BASE}/adapters/storageAdapter.js`,
    `${CUSTOMISE_BASE}/adapters/runtimeAdapter.js`,
    `${CUSTOMISE_BASE}/adapters/settingsAdapterRegistry.js`,
    `${CUSTOMISE_BASE}/core/store.js`,
    `${CUSTOMISE_BASE}/factory/registry.js`,
    `${CUSTOMISE_BASE}/factory/shared/dragList.js`,
    `${CUSTOMISE_BASE}/components/radialMenu/defaults.js`,
    `${CUSTOMISE_BASE}/components/radialMenu/geometry.js`,
    `${CUSTOMISE_BASE}/components/radialMenu/preview.js`,
    `${CUSTOMISE_BASE}/components/radialMenu/editor.js`,
    `${CUSTOMISE_BASE}/components/searchPalette/defaults.js`,
    `${CUSTOMISE_BASE}/components/searchPalette/preview.js`,
    `${CUSTOMISE_BASE}/components/searchPalette/editor.js`,
    `${CUSTOMISE_BASE}/components/smartSearch/defaults.js`,
    `${CUSTOMISE_BASE}/components/smartSearch/editor.js`,
    `${CUSTOMISE_BASE}/components/topoGlobal/defaults.js`,
    `${CUSTOMISE_BASE}/components/topoGlobal/meta.js`,
    `${CUSTOMISE_BASE}/components/topoGlobal/preview.js`,
    `${CUSTOMISE_BASE}/components/topoGlobal/editor.js`,
    `${CUSTOMISE_BASE}/components/sidebarLayout/defaults.js`,
    `${CUSTOMISE_BASE}/components/sidebarLayout/preview.js`,
    `${CUSTOMISE_BASE}/components/sidebarLayout/editor.js`,
    `${CUSTOMISE_BASE}/components/janelas/defaults.js`,
    `${CUSTOMISE_BASE}/components/janelas/preview.js`,
    `${CUSTOMISE_BASE}/components/janelas/editor.js`,
    `${CUSTOMISE_BASE}/core/shell.js`,
    `${CUSTOMISE_BASE}/index.js`,
    '../../UserINTer/Tabline/idget/AutoTune/Timer/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Tasklist/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Share/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Music/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Music/minimal.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/config.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/fonts.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/render.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/factory.js',
    '../../UserINTer/Tabline/idget/AutoTune/index.js',
  ];

  let isBuilt = false;
  let widgetsLoaded = false;
  let syncTimer = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadWidgetScripts() {
    if (widgetsLoaded) return;
    for (const src of WIDGET_SCRIPTS) {
      await loadScript(src);
    }
    widgetsLoaded = true;
  }

  function photoSrc(path) {
    if (!path) return null;
    if (/^(data:|file:|https?:)/i.test(path)) return path;
    return `file://${path}`;
  }

  function createIconNode(icon) {
    const wrap = document.createElement('span');
    wrap.className = 'side-item__icon';

    if (icon?.type === 'url' && icon.value) {
      const img = document.createElement('img');
      img.src = icon.value;
      img.alt = '';
      img.draggable = false;
      wrap.appendChild(img);
      return wrap;
    }

    wrap.dataset.lucide = icon?.value || 'circle';
    return wrap;
  }

  function renderSection(section) {
    const host = document.querySelector(`.side-section[data-section="${section}"] [data-role="section-list"]`);
    if (!host || !window.SidebarNS?.Store) return;

    host.innerHTML = '';
    const items = window.SidebarNS.Store.getItemsBySection(section);

    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'side-item';
      btn.dataset.itemId = item.id;
      btn.dataset.section = item.section;
      btn.setAttribute('aria-label', item.label);
      btn.title = item.label;
      btn.appendChild(createIconNode(item.icon));

      btn.addEventListener('click', () => {
        const result = window.SidebarNS.Dispatcher.dispatch(item);
        if (result?.stub && result.message && window.TablineAnim?.flashTooltip) {
          window.TablineAnim.flashTooltip(btn, result.message);
        }
        markActiveFromPanel();
      });

      host.appendChild(btn);
    });
  }

  function renderDynamicSections() {
    renderSection('tools');
    renderSection('llm');
    renderSection('chats');
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  function markActiveFromPanel() {
    const openId =
      window.SidePanelHost?.isOpen?.()
        ? document.querySelector('.side-panel')?.dataset?.itemId
        : null;

    document.querySelectorAll('.side-dock .side-item[data-item-id]').forEach((el) => {
      el.classList.toggle('is-active', !!openId && el.dataset.itemId === openId);
    });
  }

  function bindWidgetsFlyout() {
    const orb = document.getElementById('widgetsOrb');
    const flyout = document.getElementById('widgetsFlyout');
    const wrap = orb?.closest('.widgets-orb-wrap');
    if (!orb || !flyout || !wrap) return;

    let closeTimer = null;

    function open() {
      clearTimeout(closeTimer);
      flyout.hidden = false;
      orb.setAttribute('aria-expanded', 'true');
    }

    function scheduleClose() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        flyout.hidden = true;
        orb.setAttribute('aria-expanded', 'false');
      }, 180);
    }

    wrap.addEventListener('mouseenter', open);
    wrap.addEventListener('mouseleave', scheduleClose);
    wrap.addEventListener('focusin', open);
    wrap.addEventListener('focusout', (event) => {
      if (!wrap.contains(event.relatedTarget)) scheduleClose();
    });

    flyout.querySelector('[data-widget="donate"]')?.addEventListener('click', () => {
      if (window.TablineAnim?.flashTooltip) {
        window.TablineAnim.flashTooltip(orb, 'Em desenvolvimento');
      }
    });

    flyout.querySelector('[data-widget="customise"]')?.addEventListener('click', (event) => {
      if (window.Customise?.open) {
        event.preventDefault();
        window.Customise.open();
      }
    });
  }

  function bindFooter() {
    const profileBtn = document.getElementById('sideProfileBtn');
    const flyout = document.getElementById('sideProfileFlyout');
    const wrap = profileBtn?.closest('.side-profile-wrap');
    const syncBtn = document.getElementById('sideSyncBtn');
    const mediaWrap = document.getElementById('sideMediaWrap');
    const mediaHint = document.getElementById('sideMediaHint');
    const mediaFlyout = document.getElementById('sideMediaFlyout');
    const playBtn = mediaFlyout?.querySelector('[data-role="media-play-btn"]');
    const iconPlay = playBtn?.querySelector('[data-icon="play"]');
    const iconPause = playBtn?.querySelector('[data-icon="pause"]');

    if (profileBtn && flyout && wrap) {
      let closeTimer = null;

      function open() {
        clearTimeout(closeTimer);
        flyout.hidden = false;
        profileBtn.setAttribute('aria-expanded', 'true');
      }

      function scheduleClose() {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          flyout.hidden = true;
          profileBtn.setAttribute('aria-expanded', 'false');
        }, 160);
      }

      wrap.addEventListener('mouseenter', open);
      wrap.addEventListener('mouseleave', scheduleClose);
      wrap.addEventListener('focusin', open);
      wrap.addEventListener('focusout', (event) => {
        if (!wrap.contains(event.relatedTarget)) scheduleClose();
      });

      flyout.querySelector('[data-profile-action="edit"]')?.addEventListener('click', () => {
        window.SidebarNS?.Dispatcher?.dispatch({
          action: { type: 'command', payload: { name: 'edit-profile' } },
        });
      });

      flyout.querySelector('[data-profile-action="switch"]')?.addEventListener('click', () => {
        window.SidebarNS?.Dispatcher?.dispatch({
          action: { type: 'command', payload: { name: 'switch-user' } },
        });
      });
    }

    function refreshAvatar() {
      const avatar = document.querySelector('#sideProfileBtn [data-role="avatar"]');
      if (!avatar) return;
      const user = window.UserSession?.getActiveUser?.();
      const src = photoSrc(user?.photo_path);
      const initial = (user?.name || user?.username || '?').trim().charAt(0).toUpperCase() || '?';

      if (src) {
        avatar.textContent = '';
        avatar.style.backgroundImage = `url("${src}")`;
      } else {
        avatar.style.backgroundImage = '';
        avatar.textContent = initial;
      }

      if (profileBtn) {
        profileBtn.setAttribute('aria-label', user?.name ? `Perfil: ${user.name}` : 'Perfil');
        profileBtn.title = user?.name || 'Perfil';
      }
    }

    function pulseSync() {
      if (!syncBtn) return;
      syncBtn.classList.add('is-saving');
      syncBtn.title = 'Sincronizando…';
      setTimeout(() => {
        syncBtn.classList.remove('is-saving');
        syncBtn.title = 'Sincronização';
      }, 1400);
    }

    function mediaLabel(snap) {
      const app = (snap?.app || snap?.source || '').trim();
      if (app) return app;
      try {
        if (snap?.url) return new URL(snap.url).hostname.replace(/^www\./, '');
      } catch (_) { /* ignore */ }
      return 'Mídia';
    }

    function updateMediaHint() {
      if (!mediaWrap || !mediaHint) return;
      const connected = window.DragonMedia?.connected !== false;
      const snap = connected ? window.DragonMedia?.snapshot : null;
      const hasMedia = !!(snap && snap.title);
      const playing = hasMedia && !snap.paused;

      mediaWrap.hidden = !hasMedia;
      mediaWrap.classList.toggle('is-playing', playing);
      mediaWrap.classList.toggle('is-paused', hasMedia && !playing);
      mediaHint.setAttribute('aria-hidden', hasMedia ? 'false' : 'true');
      mediaHint.title = hasMedia ? mediaLabel(snap) : 'Mídia';

      if (iconPlay && iconPause) {
        iconPlay.hidden = playing;
        iconPause.hidden = !playing;
      }
    }

    if (mediaWrap && mediaFlyout) {
      let mediaCloseTimer = null;

      function openMedia() {
        clearTimeout(mediaCloseTimer);
        if (mediaWrap.hidden) return;
        mediaFlyout.hidden = false;
      }

      function scheduleCloseMedia() {
        clearTimeout(mediaCloseTimer);
        mediaCloseTimer = setTimeout(() => {
          mediaFlyout.hidden = true;
        }, 180);
      }

      mediaWrap.addEventListener('mouseenter', openMedia);
      mediaWrap.addEventListener('mouseleave', scheduleCloseMedia);
      mediaWrap.addEventListener('focusin', openMedia);
      mediaWrap.addEventListener('focusout', (event) => {
        if (!mediaWrap.contains(event.relatedTarget)) scheduleCloseMedia();
      });

      mediaFlyout.addEventListener('click', async (event) => {
        const btn = event.target.closest('[data-media-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-media-action');
        if (!action || !window.DragonMedia?.command) return;

        if (action === 'play_pause' && window.DragonMedia.snapshot) {
          updateMediaHint();
        }

        try {
          await window.DragonMedia.command(action);
        } catch (_) { /* ignore */ }
        updateMediaHint();
      });
    }

    refreshAvatar();
    updateMediaHint();
    document.addEventListener('user:changed', refreshAvatar);
    document.addEventListener('dragon-media:media_play', updateMediaHint);
    document.addEventListener('dragon-media:media_pause', updateMediaHint);
    document.addEventListener('dragon-media:media_stop', updateMediaHint);
    document.addEventListener('dragon-media:media_change', updateMediaHint);
    document.addEventListener('dragon-media:hello', updateMediaHint);
    document.addEventListener('dragon-media:disconnected', updateMediaHint);

    if (window.DragonMedia?.on) {
      window.DragonMedia.on('media_change', updateMediaHint);
      window.DragonMedia.on('media_play', updateMediaHint);
      window.DragonMedia.on('media_pause', updateMediaHint);
      window.DragonMedia.on('media_stop', updateMediaHint);
      window.DragonMedia.on('hello', updateMediaHint);
      window.DragonMedia.on('disconnected', () => {
        updateMediaHint();
      });
    }

    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(pulseSync, 28000);
    setTimeout(pulseSync, 3500);
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    const root = document.getElementById('tablineRoot');
    if (!root) return;

    if (root.childElementCount === 0) {
      const response = await fetch(TEMPLATE_PATH);
      root.innerHTML = (await response.text()).trim();
    }

    isBuilt = true;
    renderDynamicSections();
    bindWidgetsFlyout();
    bindFooter();

    if (window.TablineAnim?.init) window.TablineAnim.init();

    document.addEventListener('sidebar:changed', renderDynamicSections);
    document.addEventListener('side-panel:opened', markActiveFromPanel);
    document.addEventListener('side-panel:closed', markActiveFromPanel);
  }

  async function init() {
    await ensureBuilt();
    await loadWidgetScripts();

    if (window.lucide?.createIcons) window.lucide.createIcons();
  }

  window.Tabline = {
    init,
    refresh: renderDynamicSections,
  };
})();
