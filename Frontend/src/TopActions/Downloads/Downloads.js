/**
 * Botão Downloads — tela fullscreen + animação de download + spinner.
 */
(function () {
  let activeCount = 0;
  let spinnerEl = null;
  let bound = false;

  function ensureSpinner() {
    const btn = document.getElementById('downloadBtn');
    if (!btn) return null;
    if (spinnerEl && spinnerEl.isConnected) return spinnerEl;

    let wrap = btn.parentElement;
    if (!wrap || !wrap.classList.contains('download-btn-wrap')) {
      wrap = document.createElement('div');
      wrap.className = 'download-btn-wrap';
      btn.parentElement?.insertBefore(wrap, btn);
      wrap.appendChild(btn);
    }

    spinnerEl = wrap.querySelector('.download-btn__spinner');
    if (!spinnerEl) {
      spinnerEl = document.createElement('span');
      spinnerEl.className = 'download-btn__spinner';
      spinnerEl.setAttribute('aria-hidden', 'true');
      spinnerEl.hidden = true;
      wrap.insertBefore(spinnerEl, btn);
    }
    return spinnerEl;
  }

  function setDownloading(active) {
    const spinner = ensureSpinner();
    if (!spinner) return;
    spinner.hidden = !active;
    const wrap = spinner.parentElement;
    wrap?.classList.toggle('is-downloading', active);
  }

  function onDownloadEvent(payload) {
    if (!payload) return;
    if (payload.type === 'start') {
      activeCount = Math.max(activeCount + 1, Number(payload.activeCount) || activeCount + 1);
      setDownloading(activeCount > 0);
    } else if (payload.type === 'done') {
      activeCount = Math.max(
        0,
        Number.isFinite(payload.activeCount) ? payload.activeCount : activeCount - 1
      );
      setDownloading(activeCount > 0);
    }
  }

  /**
   * Ícone voa do clique até o botão de Downloads.
   * @param {{ x: number, y: number }|null} from
   * @param {string} [imageUrl]
   */
  function playFlyAnimation(from, imageUrl) {
    const btn = document.getElementById('downloadBtn');
    if (!btn || !from || !Number.isFinite(from.x) || !Number.isFinite(from.y)) return;

    ensureSpinner();
    const dest = btn.getBoundingClientRect();
    const toX = dest.left + dest.width / 2;
    const toY = dest.top + dest.height / 2;

    const ghost = document.createElement('div');
    ghost.className = 'download-fly-ghost';
    ghost.setAttribute('aria-hidden', 'true');

    if (imageUrl && /^https?:/i.test(imageUrl)) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = '';
      img.draggable = false;
      ghost.appendChild(img);
    } else {
      ghost.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      `;
    }

    ghost.style.left = `${Math.round(from.x - 16)}px`;
    ghost.style.top = `${Math.round(from.y - 16)}px`;
    document.body.appendChild(ghost);

    // Força layout antes da transição.
    void ghost.offsetWidth;
    ghost.classList.add('is-flying');
    ghost.style.left = `${Math.round(toX - 16)}px`;
    ghost.style.top = `${Math.round(toY - 16)}px`;

    const cleanup = () => {
      ghost.remove();
      btn.classList.add('download-btn--pulse');
      window.setTimeout(() => btn.classList.remove('download-btn--pulse'), 420);
    };
    ghost.addEventListener('transitionend', cleanup, { once: true });
    window.setTimeout(cleanup, 700);
  }

  function init() {
    const downloadBtn = document.getElementById('downloadBtn');
    if (!downloadBtn) return;

    ensureSpinner();

    downloadBtn.addEventListener('click', () => {
      if (window.DownloadsScreen && typeof window.DownloadsScreen.open === 'function') {
        window.DownloadsScreen.open();
      }
    });

    if (!bound && window.DragonDownloads?.onEvent) {
      bound = true;
      window.DragonDownloads.onEvent(onDownloadEvent);
    }
  }

  window.TopDownloads = {
    init,
    playFlyAnimation,
    setDownloading,
  };
})();
