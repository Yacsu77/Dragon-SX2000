/**
 * Tabline lateral — idgets (Wallpaper, Tema, AutoTune, etc.).
 */
(function () {
  const TEMPLATE_PATH = 'Tabline/Tabline.html';

  const WIDGET_SCRIPTS = [
    '../../UserINTer/Tabline/idget/Wallpaper/index.js',
    '../../UserINTer/Tabline/idget/Tema/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Timer/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Tasklist/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Share/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Music/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/config.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/fonts.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/render.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/index.js',
    '../../UserINTer/Tabline/idget/AutoTune/Clock/factory.js',
    '../../UserINTer/Tabline/idget/AutoTune/index.js',
  ];

  let isBuilt = false;
  let widgetsLoaded = false;

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

  function bindActiveState() {
    const idgetTabs = document.querySelectorAll('.side-tabs .tab-item');
    if (idgetTabs.length === 0) return;

    idgetTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        idgetTabs.forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
      });
    });
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
    bindActiveState();

    if (window.TablineAnim && typeof window.TablineAnim.init === 'function') {
      window.TablineAnim.init();
    }
  }

  async function init() {
    await ensureBuilt();
    await loadWidgetScripts();

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  window.Tabline = { init };
})();
