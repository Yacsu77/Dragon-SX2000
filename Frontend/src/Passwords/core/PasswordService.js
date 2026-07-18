/**
 * PasswordService — orquestra UC1–4 via Observer (sem UI acoplada).
 */
(function () {
  if (window.PasswordService) return;

  let activeTabId = null;
  let lastForm = null;
  let bound = false;
  let lastSavePromptKey = '';
  let lastSavePromptAt = 0;
  /** @type {null | { origin, username, password, formType, source, at, tabId }} */
  let pendingAttempt = null;
  let pendingTimer = null;
  let armedNavigation = null;
  const autoAttempts = new Map();

  function isActiveTab(detail) {
    if (!detail?.tabId) return true;
    const current =
      window.TabsState?.currentActiveTab ||
      window.currentActiveTab ||
      null;
    return !current || detail.tabId === current;
  }

  function siteOf(origin) {
    return window.PasswordVaultAdapter?.siteLabel?.(origin) || origin || 'site';
  }

  function normalizeLoginUrl(input) {
    try {
      const url = new URL(input);
      const path = url.pathname.replace(/\/+$/, '') || '/';
      return `${url.protocol}//${url.host}${path}`;
    } catch (_) {
      return '';
    }
  }

  async function useCredential(item, options = {}) {
    if (!item?.id || !window.PasswordVaultAdapter || !window.PasswordWebviewAdapter) return false;
    const unlocked = await window.PasswordVaultAdapter.ensureUnlocked?.();
    if (!unlocked) return false;
    try {
      const revealed = await window.PasswordVaultAdapter.reveal(item.id);
      const username = revealed?.username || item.username || '';
      const password = revealed?.password || '';
      if (!password) return false;
      const ok = await window.PasswordWebviewAdapter.fillAndSubmitActive(username, password);
      if (ok) {
        window.PasswordBus.notify('credentials:filled', {
          id: item.id,
          origin: item.origin,
          automatic: Boolean(options.automatic),
        });
        window.PasswordBus.notify('indicator:used', { origin: item.origin });
      }
      return ok;
    } catch (_) {
      return false;
    }
  }

  function autoCandidate(items, detail) {
    if (detail.formType !== 'login') return null;
    let currentOrigin = '';
    try {
      currentOrigin = new URL(detail.href || detail.origin).origin;
    } catch (_) { /* keep empty */ }
    const armed =
      armedNavigation &&
      Date.now() < armedNavigation.expiresAt &&
      armedNavigation.origin === currentOrigin;
    const currentUrl = normalizeLoginUrl(detail.href);
    const eligible = items.filter((item) => {
      if (armed) return true;
      const meta = item.meta || {};
      if (meta.autoLoginUrl && normalizeLoginUrl(meta.loginUrl) === currentUrl) return true;
      return meta.autoLoginForm === true;
    });
    return eligible.length === 1 ? eligible[0] : null;
  }

  function armForNavigation(url) {
    try {
      armedNavigation = {
        origin: new URL(url).origin,
        expiresAt: Date.now() + 20000,
      };
      return true;
    } catch (_) {
      armedNavigation = null;
      return false;
    }
  }

  function autoAttemptKey(item, detail) {
    return `${detail.tabId || 'active'}|${item.id}|${normalizeLoginUrl(detail.href)}`;
  }

  function clearPendingAttempt() {
    pendingAttempt = null;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  async function promptSaveIfNeeded(detail) {
    if (!detail?.password) return;
    const username = String(detail.username || '').trim();
    if (!username && detail.formType !== 'signup') {
      if (String(detail.password).length < 3) return;
    }

    const key = `${detail.origin || ''}|${username.toLowerCase()}`;
    const now = Date.now();
    if (key === lastSavePromptKey && now - lastSavePromptAt < 8000) return;

    try {
      await window.PasswordVaultAdapter?.ensureUnlocked?.();
      const exists = await window.PasswordVaultAdapter?.hasCredential?.(detail.origin, username);
      if (exists) return;
    } catch (_) { /* ignore */ }

    lastSavePromptKey = key;
    lastSavePromptAt = now;

    window.PasswordBus.notify('save:prompt', {
      origin: detail.origin,
      site: siteOf(detail.origin),
      username,
      password: detail.password,
      formType: detail.formType || 'login',
      tabId: detail.tabId,
      source: detail.source || 'submit',
      href: detail.href || '',
    });
  }

  async function onFormDetected(detail) {
    if (!isActiveTab(detail)) return;
    lastForm = detail;

    // Ainda no form após tentativa → provável senha errada; cancela save.
    if (pendingAttempt && Date.now() - pendingAttempt.at < 12000) {
      clearPendingAttempt();
    }

    window.PasswordBus.notify('indicator:show', {
      reason: 'form',
      origin: detail.origin,
      formType: detail.formType,
      tabId: detail.tabId,
    });

    const origin = detail.origin;
    if (!origin || !window.PasswordVaultAdapter) return;

    await window.PasswordVaultAdapter.ensureUnlocked?.();

    try {
      const items = await window.PasswordVaultAdapter.listByOrigin(origin);
      if (!isActiveTab(detail)) return;
      if (items.length) {
        const candidate = autoCandidate(items, detail);
        if (candidate) {
          const attemptKey = autoAttemptKey(candidate, detail);
          const lastAttempt = autoAttempts.get(attemptKey) || 0;
          if (Date.now() - lastAttempt > 30000) {
            autoAttempts.set(attemptKey, Date.now());
            if (await useCredential(candidate, { automatic: true })) {
              armedNavigation = null;
              return;
            }
          }
        }
        window.PasswordBus.notify('credentials:candidates', {
          origin,
          site: siteOf(origin),
          items,
          formType: detail.formType,
          tabId: detail.tabId,
          href: detail.href,
        });
      }
    } catch (_) { /* ignore */ }
  }

  function onFormGone(detail) {
    if (!isActiveTab(detail)) return;
    lastForm = null;
    window.PasswordBus.notify('indicator:hide', {
      reason: detail?.reason || 'gone',
      tabId: detail?.tabId,
    });

    // Form sumiu após tentativa recente → login provavelmente ok (SPA).
    if (pendingAttempt && Date.now() - pendingAttempt.at < 12000) {
      const attempt = pendingAttempt;
      clearPendingAttempt();
      promptSaveIfNeeded({ ...attempt, confirmed: true });
    }
  }

  function onSessionAuthenticated(detail) {
    lastForm = null;
    window.PasswordBus.notify('indicator:hide', {
      reason: 'authenticated',
      tabId: detail?.tabId,
    });
  }

  function onAttempt(detail) {
    if (!isActiveTab(detail)) return;
    if (!detail?.password) return;
    pendingAttempt = {
      origin: detail.origin,
      username: String(detail.username || '').trim(),
      password: detail.password,
      formType: detail.formType || 'login',
      source: detail.source || 'submit',
      tabId: detail.tabId,
      href: detail.href || '',
      at: Date.now(),
    };
    if (pendingTimer) clearTimeout(pendingTimer);
    // Timeout: se o form continuar na tela, assume falha.
    pendingTimer = setTimeout(() => {
      clearPendingAttempt();
    }, 12000);
  }

  async function onSubmitted(detail) {
    if (!isActiveTab(detail)) return;
    if (!detail?.password) return;
    if (detail.confirmed !== true) return;
    clearPendingAttempt();
    await promptSaveIfNeeded(detail);
  }

  /** Chamado pelo adapter quando a navegação do webview indica sucesso. */
  function onNavigationAfterAttempt(detail) {
    if (!pendingAttempt) return;
    if (!isActiveTab(detail)) return;
    if (Date.now() - pendingAttempt.at > 12000) {
      clearPendingAttempt();
      return;
    }
    const attempt = pendingAttempt;
    clearPendingAttempt();
    promptSaveIfNeeded({ ...attempt, confirmed: true, tabId: detail?.tabId });
  }

  function onTabChanged(event) {
    activeTabId = event?.detail?.tabId || null;
    lastForm = null;
    clearPendingAttempt();
    window.PasswordBus.notify('indicator:hide', { reason: 'tab-changed' });
  }

  function onUserChanged() {
    window.PasswordCache?.clear?.();
    lastForm = null;
    clearPendingAttempt();
    autoAttempts.clear();
    armedNavigation = null;
    window.PasswordBus.notify('indicator:hide', { reason: 'user-changed' });
    window.PasswordBus.notify('vault:locked', {});
  }

  function bind() {
    if (bound || !window.PasswordBus) return;
    bound = true;
    window.PasswordBus.subscribe('form:detected', onFormDetected);
    window.PasswordBus.subscribe('form:gone', onFormGone);
    window.PasswordBus.subscribe('session:authenticated', onSessionAuthenticated);
    window.PasswordBus.subscribe('credentials:attempt', onAttempt);
    window.PasswordBus.subscribe('credentials:submitted', onSubmitted);
    window.PasswordBus.subscribe('credentials:login-navigated', onNavigationAfterAttempt);
    window.PasswordBus.subscribe('indicator:used', () => {
      window.PasswordBus.notify('indicator:hide', { reason: 'used' });
    });
    document.addEventListener('app:tab-changed', onTabChanged);
    document.addEventListener('user:changed', onUserChanged);
  }

  window.PasswordService = {
    init: bind,
    getLastForm: () => lastForm,
    getActiveTabId: () => activeTabId,
    hasPendingAttempt: () => Boolean(pendingAttempt),
    useCredential,
    normalizeLoginUrl,
    armForNavigation,
  };
})();
