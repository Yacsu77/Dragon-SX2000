/**
 * Indicador 3×3 fora da busca + popovers (só nome do site).
 */
(function () {
  if (window.PasswordIndicator) return;

  let rootBtn = null;
  let popoverRoot = null;
  let suggestEl = null;
  let saveEl = null;
  let bound = false;

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

  function renderCredentialSettings(detail, item) {
    if (!suggestEl || !item) return;
    const meta = item.meta || {};
    const mode = meta.autoLoginForm ? 'form' : meta.autoLoginUrl ? 'url' : 'manual';
    suggestEl.innerHTML = `
      <div class="password-popover__eyebrow">Editar login</div>
      <p class="password-popover__site">${escapeHtml(detail.site || siteOf(detail.origin))}</p>
      <p class="password-popover__account">${escapeHtml(item.usernamePreview || 'Conta salva')}</p>
      <fieldset class="password-popover__modes">
        <label>
          <input type="radio" name="password-auto-mode" value="manual" ${mode === 'manual' ? 'checked' : ''}>
          <span><strong>Ao selecionar</strong><small>Preenche e entra quando você escolher a conta.</small></span>
        </label>
        <label>
          <input type="radio" name="password-auto-mode" value="form" ${mode === 'form' ? 'checked' : ''}>
          <span><strong>Automático por formulário</strong><small>Entra ao detectar um login neste site.</small></span>
        </label>
        <label>
          <input type="radio" name="password-auto-mode" value="url" ${mode === 'url' ? 'checked' : ''}>
          <span><strong>Automático nesta URL</strong><small>Entra somente nesta página de login.</small></span>
        </label>
      </fieldset>
      <div class="password-popover__actions">
        <button type="button" data-role="back">Voltar</button>
        <button type="button" data-role="save-settings">Salvar</button>
      </div>
    `;
    positionPopover(suggestEl);

    suggestEl.querySelector('[data-role="back"]')?.addEventListener('click', () => renderSuggest(detail));
    suggestEl.querySelector('[data-role="save-settings"]')?.addEventListener('click', async () => {
      const selected = suggestEl.querySelector('input[name="password-auto-mode"]:checked')?.value || 'manual';
      await withVault(async () => {
        try {
          const updated = await window.PasswordVaultAdapter.updateMeta(item.id, {
            autoLoginForm: selected === 'form',
            autoLoginUrl: selected === 'url',
            loginUrl: selected === 'url' ? detail.href || meta.loginUrl || null : meta.loginUrl || null,
          });
          item.meta = updated?.meta || {
            ...meta,
            autoLoginForm: selected === 'form',
            autoLoginUrl: selected === 'url',
          };
          renderSuggest(detail);
        } catch (_) { /* ignore */ }
      });
    });
  }

  function renderSuggest(detail) {
    if (!ensureDom()) return;
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
      <div class="password-popover__eyebrow">Entrar em</div>
      <p class="password-popover__site">${escapeHtml(site)}</p>
      <ul class="password-popover__list">
        ${items
          .map(
            (item) => `
          <li>
            <div class="password-popover__item">
              <button type="button" class="password-popover__use" data-role="use" data-vault-id="${item.id}">
                <span class="password-popover__preview">${escapeHtml(item.usernamePreview || '…')}</span>
              </button>
              <button type="button" class="password-popover__edit" data-role="edit" data-vault-id="${item.id}" aria-label="Editar login" title="Editar login">Editar</button>
            </div>
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
    suggestEl.querySelectorAll('[data-role="edit"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items.find((entry) => entry.id === btn.getAttribute('data-vault-id'));
        renderCredentialSettings(detail, item);
      });
    });
  }

  function renderSave(detail) {
    if (!ensureDom()) return;
    closePopovers();
    setVisible(true, 'save');
    const site = detail.site || siteOf(detail.origin);
    saveEl = document.createElement('div');
    saveEl.className = 'password-popover password-popover--save';
    saveEl.innerHTML = `
      <div class="password-popover__eyebrow">Salvar senha</div>
      <p class="password-popover__site">${escapeHtml(site)}</p>
      <div class="password-popover__actions">
        <button type="button" data-role="save">Salvar</button>
        <button type="button" data-role="decline">Não</button>
      </div>
    `;
    popoverRoot.appendChild(saveEl);
    positionPopover(saveEl);

    saveEl.querySelector('[data-role="save"]')?.addEventListener('click', async () => {
      await withVault(async () => {
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
        } catch (_) { /* ignore */ }
      });
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

  function bind() {
    if (bound || !window.PasswordBus) return;
    bound = true;
    ensureDom();

    window.PasswordBus.subscribe('indicator:show', () => setVisible(true, 'idle-form'));
    window.PasswordBus.subscribe('indicator:hide', () => setVisible(false));
    window.PasswordBus.subscribe('credentials:candidates', renderSuggest);
    window.PasswordBus.subscribe('save:prompt', renderSave);

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
