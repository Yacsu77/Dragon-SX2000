/**
 * Monta fragmentos HTML do shell (background, top, tabs, wallpaper, autotune).
 */
(function () {
  const FRAGMENTS = [
    { mountId: 'backgroundRoot', path: 'core/background.html' },
    { mountId: 'topRoot', path: 'Top/Top.html' },
    { mountId: 'tabsRoot', path: 'Tabs/Tabs.html' },
    { mountId: 'wallpaperRoot', path: 'Wallpaper/Wallpaper.html' },
    { mountId: 'autotuneRoot', path: '../../UserINTer/Tabline/idget/AutoTune/catalog.html' },
  ];

  let mounted = false;

  async function mountFragment(mountId, path) {
    const mount = document.getElementById(mountId);
    if (!mount || mount.childElementCount > 0) return;

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Shell: falha ao carregar ${path}`);
    }

    mount.innerHTML = (await response.text()).trim();
    if (window.Idioma && typeof window.Idioma.aplicar === "function") {
      window.Idioma.aplicar(mount);
    }
  }

  async function mountAll() {
    if (mounted) return;

    for (const fragment of FRAGMENTS) {
      await mountFragment(fragment.mountId, fragment.path);
    }

    mounted = true;
  }

  window.Shell = { mountAll };
})();
