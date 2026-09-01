/**
 * Chrome de abas invertidas (estilo Chrome de cabeça para baixo) no topo de cada painel.
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});
  if (NS.SplitPaneChrome) return;

  let root = null;
  let titleObserver = null;

  function ensureRoot() {
    const browser = document.getElementById('browser');
    if (!browser) return null;
    if (root && root.isConnected) return root;

    root = document.createElement('div');
    root.id = 'janelas-pane-chrome';
    root.setAttribute('aria-hidden', 'false');

    ['left', 'right'].forEach((side) => {
      const slot = document.createElement('div');
      slot.className = 'janelas-pane-slot';
      slot.dataset.side = side;

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'janelas-pane-tab';
      tab.dataset.side = side;

      const icon = document.createElement('span');
      icon.className = 'janelas-pane-tab__icon';
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      icon.appendChild(img);

      const title = document.createElement('span');
      title.className = 'janelas-pane-tab__title';

      tab.appendChild(icon);
      tab.appendChild(title);
      slot.appendChild(tab);
      root.appendChild(slot);

      tab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        NS.SplitHost?.focusPane?.(side);
      });

      tab.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button !== 0) return;
        NS.SplitDropController?.beginPaneDrag?.(e, side);
      });
    });

    browser.appendChild(root);
    return root;
  }

  function readSourceTab(tabId) {
    const src = document.querySelector(`#tabs .tab[data-id="${tabId}"]`);
    if (!src) {
      return { title: 'Aba', favicon: null };
    }
    const title =
      src.querySelector('.tab-title')?.textContent?.trim() || 'Aba';
    const favicon = src.querySelector('.tab-icon img')?.src || null;
    return { title, favicon };
  }

  function paintButton(btn, tabId, focused) {
    if (!btn) return;
    btn.dataset.tabId = tabId || '';
    btn.classList.toggle('is-focused', Boolean(focused));
    btn.hidden = !tabId;

    const meta = readSourceTab(tabId);
    const titleEl = btn.querySelector('.janelas-pane-tab__title');
    const img = btn.querySelector('.janelas-pane-tab__icon img');
    if (titleEl) titleEl.textContent = meta.title;
    if (img) {
      if (meta.favicon) {
        img.src = meta.favicon;
        img.hidden = false;
      } else {
        img.removeAttribute('src');
        img.hidden = true;
      }
    }
  }

  function sync() {
    const state = NS.SplitHost?.getState?.() || NS.Store?.getRuntime?.();
    if (!state || state.mode !== 'split') {
      unmount();
      return;
    }

    const host = ensureRoot();
    if (!host) return;
    host.hidden = false;

    const leftBtn = host.querySelector('.janelas-pane-tab[data-side="left"]');
    const rightBtn = host.querySelector('.janelas-pane-tab[data-side="right"]');
    paintButton(leftBtn, state.leftTabId, state.focusPane === 'left');
    paintButton(rightBtn, state.rightTabId, state.focusPane === 'right');

    observeTitles();
  }

  function observeTitles() {
    if (titleObserver) return;
    const tabs = document.getElementById('tabs');
    if (!tabs) return;
    titleObserver = new MutationObserver(() => {
      const state = NS.SplitHost?.getState?.();
      if (state?.mode === 'split') sync();
    });
    titleObserver.observe(tabs, {
      subtree: true,
      characterData: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  function mount() {
    ensureRoot();
    sync();
  }

  function unmount() {
    if (titleObserver) {
      titleObserver.disconnect();
      titleObserver = null;
    }
    if (root) {
      root.remove();
      root = null;
    }
  }

  NS.SplitPaneChrome = { mount, unmount, sync };
})();
