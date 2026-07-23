/**
 * Customise — Janelas: editor com preview em destaque.
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  const { Keys, EditorFactory, Store } = NS;
  if (!Keys?.JANELAS || !EditorFactory || EditorFactory.has?.(Keys.JANELAS)) return;

  function read() {
    return Store?.getRecord?.(Keys.JANELAS) || window.JanelasNS?.createDefaults?.() || {};
  }

  function write(patch) {
    return Store?.updateRecord?.(Keys.JANELAS, patch);
  }

  function radioCards(name, options, current, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'customise-janelas-cards';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'customise-janelas-card' + (current === opt.id ? ' is-active' : '');
      btn.dataset.value = opt.id;
      btn.innerHTML = `<span class="customise-janelas-card__label">${opt.label}</span>`;
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.customise-janelas-card').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        onChange(opt.id);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function checkbox(labelText, checked, onChange) {
    const label = document.createElement('label');
    label.className = 'customise-janelas-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(checked);
    input.addEventListener('change', () => onChange(input.checked));
    label.appendChild(input);
    label.appendChild(document.createTextNode(labelText));
    return label;
  }

  function sectionTitle(text) {
    const h = document.createElement('h4');
    h.className = 'customise-janelas-section-title';
    h.textContent = text;
    return h;
  }

  function renderPane(body, paneId, record, refreshPreview) {
    body.innerHTML = '';
    const meta = NS.JanelasComponent || {};

    if (paneId === 'window') {
      body.appendChild(sectionTitle('Estilo da janela'));
      body.appendChild(
        radioCards(
          'janelas-window-layout',
          meta.WINDOW_LAYOUTS || [],
          record.windowLayout || 'standard',
          (id) => {
            write({ windowLayout: id });
            refreshPreview();
          }
        )
      );
      const hint = document.createElement('p');
      hint.className = 'customise-janelas-hint';
      hint.textContent =
        'Flutuante aplica espaçamento e cantos só na área de conteúdo — a barra de abas permanece normal. Na New Tab o wallpaper aparece com borda em blur.';
      body.appendChild(hint);
      return;
    }

    if (paneId === 'multi') {
      body.appendChild(sectionTitle('Multijanelas'));
      body.appendChild(
        radioCards(
          'janelas-multi-layout',
          meta.MULTI_LAYOUTS || [],
          record.multiLayout || 'standard',
          (id) => {
            write({ multiLayout: id });
            refreshPreview();
          }
        )
      );
      const hint = document.createElement('p');
      hint.className = 'customise-janelas-hint';
      hint.textContent =
        'No modo flutuante, cada painel da divisão ganha cantos e sombra — sem alterar as abas.';
      body.appendChild(hint);
      return;
    }

    body.appendChild(sectionTitle('Bordas'));
    body.appendChild(
      checkbox('Bordas entre a janela', record.borders, (v) => {
        write({ borders: v });
        refreshPreview();
      })
    );
    body.appendChild(
      checkbox('Bordas animadas', record.bordersAnimated, (v) => {
        write({ bordersAnimated: v });
        refreshPreview();
      })
    );
    body.appendChild(
      checkbox('Bordas RGB', record.bordersRgb, (v) => {
        write({ bordersRgb: v });
        refreshPreview();
      })
    );

    body.appendChild(sectionTitle('Animação de transição'));
    const animHint = document.createElement('p');
    animHint.className = 'customise-janelas-hint';
    animHint.textContent =
      'Em janela padrão: giro / arquivo. Em flutuante: soft-scale e float-drop (variantes próprias).';
    body.appendChild(animHint);
    body.appendChild(
      radioCards(
        'janelas-tab-transition',
        meta.TAB_TRANSITIONS || [],
        record.tabTransition || 'none',
        (id) => {
          write({ tabTransition: id });
          refreshPreview();
        }
      )
    );
  }

  EditorFactory.register(Keys.JANELAS, {
    label: 'Janelas',
    render(body, infoEl) {
      let pane = 'window';
      body.classList.add('customise-janelas-editor');

      const stageHost = document.createElement('div');
      stageHost.className = 'customise-janelas-preview-pane';

      const tabsEl = document.createElement('div');
      tabsEl.className = 'customise-janelas-tabs';

      const contentEl = document.createElement('div');
      contentEl.className = 'customise-janelas-body';

      const refreshPreview = () => {
        const record = read() || {};
        NS.JanelasPreview?.paint?.(stageHost, record);
        if (infoEl) {
          infoEl.textContent = 'Pré-visualização ao vivo dos layouts e animações.';
        }
      };

      const paint = () => {
        const record = read() || {};
        renderPane(contentEl, pane, record, refreshPreview);
        refreshPreview();
      };

      [
        { id: 'window', label: 'Janela' },
        { id: 'multi', label: 'Multi' },
        { id: 'geral', label: 'Geral' },
      ].forEach((t) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = t.label;
        btn.className = 'customise-janelas-tab';
        btn.addEventListener('click', () => {
          pane = t.id;
          tabsEl.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          paint();
        });
        if (t.id === pane) btn.classList.add('active');
        tabsEl.appendChild(btn);
      });

      body.appendChild(stageHost);
      body.appendChild(tabsEl);
      body.appendChild(contentEl);
      paint();
    },
  });
})();
