/**
 * Customise shell — catálogo + overlay do Factory (orquestra EditorFactory).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.Shell) return;

  const { Keys, EditorFactory } = NS;

  let catalogBound = false;
  let factoryOverlay = null;
  let activeEditor = null;
  let factoryKey = null;
  let closingCatalog = false;
  let initialized = false;
  let escapeBound = false;

  function clearCustomiseHash() {
    if (window.location.hash !== "#customise-widget") return;
    const clean = String(window.location.href || "").replace(/#customise-widget\/?$/, "");
    history.replaceState(null, "", clean || window.location.pathname);
  }

  function openCatalog() {
    if (closingCatalog) return;
    const el = document.getElementById("customise-widget");
    if (!el) return;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    if (window.location.hash !== "#customise-widget") {
      window.location.hash = "customise-widget";
    }
  }

  function closeFactory() {
    if (!factoryOverlay) return;
    const body = factoryOverlay.querySelector('[data-role="factory-body"]');
    if (activeEditor?.teardown) {
      try {
        activeEditor.teardown(body, { overlay: factoryOverlay, key: factoryKey });
      } catch (_) { /* ignore */ }
    }
    if (body) {
      body.classList.remove("customise-factory-body--topo");
      body.innerHTML = "";
    }
    factoryOverlay.classList.remove("is-open");
    factoryOverlay.classList.remove("is-topo-global");
    document.body.classList.remove("customise-topo-editing");
    factoryOverlay.style.removeProperty("--topo-clearance");
    activeEditor = null;
    factoryKey = null;
  }

  function closeCatalog() {
    closingCatalog = true;
    const el = document.getElementById("customise-widget");
    if (el) {
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
    closeFactory();
    clearCustomiseHash();
    setTimeout(() => {
      closingCatalog = false;
    }, 0);
  }

  function ensureFactoryOverlay() {
    if (factoryOverlay) return;
    factoryOverlay = document.createElement("div");
    factoryOverlay.className = "customise-factory-overlay";
    factoryOverlay.innerHTML = `
      <div class="customise-factory-modal" role="dialog" aria-modal="true" aria-label="Customise Factory">
        <div class="customise-factory-header">
          <div class="customise-factory-title-wrap">
            <h3>Customise</h3>
            <p data-role="factory-info">Objeto alvo</p>
          </div>
          <button type="button" class="customise-factory-close-btn" data-role="factory-close" aria-label="Fechar">×</button>
        </div>
        <div class="customise-factory-body" data-role="factory-body"></div>
      </div>
    `;
    document.body.appendChild(factoryOverlay);

    factoryOverlay.addEventListener("click", (event) => {
      if (event.target === factoryOverlay) closeFactory();
    });
    factoryOverlay.querySelector('[data-role="factory-close"]').addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFactory();
    });

    if (!escapeBound) {
      escapeBound = true;
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (factoryOverlay && factoryOverlay.classList.contains("is-open")) {
          event.preventDefault();
          closeFactory();
          return;
        }
        const catalog = document.getElementById("customise-widget");
        if (catalog && catalog.classList.contains("is-open")) {
          event.preventDefault();
          closeCatalog();
        }
      });
    }
  }

  function openFactory({ key, label } = {}) {
    ensureFactoryOverlay();
    closeFactory();

    factoryKey = key || Keys.RADIAL;
    const infoEl = factoryOverlay.querySelector('[data-role="factory-info"]');
    const body = factoryOverlay.querySelector('[data-role="factory-body"]');
    infoEl.textContent = label || "Objeto";
    body.classList.remove("customise-factory-body--topo");

    const editor = EditorFactory.create(factoryKey);
    activeEditor = editor;

    if (editor) {
      editor.render(body, infoEl, { overlay: factoryOverlay, key: factoryKey, label });
    } else {
      body.innerHTML = `<div class="customise-factory-controls"><p class="customise-factory-hint">Editor ainda não disponível para este objeto.</p></div>`;
    }

    factoryOverlay.classList.add("is-open");
  }

  function bindCatalogTriggers(root) {
    if (!root || catalogBound) return;
    catalogBound = true;
    root.querySelectorAll("[data-open-customise-factory]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openFactory({
          key: btn.getAttribute("data-customise-key") || Keys.RADIAL,
          label: btn.getAttribute("data-customise-label") || "Objeto",
        });
      });
    });

    root.querySelectorAll("[data-customise-close], .customise-close").forEach((closeBtn) => {
      closeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeCatalog();
      });
    });

    root.addEventListener("click", (event) => {
      if (event.target === root) closeCatalog();
    });
  }

  function bindTablineButton() {
    const btn = document.querySelector('.side-tabs .tab-item[data-idget="customise"]');
    if (!btn || btn.dataset.customiseBound === "1") return;
    btn.dataset.customiseBound = "1";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      openCatalog();
    });
  }

  function onHashChange() {
    if (closingCatalog) return;
    if (window.location.hash === "#customise-widget") {
      openCatalog();
      return;
    }
    const el = document.getElementById("customise-widget");
    if (el && el.classList.contains("is-open")) {
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
    }
  }

  function init() {
    const catalogRoot = document.getElementById("customise-widget");
    if (!catalogRoot) return false;
    bindCatalogTriggers(catalogRoot);
    bindTablineButton();
    if (!initialized) {
      initialized = true;
      onHashChange();
      window.addEventListener("hashchange", onHashChange);
    }
    return document.querySelector('.side-tabs .tab-item[data-idget="customise"]') != null;
  }

  NS.Shell = {
    init,
    openCatalog,
    closeCatalog,
    openFactory,
    closeFactory,
  };
})();
