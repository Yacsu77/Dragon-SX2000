/**
 * Tela fullscreen de gerenciamento de arquivos locais.
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Arquivos/Arquivos.html';

  let overlayEl = null;
  let listEl = null;
  let emptyEl = null;
  let errorEl = null;
  let breadcrumbEl = null;
  let currentPath = '';
  let isOpen = false;
  let isBuilt = false;

  function hasFilesApi() {
    return window.DragonFiles && typeof window.DragonFiles.readDir === 'function';
  }

  async function getInitialPath() {
    if (hasFilesApi()) {
      return window.DragonFiles.getHome();
    }
    return null;
  }

  function renderBreadcrumb(path) {
    if (!breadcrumbEl) return;
    breadcrumbEl.innerHTML = '';

    if (!path) {
      breadcrumbEl.textContent = '—';
      return;
    }

    const isWin = path.includes('\\');
    const parts = path.split(isWin ? '\\' : '/').filter(Boolean);
    let acc = isWin ? '' : '/';

    parts.forEach((part, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'arquivos-breadcrumb__sep';
        sep.textContent = isWin ? '\\' : '/';
        breadcrumbEl.appendChild(sep);
      }

      if (isWin) {
        acc = index === 0 ? `${part}\\` : `${acc}${part}\\`;
      } else {
        acc = index === 0 ? `/${part}` : `${acc}/${part}`;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'arquivos-breadcrumb__part';
      btn.textContent = part;
      const target = acc.replace(/[\\/]+$/, '') || acc;
      btn.addEventListener('click', () => loadPath(target));
      breadcrumbEl.appendChild(btn);
    });
  }

  async function loadPath(path) {
    if (!hasFilesApi()) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = 'API de arquivos indisponível (abra no Electron).';
      }
      return;
    }

    currentPath = path;
    renderBreadcrumb(path);

    if (errorEl) errorEl.hidden = true;
    if (listEl) listEl.innerHTML = '';

    try {
      const entries = await window.DragonFiles.readDir(path);
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      if (emptyEl) emptyEl.hidden = sorted.length > 0;

      sorted.forEach((entry) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'arquivos-item';
        btn.innerHTML = `
          <span class="arquivos-item__icon" aria-hidden="true">${entry.isDirectory ? '📁' : '📄'}</span>
          <span class="arquivos-item__name">${escapeHtml(entry.name)}</span>
        `;

        btn.addEventListener('click', () => {
          if (entry.isDirectory) {
            loadPath(entry.path);
          } else if (typeof window.createTab === 'function') {
            window.createTab(`file://${entry.path}`, entry.name);
            close();
          }
        });

        li.appendChild(btn);
        listEl.appendChild(li);
      });
    } catch (err) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = err.message || 'Não foi possível ler a pasta.';
      }
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'arquivos-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    listEl = overlayEl.querySelector('[data-role="list"]');
    emptyEl = overlayEl.querySelector('[data-role="empty"]');
    errorEl = overlayEl.querySelector('[data-role="error"]');
    breadcrumbEl = overlayEl.querySelector('[data-role="breadcrumb"]');

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.querySelector('[data-role="pick-folder"]').addEventListener('click', async () => {
      if (!hasFilesApi()) return;
      const picked = await window.DragonFiles.pickFolder();
      if (picked) loadPath(picked);
    });

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  async function open() {
    await ensureBuilt();
    isOpen = true;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');

    const initial = currentPath || await getInitialPath();
    if (initial) await loadPath(initial);
    else if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = 'API de arquivos indisponível (abra no Electron).';
    }
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  window.ArquivosScreen = { open, close };
})();
