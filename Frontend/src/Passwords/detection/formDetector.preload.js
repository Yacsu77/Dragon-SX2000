/**
 * Guest preload — detecta formulários de login/cadastro e envia ao host.
 * webview: contextIsolation=no no guest para o preload acessar o DOM;
 * nodeIntegration permanece off na página.
 */
(function () {
  const { ipcRenderer } = require('electron');

  const CHANNEL = 'dsx-password';
  let lastSignature = '';
  let usedInVisit = false;

  function emit(type, detail) {
    try {
      ipcRenderer.sendToHost(CHANNEL, { type, detail: detail || {} });
    } catch (_) { /* ignore */ }
  }

  function originOf() {
    try {
      return `${location.protocol}//${location.host}`;
    } catch (_) {
      return null;
    }
  }

  function isVisible(el) {
    if (!el || el.disabled) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findPasswordInputs(root) {
    return Array.from(root.querySelectorAll('input[type="password"]')).filter(isVisible);
  }

  function findIdentityInput(scope) {
    const selectors = [
      'input[type="email"]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
      'input[name*="user" i]',
      'input[name*="email" i]',
      'input[name*="login" i]',
      'input[type="text"]',
    ];
    for (const sel of selectors) {
      const el = scope.querySelector(sel);
      if (el && isVisible(el) && el.type !== 'password') return el;
    }
    return null;
  }

  function classify(passwords) {
    if (!passwords.length) return null;
    if (passwords.length >= 2) return 'signup';
    const first = passwords[0];
    const ac = String(first.getAttribute('autocomplete') || '').toLowerCase();
    if (ac.includes('new-password')) return 'signup';
    return 'login';
  }

  function scan() {
    if (usedInVisit) return { kind: 'used' };

    const passwords = findPasswordInputs(document);
    if (!passwords.length) {
      return { kind: 'none' };
    }

    const form =
      passwords[0].closest('form') ||
      passwords[0].parentElement ||
      document.body;
    const formType = classify(passwords);
    const identity = findIdentityInput(form);
    const origin = originOf();
    const signature = [
      origin,
      formType,
      passwords.length,
      identity ? identity.name || identity.id || 'id' : 'none',
    ].join('|');

    return {
      kind: 'form',
      origin,
      formType,
      fields: {
        hasPassword: true,
        hasIdentity: Boolean(identity),
        passwordCount: passwords.length,
      },
      signature,
    };
  }

  function publish() {
    const result = scan();
    if (result.kind === 'used') return;

    if (result.kind === 'none') {
      if (lastSignature) {
        lastSignature = '';
        emit('form:gone', { origin: originOf() });
      }
      return;
    }

    if (result.signature === lastSignature) return;
    lastSignature = result.signature;
    emit('form:detected', {
      origin: result.origin,
      formType: result.formType,
      fields: result.fields,
      href: String(location.href || ''),
    });
  }

  function readFieldValues() {
    const passwords = findPasswordInputs(document);
    if (!passwords.length) return null;
    const form = passwords[0].closest('form') || document.body;
    const identity = findIdentityInput(form);
    return {
      origin: originOf(),
      formType: classify(passwords),
      username: identity ? String(identity.value || '').trim() : '',
      password: String(passwords[0].value || ''),
    };
  }

  function onSubmitCapture(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.querySelector('input[type="password"]')) return;
    const values = readFieldValues();
    if (!values || !values.password) return;
    emit('credentials:submitted', values);
  }

  function markUsed() {
    usedInVisit = true;
    lastSignature = '';
    emit('indicator:used', { origin: originOf() });
  }

  function fillCredentials(username, password) {
    const passwords = findPasswordInputs(document);
    if (!passwords.length) return false;
    const form = passwords[0].closest('form') || document.body;
    const identity = findIdentityInput(form);
    if (identity && typeof username === 'string') {
      identity.focus();
      identity.value = username;
      identity.dispatchEvent(new Event('input', { bubbles: true }));
      identity.dispatchEvent(new Event('change', { bubbles: true }));
    }
    passwords[0].focus();
    passwords[0].value = password || '';
    passwords[0].dispatchEvent(new Event('input', { bubbles: true }));
    passwords[0].dispatchEvent(new Event('change', { bubbles: true }));
    markUsed();
    return true;
  }

  // API para o host (executeJavaScript)
  window.__DSX_PASSWORD__ = {
    scan: publish,
    fill: fillCredentials,
    markUsed,
    read: readFieldValues,
  };

  document.addEventListener('submit', onSubmitCapture, true);

  const mo = new MutationObserver(() => {
    publish();
  });

  function boot() {
    usedInVisit = false;
    lastSignature = '';
    publish();
    try {
      mo.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['type', 'autocomplete', 'style', 'class'],
      });
    } catch (_) { /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('pageshow', () => {
    usedInVisit = false;
    lastSignature = '';
    publish();
  });
})();
