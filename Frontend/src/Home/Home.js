/**
 * Página inicial — área transparente; wallpaper visível atrás.
 * Busca e navegação ficam na barra superior (Top/Search).
 */
(function () {
  let isBuilt = false;

  async function ensureBuilt() {
    if (isBuilt) return;

    const homePage = document.getElementById('homePage');
    if (!homePage) return;

    const response = await fetch('Home/Home.html');
    homePage.innerHTML = (await response.text()).trim();
    isBuilt = true;
  }

  async function init() {
    await ensureBuilt();
  }

  window.Home = { init, ensureBuilt };
})();
