/**
 * Aplica o layout customizável do Topo Global.
 */
(function () {
  if (window.ChromeLayout) return;

  let initialized = false;

  function applyRightItems(settings) {
    const right = document.querySelector('.nav-right');
    const order = Array.isArray(settings.rightOrder) && settings.rightOrder.length
      ? settings.rightOrder
      : window.ChromeLayoutSettings?.DEFAULT_RIGHT_ORDER || [];

    order.forEach((id, index) => {
      const el = document.getElementById(id);
      if (!el) return;
      const visible = settings.rightItems?.[id] !== false;
      el.hidden = !visible;
      el.classList.toggle('chrome-item-hidden', !visible);
      el.style.order = String(index);
      if (right && el.parentElement === right) {
        right.appendChild(el);
      }
    });
  }

  function hexToRgb(hex) {
    const normalized = /^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : 'ffffff';
    const value = Number.parseInt(normalized, 16);
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  }

  function apply(settings = window.ChromeLayoutSettings?.read?.()) {
    if (!settings) return;

    document.body.dataset.tabsPosition = settings.tabsPosition;
    document.body.dataset.searchSlot = settings.searchSlot;
    document.body.dataset.rightSlot = settings.rightSlot;
    document.body.dataset.musicPosition = settings.musicPosition || 'right';
    document.body.style.setProperty('--nav-search-width', `${settings.searchWidth}px`);
    document.body.style.setProperty('--chrome-border-color', settings.borderColor);
    document.body.style.setProperty('--chrome-border-rgb', hexToRgb(settings.borderColor));
    document.body.style.setProperty('--chrome-border-opacity', `${settings.borderOpacity / 100}`);
    document.body.style.setProperty('--active-tab-opacity', `${settings.activeTabOpacity / 100}`);
    document.body.classList.toggle('active-tab-led', Boolean(settings.activeTabLedBorder));
    document.body.dataset.activeTabLed = settings.activeTabLedBorder ? 'on' : 'off';

    applyRightItems(settings);
    window.AutoTuneMusicMinimal?.reposition?.();
  }

  function init() {
    if (initialized) {
      apply();
      return;
    }
    initialized = true;
    apply();
    document.addEventListener('chrome-layout:changed', (event) => {
      apply(event.detail?.settings || window.ChromeLayoutSettings?.read?.());
    });
    document.addEventListener('customise:reloaded', () => apply());
    document.addEventListener('user:changed', () => setTimeout(() => apply(), 0));
    window.addEventListener('resize', () => apply());
  }

  window.ChromeLayout = {
    init,
    apply,
    getSettings: () => window.ChromeLayoutSettings?.read?.(),
  };
})();
