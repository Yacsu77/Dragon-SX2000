/**
 * Indicador 3×3 fora da busca + popovers (site + usuário, sem Editar).
 */
(function () {
  if (window.PasswordIndicator) return;

  let rootBtn = null;
  let popoverRoot = null;
  let suggestEl = null;
  let saveEl = null;
  let bound = false;

  const LOCK_ICON = `
    <svg class="password-popover__lock-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  `;

  function siteOf(origin) {
    return window.PasswordVaultAdapter?.siteLabel?.(origin) || 'site';
  }

  function escapeHtml(value) {
    const el = document.createElement('div');
    el.textContent = String(value || '');
    return el.innerHTML;
  }

  function ensureDom() {
    const wrap = document.querySelector('.nav-search-wrap') || document.querySelector('.nav-center');
    if (!wrap) return false;

    rootBtn = document.getElementById('passwordIndicator');
    if (!rootBtn) {
      rootBtn = document.createElement('button');
      rootBtn.type = 'button';
      rootBtn.id = 'passwordIndicator';
      rootBtn.className = 'password-indicator';
      rootBtn.hidden = true;
      rootBtn.setAttribute('aria-label', 'Senhas');
      rootBtn.title = 'Senhas';
      rootBtn.innerHTML = `
        <span class="password-indicator__dots" aria-hidden="true">
          ${Array.from({ length: 9 }, () => '<i></i>').join('')}
        </span>
      `;
      wrap.appendChild(rootBtn);
    } else if (rootBtn.parentElement?.id === 'addressBar' && wrap !== rootBtn.parentElement) {
      wrap.appendChild(rootBtn);
    }

    popoverRoot = document.getElementById('passwordPopoverRoot');
    if (!popoverRoot) {
      popoverRoot = document.createElement('div');
      popoverRoot.id = 'passwordPopoverRoot';
      popoverRoot.className = 'password-popover-root';
      document.body.appendChild(popoverRoot);
    }
    return true;
  }

  function setVisible(visible, mode) {
    if (!ensureDom()) return;
    rootBtn.hidden = !visible;
    rootBtn.classList.toggle('is-animated', Boolean(visible));
    rootBtn.classList.toggle('is-suggest', mode === 'suggest');
    rootBtn.classList.toggle('is-save', mode === 'save');
    if (!visible) closePopovers();
  }

  function closePopovers() {
    if (suggestEl) {
      suggestEl.remove();
      suggestEl = null;
    }
    if (saveEl) {
      saveEl.remove();
      saveEl = null;
    }
  }

  function positionPopover(el) {
    if (!el || !rootBtn) return;
    const btnRect = rootBtn.getBoundingClientRect();
    const tabsBar = document.querySelector('.tabs-bar');
    const navBar = document.querySelector('.nav-bar');
    let top = btnRect.bottom + 8;
    if (tabsBar && !tabsBar.classList.contains('hidden')) {
      top = Math.max(top, tabsBar.getBoundingClientRect().bottom + 8);
    }
    if (navBar) {
      top = Math.max(top, navBar.getBoundingClientRect().bottom + 8);
    }
    el.style.top = `${Math.round(top)}px`;
    el.style.right = `${Math.max(8, Math.round(window.innerWidth - btnRect.right))}px`;
    el.style.left = 'auto';
  }

  async function withVault(action) {
    if (window.PasswordVaultAdapter?.isUnlocked?.()) return action();
    const ok = await window.PasswordVaultAdapter?.ensureUnlocked?.();
    if (!ok) {
      window.PasswordBus?.notify('vault:locked', { action: 'password-flow' });
      return false;
    }
    return action();
  }

  function renderSuggest(detail) {
    if (!ensureDom()) return;
    // Não sobrescrever o prompt de salvar.
    if (saveEl) return;
    closePopovers();
    const items = Array.isArray(detail?.items) ? detail.items : [];
    if (!items.length) {
      setVisible(true, 'idle-form');
      return;
    }

    const site = detail.site || siteOf(detail.origin);
    setVisible(true, 'suggest');
    suggestEl = document.createElement('div');
    suggestEl.className = 'password-popover password-popover--suggest';
    suggestEl.innerHTML = `
      <div class="password-popover__eyebrow">Recomendação de senha</div>
      <ul class="password-popover__list">
        ${items
          .map(
            (item) => `
          <li>
            <button type="button" class="password-popover__item password-popover__item--row" data-role="use" data-vault-id="${item.id}">
              <span class="password-popover__lock">${LOCK_ICON}</span>
              <span class="password-popover__copy">
                <span class="password-popover__site">${escapeHtml(site)}</span>
                <span class="password-popover__preview">${escapeHtml(item.usernamePreview || item.username || '…')}</span>
              </span>
            </button>
          </li>
        `
          )
          .join('')}
      </ul>
    `;
    popoverRoot.appendChild(suggestEl);
    positionPopover(suggestEl);

    suggestEl.querySelectorAll('[data-role="use"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-vault-id');
        const item = items.find((entry) => entry.id === id);
        await withVault(() => window.PasswordService?.useCredential?.(item));
      });
    });
  }

  function renderSave(detail) {
    if (!ensureDom()) return;
    closePopovers();
    setVisible(true, 'save');
    const site = detail.site || siteOf(detail.origin);
    const username = String(detail.username || '').trim() || 'Conta';
    saveEl = document.createElement('div');
    saveEl.className = 'password-popover password-popover--save';
    saveEl.innerHTML = `
      <div class="password-popover__eyebrow">Salvar senha</div>
      <div class="password-popover__identity">
        <span class="password-popover__lock">${LOCK_ICON}</span>
        <div class="password-popover__copy">
          <p class="password-popover__site">${escapeHtml(site)}</p>
          <p class="password-popover__account">${escapeHtml(username)}</p>
        </div>
      </div>
      <p class="password-popover__hint" data-role="hint" hidden></p>
      <div class="password-popover__actions password-popover__actions--save">
        <button type="button" class="password-popover__save-primary" data-role="save">Salvar senha</button>
        <button type="button" data-role="decline">Não</button>
      </div>
    `;
    popoverRoot.appendChild(saveEl);
    positionPopover(saveEl);

    const hint = saveEl.querySelector('[data-role="hint"]');

    saveEl.querySelector('[data-role="save"]')?.addEventListener('click', async () => {
      const btn = saveEl.querySelector('[data-role="save"]');
      if (btn) btn.disabled = true;
      if (hint) {
        hint.hidden = true;
        hint.textContent = '';
      }
      const ok = await withVault(async () => {
        try {
          await window.PasswordVaultAdapter.create({
            origin: detail.origin,
            username: detail.username,
            password: detail.password,
            meta: {
              formType: detail.formType || 'login',
              source: 'autofill-prompt',
              loginUrl: detail.href || null,
              autoLoginForm: false,
              autoLoginUrl: false,
            },
          });
          window.PasswordBus?.notify('save:accepted', detail);
          closePopovers();
          setVisible(false);
          return true;
        } catch (err) {
          if (hint) {
            hint.hidden = false;
            hint.textContent = 'Não foi possível salvar. Desbloqueie o cofre e tente de novo.';
          }
          return false;
        }
      });
      if (!ok && btn && saveEl) btn.disabled = false;
    });

    saveEl.querySelector('[data-role="decline"]')?.addEventListener('click', () => {
      window.PasswordCache?.set?.(detail.origin, {
        username: detail.username,
        password: detail.password,
        formType: detail.formType,
      });
      window.PasswordBus?.notify('save:declined', detail);
      closePopovers();
      setVisible(false);
    });
  }

  function onSaveCancel() {
    if (!saveEl) return;
    closePopovers();
    if (rootBtn && !rootBtn.hidden) {
      rootBtn.classList.remove('is-save');
    }
  }

  function bind() {
    if (bound || !window.PasswordBus) return;
    bound = true;
    ensureDom();

    window.PasswordBus.subscribe('indicator:show', () => setVisible(true, 'idle-form'));
    window.PasswordBus.subscribe('indicator:hide', () => setVisible(false));
    window.PasswordBus.subscribe('credentials:candidates', renderSuggest);
    window.PasswordBus.subscribe('save:prompt', renderSave);
    window.PasswordBus.subscribe('save:cancel', onSaveCancel);

    rootBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (suggestEl || saveEl) {
        closePopovers();
        return;
      }
      const last = window.PasswordService?.getLastForm?.();
      if (last?.origin && window.PasswordVaultAdapter) {
        window.PasswordVaultAdapter.listByOrigin(last.origin).then((items) => {
          if (items.length) {
            window.PasswordBus.notify('credentials:candidates', {
              origin: last.origin,
              site: siteOf(last.origin),
              items,
              formType: last.formType,
              href: last.href,
            });
          }
        });
      }
    });

    window.addEventListener('resize', () => {
      if (suggestEl) positionPopover(suggestEl);
      if (saveEl) positionPopover(saveEl);
    });

    document.addEventListener('click', (event) => {
      if (!suggestEl && !saveEl) return;
      const t = event.target;
      if (rootBtn?.contains(t) || suggestEl?.contains(t) || saveEl?.contains(t)) return;
      closePopovers();
    });
  }

  window.PasswordIndicator = {
    init: bind,
    dismiss() {
      closePopovers();
      setVisible(false);
    },
  };
})();
