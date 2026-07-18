/**
 * Adapter — injeta detector no guest e escuta console / executeJavaScript.
 * Mais confiável que preload+DOM isolado no <webview>.
 */
(function () {
  if (window.PasswordWebviewAdapter) return;

  const PREFIX = '__DSX_PWD__';
  const attached = new WeakSet();
  const injected = new WeakSet();
  let injectSource = null;
  let injectLoading = null;

  async function loadInjectSource() {
    if (injectSource) return injectSource;
    if (injectLoading) return injectLoading;
    injectLoading = fetch('Passwords/detection/formDetector.inject.js')
      .then((res) => {
        if (!res.ok) throw new Error('inject fetch failed');
        return res.text();
      })
      .then((text) => {
        injectSource = text;
        return text;
      })
      .catch((err) => {
        console.warn('[PasswordWebviewAdapter] falha ao carregar inject:', err);
        injectLoading = null;
        return null;
      });
    return injectLoading;
  }

  function handlePayload(tabId, webview, raw) {
    if (!raw || typeof raw !== 'object' || !window.PasswordBus) return;
    const type = raw.type;
    const detail = {
      ...(raw.detail && typeof raw.detail === 'object' ? raw.detail : {}),
      tabId,
      webview,
    };

    switch (type) {
      case 'form:detected':
        window.PasswordBus.notify('form:detected', detail);
        break;
      case 'form:gone':
        window.PasswordBus.notify('form:gone', detail);
        break;
      case 'credentials:attempt':
        window.PasswordBus.notify('credentials:attempt', detail);
        break;
      case 'credentials:submitted':
        window.PasswordBus.notify('credentials:submitted', detail);
        break;
      case 'indicator:used':
        window.PasswordBus.notify('indicator:used', detail);
        break;
      case 'session:authenticated':
        window.PasswordBus.notify('session:authenticated', detail);
        break;
      default:
        break;
    }
  }

  function parseConsoleMessage(message) {
    if (typeof message !== 'string' || !message.startsWith(PREFIX)) return null;
    try {
      return JSON.parse(message.slice(PREFIX.length));
    } catch (_) {
      return null;
    }
  }

  async function inject(webview) {
    if (!webview) return false;
    const source = await loadInjectSource();
    if (!source) return false;
    try {
      await webview.executeJavaScript(source, true);
      injected.add(webview);
      return true;
    } catch (err) {
      console.warn('[PasswordWebviewAdapter] inject falhou:', err);
      return false;
    }
  }

  function applyPreload() {
    // Mantido por compat; detecção real é via inject.
    return true;
  }

  function attach(webview, tabId) {
    if (!webview || attached.has(webview)) return;
    attached.add(webview);

    webview.addEventListener('console-message', (event) => {
      const payload = parseConsoleMessage(event.message);
      if (payload) handlePayload(tabId, webview, payload);
    });

    const runInject = () =>
      inject(webview).then((ok) => {
        if (!ok) return false;
        try {
          return webview
            .executeJavaScript(
              'window.__DSX_PASSWORD__ && window.__DSX_PASSWORD__.scan && window.__DSX_PASSWORD__.scan()',
              true
            )
            .then(() => true)
            .catch(() => true);
        } catch (_) {
          return true;
        }
      });

    webview.addEventListener('did-finish-load', () => {
      runInject().then(async () => {
        if (!window.PasswordService?.hasPendingAttempt?.()) return;
        try {
          const stillLogin = await webview.executeJavaScript(
            '!!document.querySelector(\'input[type="password"]\')',
            true
          );
          if (stillLogin) return;
        } catch (_) { /* ignore */ }
        window.PasswordBus?.notify('credentials:login-navigated', { tabId, webview });
      });
    });

    webview.addEventListener('did-navigate-in-page', () => {
      runInject();
    });

    // Se já terminou de carregar antes do attach
    try {
      if (typeof webview.isLoading === 'function' && !webview.isLoading()) {
        runInject();
      }
    } catch (_) {
      setTimeout(runInject, 300);
    }
  }

  async function fillActive(username, password) {
    const webview = document.querySelector('webview.active');
    if (!webview) return false;
    await inject(webview);
    const u = JSON.stringify(String(username || ''));
    const p = JSON.stringify(String(password || ''));
    try {
      return !!(await webview.executeJavaScript(
        `window.__DSX_PASSWORD__ && window.__DSX_PASSWORD__.fill(${u}, ${p})`,
        true
      ));
    } catch (_) {
      return false;
    }
  }

  async function fillAndSubmitActive(username, password) {
    const webview = document.querySelector('webview.active');
    if (!webview) return false;
    await inject(webview);
    const u = JSON.stringify(String(username || ''));
    const p = JSON.stringify(String(password || ''));
    try {
      return !!(await webview.executeJavaScript(
        `window.__DSX_PASSWORD__ && window.__DSX_PASSWORD__.fillAndSubmit(${u}, ${p})`,
        true
      ));
    } catch (_) {
      return false;
    }
  }

  window.PasswordWebviewAdapter = {
    attach,
    applyPreload,
    fillActive,
    fillAndSubmitActive,
    inject,
  };
})();
