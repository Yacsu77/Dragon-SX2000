/**
 * Search Palette
 *
 * Overlay flutuante centralizado que abre com Ctrl+Espaço (configurável via
 * ShortcutManager). Permite o usuário pesquisar/abrir uma URL sem voltar para
 * a home. Cancela sem efeito ao clicar fora ou pressionar Esc.
 *
 * Comportamentos:
 *   - Aparecer com fade + scale-in
 *   - Foco automático no input
 *   - Submit (Enter ou clique no botão Buscar):
 *       • se parece URL (tem ponto e sem espaços) → abre como URL
 *       • caso contrário → faz busca via window.performSearch
 *   - Esc / clique no backdrop → fecha sem ação
 *   - Toggle: pressionar o atalho de novo enquanto está aberto também fecha
 */
(function () {
  if (window.SearchPalette) return; // idempotente

  const ROOT_ID = "shortcut-search-palette";
  let rootEl = null;
  let inputEl = null;
  let formEl = null;
  let isOpen = false;
  let lastFocusEl = null;

  function buildDom() {
    if (rootEl) return;
    rootEl = document.createElement("div");
    rootEl.id = ROOT_ID;
    rootEl.className = "shortcut-search-palette";
    rootEl.setAttribute("aria-hidden", "true");
    rootEl.innerHTML = `
      <div class="shortcut-search-palette__backdrop" data-role="backdrop"></div>
      <div class="shortcut-search-palette__shell" role="dialog" aria-modal="true"
           aria-label="Buscar ou abrir URL">
        <form class="shortcut-search-palette__form" data-role="form" autocomplete="off">
          <span class="shortcut-search-palette__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </span>
          <input
            type="text"
            class="shortcut-search-palette__input"
            data-role="input"
            placeholder="Pesquisar na web ou colar URL…"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="submit" class="shortcut-search-palette__submit" data-role="submit">
            Buscar
          </button>
        </form>
        <div class="shortcut-search-palette__hint">
          <kbd>Enter</kbd> para buscar · <kbd>Esc</kbd> para fechar
        </div>
      </div>
    `;
    document.body.appendChild(rootEl);

    inputEl = rootEl.querySelector('[data-role="input"]');
    formEl = rootEl.querySelector('[data-role="form"]');

    rootEl.querySelector('[data-role="backdrop"]').addEventListener("click", close);
    formEl.addEventListener("submit", onSubmit);
  }

  function looksLikeUrl(value) {
    return value.includes(".") && !value.includes(" ");
  }

  function normalizeUrl(value) {
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  }

  function onSubmit(event) {
    event.preventDefault();
    const raw = (inputEl && inputEl.value ? inputEl.value : "").trim();
    if (!raw) {
      close();
      return;
    }

    // Sempre abre em uma nova aba — nunca substitui a aba atual.
    let url;
    let title;
    if (looksLikeUrl(raw)) {
      url = normalizeUrl(raw);
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
      title = `Busca: ${raw}`;
    }

    if (typeof window.createTab === "function") {
      window.createTab(url, title);
    } else {
      window.open(url, "_blank");
    }

    close();
  }

  function open() {
    buildDom();
    if (isOpen) return;
    isOpen = true;
    lastFocusEl = document.activeElement;

    inputEl.value = "";
    rootEl.classList.add("is-open");
    rootEl.setAttribute("aria-hidden", "false");

    // Força o navegador a aplicar a nova classe (e a visibility resultante)
    // antes de chamar focus(). Sem isso, o input ainda está visibility:hidden
    // no momento do focus síncrono e a chamada é ignorada.
    void rootEl.offsetHeight;

    document.addEventListener("keydown", onKeydownWhileOpen, true);

    // Foco em camadas para vencer qualquer disputa:
    //   1) imediato (mesmo tick do keydown que abriu o atalho)
    //   2) próximo frame (após o navegador aplicar `is-open` e o pointer-events)
    //   3) depois de 80ms (após a transição CSS começar)
    // Se algum nível já fixou o foco, os próximos viram no-op.
    focusInput();
    requestAnimationFrame(focusInput);
    setTimeout(focusInput, 80);
  }

  function focusInput() {
    if (!isOpen || !inputEl) return;
    if (document.activeElement === inputEl) return;
    try { inputEl.focus({ preventScroll: true }); } catch (_) { inputEl.focus(); }
    try { inputEl.select(); } catch (_) { /* ignore */ }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    rootEl.classList.remove("is-open");
    rootEl.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydownWhileOpen, true);

    if (inputEl) inputEl.value = "";
    if (lastFocusEl && typeof lastFocusEl.focus === "function") {
      try { lastFocusEl.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    }
    lastFocusEl = null;
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function onKeydownWhileOpen(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  window.SearchPalette = { open, close, toggle, get isOpen() { return isOpen; } };

  // Auto-registra no ShortcutManager assim que ele estiver disponível.
  function tryRegister() {
    if (!window.ShortcutManager) {
      setTimeout(tryRegister, 50);
      return;
    }
    window.ShortcutManager.register({
      id: "search-palette",
      label: "Abrir paleta de busca",
      description:
        "Abre uma barra de pesquisa flutuante no centro da tela. " +
        "Aceita texto (busca no Google) ou URL (abre como nova aba). " +
        "Esc ou clique fora cancela sem buscar.",
      defaultKeys: "Ctrl+Space",
      category: "Navegação",
      handler: () => toggle(),
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryRegister);
  } else {
    tryRegister();
  }
})();
