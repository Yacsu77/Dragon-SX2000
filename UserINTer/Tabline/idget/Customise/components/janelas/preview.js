/**
 * Customise — Janelas: preview visual ao vivo (chrome mock).
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});

  function animLabel(id) {
    const list = NS.JanelasComponent?.TAB_TRANSITIONS || [];
    return list.find((t) => t.id === id)?.label || id || 'Sem animação';
  }

  function paint(el, record) {
    if (!el) return;
    const r = record || {};
    const floating = r.windowLayout === 'floating';
    const multiFloating = r.multiLayout === 'floating';
    const multi = true; // sempre mostra duas “páginas” no mock multi

    el.className = 'customise-janelas-preview';
    el.innerHTML = `
      <div class="customise-janelas-stage" aria-hidden="true">
        <div class="janelas-mock ${floating ? 'is-floating' : 'is-standard'} ${
          multiFloating ? 'is-multi-floating' : ''
        } ${r.borders ? 'has-borders' : ''} ${
          r.bordersAnimated ? 'has-borders-animated' : ''
        } ${r.bordersRgb ? 'has-borders-rgb' : ''}">
          <div class="janelas-mock__chrome">
            <div class="janelas-mock__traffic">
              <span></span><span></span><span></span>
            </div>
            <div class="janelas-mock__title">Dragon SX2000</div>
          </div>
          <div class="janelas-mock__tabs">
            <div class="janelas-mock__tab is-active">Início</div>
            <div class="janelas-mock__tab">Pesquisa</div>
            <div class="janelas-mock__tab">Docs</div>
            <div class="janelas-mock__new">+</div>
          </div>
          <div class="janelas-mock__body">
            <aside class="janelas-mock__side">
              <i></i><i></i><i></i>
            </aside>
            <div class="janelas-mock__viewport ${multiFloating || floating ? 'is-inset' : ''}">
              <div class="janelas-mock__pane ${r.tabTransition !== 'none' ? 'anim-' + (r.tabTransition || 'none') : ''}">
                <div class="janelas-mock__search">
                  <span class="janelas-mock__search-dot"></span>
                  <span class="janelas-mock__search-line"></span>
                </div>
                <div class="janelas-mock__cards">
                  <span></span><span></span><span></span>
                </div>
              </div>
              ${
                multi
                  ? `<div class="janelas-mock__pane janelas-mock__pane--secondary ${
                      multiFloating ? 'is-floating-pane' : ''
                    }">
                      <div class="janelas-mock__lines">
                        <span></span><span></span><span></span>
                      </div>
                    </div>`
                  : ''
              }
            </div>
          </div>
        </div>
        <p class="customise-janelas-preview__caption">
          ${floating ? 'Janela flutuante' : 'Janela padrão'}
          · ${multiFloating ? 'Multi flutuante' : 'Multi padrão'}
          · ${animLabel(r.tabTransition)}
        </p>
      </div>
    `;
  }

  NS.JanelasPreview = { paint };
})();
