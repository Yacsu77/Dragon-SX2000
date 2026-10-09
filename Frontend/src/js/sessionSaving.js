/**
 * Tela "Salvando…" ao fechar.
 *
 * O main avisa uma vez, pede o flush da API e só então encerra.
 * Não há timer de interação nesta tela.
 */
(function () {
  function show() {
    if (document.getElementById('dsx-session-saving')) return;
    const el = document.createElement('div');
    el.id = 'dsx-session-saving';
    el.className = 'dsx-session-saving';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', 'Salvando');
    el.innerHTML = '<div class="dsx-session-saving__card"><p>Salvando…</p></div>';
    document.body.appendChild(el);
  }

  if (window.DragonApp && typeof window.DragonApp.onSaving === 'function') {
    window.DragonApp.onSaving(show);
  }
})();
