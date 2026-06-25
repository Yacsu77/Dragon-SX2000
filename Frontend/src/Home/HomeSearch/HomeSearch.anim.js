/**
 * Foco na barra de endereço ao exibir a home.
 */
(function () {
  function focusAddressBar() {
    const homePage = document.getElementById('homePage');
    const input = document.getElementById('addressInput');
    if (!input || (homePage && homePage.classList.contains('hidden'))) return;
    input.focus();
    input.select();
  }

  document.addEventListener('app:home-shown', focusAddressBar);

  window.HomeSearchAnim = { focusAddressBar };
})();
