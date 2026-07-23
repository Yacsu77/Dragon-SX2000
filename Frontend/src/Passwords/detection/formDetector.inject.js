/**
 * Script injetado no documento da página (sem Node).
 * Comunica com o host via console: __DSX_PWD__{json}
 */
(function () {
  if (window.__DSX_PASSWORD_INJECTED__) return;
  window.__DSX_PASSWORD_INJECTED__ = true;

  const PREFIX = '__DSX_PWD__';
  let lastSignature = '';
  let usedInVisit = false;
  let lastDraft = null;
  let publishTimer = null;
  let automatedSubmitInProgress = false;

  function emit(type, detail) {
    try {
      // eslint-disable-next-line no-console
      console.log(PREFIX + JSON.stringify({ type, detail: detail || {} }));
    } catch (_) { /* ignore */ }
  }

  function originOf() {
    try {
      return location.protocol + '//' + location.host;
    } catch (_) {
      return null;
    }
  }

  function isCandidatePassword(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.type !== 'password') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // Não exigir getBoundingClientRect > 0 (muitos forms animam / lazy)
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  }

  function findPasswordInputs() {
    return Array.from(document.querySelectorAll('input[type="password"]')).filter(isCandidatePassword);
  }

  function findIdentityInput(scope) {
    const root = scope || document;
    const passwords = findPasswordInputs().filter(function (p) {
      return root.contains(p);
    });

    // Preferir o input de texto/email imediatamente antes da senha (GitHub, etc.).
    if (passwords.length) {
      const form = passwords[0].closest('form') || root;
      const inputs = Array.from(form.querySelectorAll('input')).filter(function (el) {
        if (!el || el.disabled) return false;
        const t = String(el.type || 'text').toLowerCase();
        if (t === 'hidden' || t === 'submit' || t === 'button' || t === 'checkbox' || t === 'radio') {
          return false;
        }
        return true;
      });
      const pwdIndex = inputs.indexOf(passwords[0]);
      for (let i = pwdIndex - 1; i >= 0; i -= 1) {
        const el = inputs[i];
        const t = String(el.type || 'text').toLowerCase();
        if (t === 'password') continue;
        if (t === 'email' || t === 'text' || t === 'tel' || t === 'url' || !el.type) {
          return el;
        }
      }
    }

    const selectors = [
      'input[autocomplete="username"]',
      'input[name="login"]',
      'input[id="login"]',
      'input[id="login_field"]',
      'input[name="login_field"]',
      'input[type="email"]',
      'input[autocomplete="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      'input[name*="user" i]',
      'input[id*="user" i]',
      'input[name*="login" i]',
      'input[id*="login" i]',
      'input[name*="account" i]',
      'input[type="text"]',
    ];
    for (let i = 0; i < selectors.length; i += 1) {
      let el = null;
      try {
        el = root.querySelector(selectors[i]);
      } catch (_) {
        el = null;
      }
      if (el && el.type !== 'password' && !el.disabled) return el;
    }
    return null;
  }

  function classify(passwords) {
    if (!passwords.length) return null;
    if (passwords.length >= 2) return 'signup';
    const ac = String(passwords[0].getAttribute('autocomplete') || '').toLowerCase();
    if (ac.indexOf('new-password') >= 0) return 'signup';
    const txt = String(document.body && document.body.innerText || '').toLowerCase();
    if (
      txt.indexOf('criar conta') >= 0 ||
      txt.indexOf('sign up') >= 0 ||
      txt.indexOf('cadastro') >= 0 ||
      txt.indexOf('register') >= 0
    ) {
      // heurística fraca — só se houver um password
      if (/sign up|cadastro|criar conta|register|inscreva/.test(txt.slice(0, 2000))) {
        /* keep login unless confirm field */
      }
    }
    return 'login';
  }

  function readDraft() {
    const passwords = findPasswordInputs();
    if (!passwords.length) return null;
    const form = passwords[0].closest('form') || document.body;
    const identity = findIdentityInput(form);
    const username = identity ? String(identity.value || '').trim() : '';
    const password = String(passwords[0].value || '');
    if (!password) return null;
    return {
      origin: originOf(),
      formType: classify(passwords),
      username,
      password,
      href: String(location.href || ''),
    };
  }

  function publish() {
    if (usedInVisit) return;
    const passwords = findPasswordInputs();
    if (!passwords.length) {
      if (lastSignature) {
        lastSignature = '';
        emit('form:gone', { origin: originOf() });
      }
      return;
    }

    const form = passwords[0].closest('form') || document.body;
    const formType = classify(passwords);
    const identity = findIdentityInput(form);
    const origin = originOf();
    const signature = [origin, formType, passwords.length, identity ? 'id' : 'none'].join('|');

    const draft = readDraft();
    if (draft) lastDraft = draft;

    if (signature === lastSignature) return;
    lastSignature = signature;
    emit('form:detected', {
      origin,
      formType,
      fields: {
        hasPassword: true,
        hasIdentity: Boolean(identity),
        passwordCount: passwords.length,
      },
      href: String(location.href || ''),
    });
  }

  function schedulePublish() {
    if (publishTimer) clearTimeout(publishTimer);
    publishTimer = setTimeout(publish, 120);
  }

  function emitSubmitted(source) {
    // Legado: não emitir no clique. Só após login confirmado.
  }

  function isSubmitLike(el) {
    if (!el || !el.closest) return false;
    const btn = el.closest('button, input[type="submit"], input[type="button"], [role="button"], a');
    if (!btn) return false;
    const type = String(btn.getAttribute('type') || '').toLowerCase();
    if (type === 'reset') return false;
    const text = String(btn.innerText || btn.value || btn.getAttribute('aria-label') || '').toLowerCase();
    if (type === 'submit') return true;
    return /entrar|login|log in|sign in|acessar|continuar|cadastr|sign up|register|criar|submit|next|próximo|proximo/.test(
      text
    );
  }

  let pendingLogin = null;
  let loginCheckTimer = null;
  let loginCheckTicks = 0;

  function looksLikeLoginError() {
    const nodes = document.querySelectorAll(
      '[role="alert"], .error, .errors, .flash-error, .alert-error, .alert-danger, .form-error, .Field-error, .js-flash-alert'
    );
    for (let i = 0; i < nodes.length; i += 1) {
      const el = nodes[i];
      if (!el || !el.offsetParent) continue;
      const t = String(el.textContent || '').toLowerCase();
      if (
        t &&
        /incorrect|inválid|invalid|wrong|senha|password|auth|denied|falha|erro|failed|try again|não confere|nao confere/.test(
          t
        )
      ) {
        return true;
      }
    }
    const text = String((document.body && document.body.innerText) || '')
      .toLowerCase()
      .slice(0, 3500);
    return /incorrect password|wrong password|senha incorreta|invalid credentials|authentication failed|login failed|usuário ou senha|usuario ou senha/.test(
      text
    );
  }

  function armPendingLogin(source) {
    const draft = readDraft() || lastDraft;
    if (!draft || !draft.password) return;
    pendingLogin = {
      draft: {
        origin: draft.origin,
        formType: draft.formType,
        username: draft.username,
        password: draft.password,
        href: draft.href,
      },
      at: Date.now(),
      startHref: String(location.href || ''),
      startOrigin: originOf(),
      source: source || 'submit',
    };
    // Host guarda a tentativa — em redirect o inject some antes de confirmar.
    emit('credentials:attempt', Object.assign({}, pendingLogin.draft, { source: pendingLogin.source }));
    loginCheckTicks = 0;
    scheduleLoginCheck(350);
  }

  function clearPendingLogin() {
    pendingLogin = null;
    if (loginCheckTimer) {
      clearTimeout(loginCheckTimer);
      loginCheckTimer = null;
    }
  }

  function confirmLoginSuccess() {
    if (!pendingLogin) return;
    loginCheckTicks += 1;

    if (looksLikeLoginError()) {
      emit(
        'credentials:login-failed',
        Object.assign({}, pendingLogin.draft, { source: pendingLogin.source })
      );
      clearPendingLogin();
      return;
    }

    const passwords = findPasswordInputs();
    const href = String(location.href || '');
    const origin = originOf();
    const elapsed = Date.now() - pendingLogin.at;
    const navigated = href !== pendingLogin.startHref;
    const formGone = passwords.length === 0;

    // Ainda no form de login: espera (erro ou sucesso).
    if (!formGone && origin === pendingLogin.startOrigin && !navigated) {
      if (elapsed > 10000 || loginCheckTicks > 24) {
        emit(
          'credentials:login-failed',
          Object.assign({}, pendingLogin.draft, { source: pendingLogin.source })
        );
        clearPendingLogin();
        return;
      }
      scheduleLoginCheck(450);
      return;
    }

    // Form sumiu ou navegou sem sinais de erro → login ok.
    if (formGone || navigated) {
      emit(
        'credentials:submitted',
        Object.assign({}, pendingLogin.draft, {
          source: pendingLogin.source,
          confirmed: true,
          origin: pendingLogin.draft.origin || pendingLogin.startOrigin,
        })
      );
      clearPendingLogin();
      return;
    }

    if (elapsed > 10000 || loginCheckTicks > 24) {
      clearPendingLogin();
      return;
    }
    scheduleLoginCheck(450);
  }

  function scheduleLoginCheck(delay) {
    if (loginCheckTimer) clearTimeout(loginCheckTimer);
    loginCheckTimer = setTimeout(confirmLoginSuccess, delay || 400);
  }

  function fillCredentials(username, password) {
    const passwords = findPasswordInputs();
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
    usedInVisit = true;
    lastSignature = '';
    emit('indicator:used', { origin: originOf() });
    return true;
  }

  function fillAndSubmit(username, password) {
    if (!fillCredentials(username, password)) return false;
    const passwords = findPasswordInputs();
    if (!passwords.length) return false;
    const form = passwords[0].closest('form');
    automatedSubmitInProgress = true;
    armPendingLogin('dsx-autologin');

    try {
      if (form && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        const scope = form || document;
        const submit = Array.from(
          scope.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]')
        ).find(isSubmitLike);
        if (!submit) {
          automatedSubmitInProgress = false;
          clearPendingLogin();
          return false;
        }
        submit.click();
      }
    } catch (_) {
      automatedSubmitInProgress = false;
      clearPendingLogin();
      return false;
    }
    setTimeout(function () {
      automatedSubmitInProgress = false;
    }, 500);
    return true;
  }

  window.__DSX_PASSWORD__ = {
    scan: publish,
    fill: fillCredentials,
    fillAndSubmit,
    markUsed: function () {
      usedInVisit = true;
      lastSignature = '';
      emit('indicator:used', { origin: originOf() });
    },
    read: readDraft,
  };

  document.addEventListener(
    'submit',
    function (event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.querySelector('input[type="password"]')) return;
      if (automatedSubmitInProgress) return;
      armPendingLogin('form-submit');
    },
    true
  );

  document.addEventListener(
    'click',
    function (event) {
      if (!findPasswordInputs().length) return;
      if (!isSubmitLike(event.target)) return;
      if (automatedSubmitInProgress) return;
      setTimeout(function () {
        armPendingLogin('button-click');
      }, 0);
    },
    true
  );

  document.addEventListener(
    'keydown',
    function (event) {
      if (event.key !== 'Enter') return;
      const t = event.target;
      if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'BUTTON')) return;
      if (!findPasswordInputs().length) return;
      setTimeout(function () {
        armPendingLogin('enter');
      }, 0);
    },
    true
  );

  document.addEventListener(
    'input',
    function (event) {
      const t = event.target;
      if (!t || t.tagName !== 'INPUT') return;
      if (t.type === 'password' || t.type === 'email' || t.type === 'text') {
        const draft = readDraft();
        if (draft) lastDraft = draft;
        schedulePublish();
      }
    },
    true
  );

  window.addEventListener('pagehide', function () {
    // Não salva no pagehide — só após confirmação de login.
  });

  window.addEventListener('pageshow', function () {
    if (pendingLogin) scheduleLoginCheck(300);
  });

  const mo = new MutationObserver(function () {
    schedulePublish();
    if (pendingLogin) scheduleLoginCheck(280);
  });
  try {
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'autocomplete', 'style', 'class', 'hidden'],
    });
  } catch (_) { /* ignore */ }

  publish();
  setTimeout(publish, 400);
  setTimeout(publish, 1200);
  setTimeout(publish, 2500);
})();
