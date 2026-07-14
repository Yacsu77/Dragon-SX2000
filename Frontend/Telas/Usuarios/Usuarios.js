/**
 * Gate de usuários estilo Netflix — perfil grande, senha ao subir, + para criar.
 * Template embutido (sem fetch file://) para evitar falha no Electron.
 */
(function () {
  const AVATAR_COLORS = ['#e50914', '#1a6cff', '#2ecc71', '#f39c12', '#9b59b6', '#16a085', '#e67e22'];

  const GATE_HTML = `
    <div class="user-gate" data-role="user-gate">
      <div class="user-gate__brand" data-role="brand">DSX</div>
      <h1 class="user-gate__title" data-role="title">Quem está navegando?</h1>
      <p class="user-gate__status" data-role="status" hidden></p>

      <div class="user-gate__profiles" data-role="profiles"></div>

      <div class="user-gate__stage" data-role="stage" hidden>
        <button type="button" class="user-gate__back" data-role="back" aria-label="Voltar">←</button>
        <div class="user-gate__stage-card" data-role="stage-card">
          <div class="user-gate__tile-face" data-role="stage-face"></div>
          <p class="user-gate__tile-nick" data-role="stage-nick"></p>
        </div>

        <form class="user-gate__password" data-role="unlock-form" hidden>
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            placeholder="Senha"
            required
            data-role="unlock-input"
          />
          <button type="submit" class="user-gate__enter">Entrar</button>
          <p class="user-gate__error" data-role="unlock-error" hidden></p>
        </form>

        <form class="user-gate__create" data-role="create-form" hidden>
          <label>
            Nickname
            <input type="text" name="nickname" maxlength="32" required autocomplete="username" placeholder="Seu apelido" />
          </label>
          <label>
            Senha (opcional)
            <input type="password" name="password" autocomplete="new-password" placeholder="Vazio = acesso livre" />
          </label>
          <label>
            Foto (opcional)
            <input type="file" name="photo" accept="image/*" />
          </label>
          <button type="submit" class="user-gate__enter">Criar perfil</button>
          <p class="user-gate__error" data-role="form-error" hidden></p>
        </form>
      </div>
    </div>
  `;

  let overlayEl = null;
  let isBuilt = false;
  let unlockTarget = null;
  let resolveGate = null;
  let currentUsers = [];

  function colorFor(name) {
    let hash = 0;
    const text = String(name || '?');
    for (let i = 0; i < text.length; i += 1) hash = (hash + text.charCodeAt(i) * 17) % AVATAR_COLORS.length;
    return AVATAR_COLORS[hash];
  }

  function photoSrc(path) {
    if (!path) return null;
    if (path.startsWith('file:') || path.startsWith('data:') || path.startsWith('http')) return path;
    return `file://${path}`;
  }

  function fillFace(faceEl, user) {
    faceEl.innerHTML = '';
    faceEl.style.background = '';
    const src = photoSrc(user?.photo_path);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      faceEl.appendChild(img);
      return;
    }
    const initial = (user?.nickname || '+').slice(0, 1).toUpperCase();
    faceEl.textContent = initial;
    if (user?.nickname) faceEl.style.background = colorFor(user.nickname);
  }

  function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'user-gate-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.innerHTML = GATE_HTML.trim();
    document.body.appendChild(overlayEl);

    const unlockForm = overlayEl.querySelector('[data-role="unlock-form"]');
    const createForm = overlayEl.querySelector('[data-role="create-form"]');
    const backBtn = overlayEl.querySelector('[data-role="back"]');

    if (backBtn) backBtn.addEventListener('click', leaveStage);
    if (unlockForm) unlockForm.addEventListener('submit', onUnlockSubmit);
    if (createForm) createForm.addEventListener('submit', onCreateSubmit);

    isBuilt = true;
  }

  function setStatus(text) {
    const el = overlayEl.querySelector('[data-role="status"]');
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = text;
  }

  function leaveStage() {
    unlockTarget = null;
    overlayEl.classList.remove('is-staged');
    const stage = overlayEl.querySelector('[data-role="stage"]');
    if (stage) stage.hidden = true;
    const unlockForm = overlayEl.querySelector('[data-role="unlock-form"]');
    const createForm = overlayEl.querySelector('[data-role="create-form"]');
    if (unlockForm) unlockForm.hidden = true;
    if (createForm) createForm.hidden = true;
    const unlockError = overlayEl.querySelector('[data-role="unlock-error"]');
    const formError = overlayEl.querySelector('[data-role="form-error"]');
    if (unlockError) unlockError.hidden = true;
    if (formError) formError.hidden = true;
  }

  function enterStage({ mode, user }) {
    const stage = overlayEl.querySelector('[data-role="stage"]');
    const face = overlayEl.querySelector('[data-role="stage-face"]');
    const nick = overlayEl.querySelector('[data-role="stage-nick"]');
    const unlockForm = overlayEl.querySelector('[data-role="unlock-form"]');
    const createForm = overlayEl.querySelector('[data-role="create-form"]');

    if (!stage || !face || !nick) return;

    stage.hidden = false;
    overlayEl.classList.add('is-staged');

    if (mode === 'unlock' && user) {
      unlockTarget = user;
      fillFace(face, user);
      nick.textContent = user.nickname;
      if (createForm) createForm.hidden = true;
      if (unlockForm) {
        unlockForm.hidden = false;
        unlockForm.reset();
        const input = unlockForm.querySelector('[data-role="unlock-input"]');
        setTimeout(() => input && input.focus(), 220);
      }
      return;
    }

    unlockTarget = null;
    fillFace(face, { nickname: '+' });
    face.textContent = '+';
    face.style.background = 'rgba(255,255,255,0.04)';
    nick.textContent = 'Novo perfil';
    if (unlockForm) unlockForm.hidden = true;
    if (createForm) {
      createForm.hidden = false;
      createForm.reset();
      const input = createForm.querySelector('input[name="nickname"]');
      setTimeout(() => input && input.focus(), 220);
    }
  }

  function renderProfiles(users) {
    const grid = overlayEl.querySelector('[data-role="profiles"]');
    if (!grid) return;
    grid.innerHTML = '';
    currentUsers = users.slice();

    users.forEach((user) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'user-gate__tile';
      btn.innerHTML = `
        <div class="user-gate__tile-face" data-role="face"></div>
        <p class="user-gate__tile-nick"></p>
      `;
      btn.querySelector('.user-gate__tile-nick').textContent = user.nickname;
      fillFace(btn.querySelector('[data-role="face"]'), user);
      btn.addEventListener('click', () => onPickUser(user));
      grid.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'user-gate__tile user-gate__tile--add';
    addBtn.setAttribute('aria-label', 'Adicionar usuário');
    addBtn.innerHTML = `
      <div class="user-gate__tile-face">+</div>
      <p class="user-gate__tile-nick">${users.length ? 'Adicionar' : 'Criar perfil'}</p>
    `;
    addBtn.addEventListener('click', () => enterStage({ mode: 'create' }));
    grid.appendChild(addBtn);
  }

  async function onPickUser(user) {
    if (user.has_password) {
      enterStage({ mode: 'unlock', user });
      return;
    }
    try {
      setStatus('Entrando…');
      await window.UserSession.selectUser(user, null);
      finish();
    } catch (err) {
      setStatus(err.message || 'Falha ao selecionar usuário');
    }
  }

  async function onUnlockSubmit(e) {
    e.preventDefault();
    const unlockError = overlayEl.querySelector('[data-role="unlock-error"]');
    if (unlockError) unlockError.hidden = true;
    const password = new FormData(e.target).get('password');
    try {
      await window.UserSession.selectUser(unlockTarget, password);
      finish();
    } catch (err) {
      if (unlockError) {
        unlockError.textContent = err.message || 'Senha incorreta';
        unlockError.hidden = false;
      }
    }
  }

  async function fileToDataUrl(file) {
    if (!file || !file.size) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onCreateSubmit(e) {
    e.preventDefault();
    const formError = overlayEl.querySelector('[data-role="form-error"]');
    if (formError) formError.hidden = true;
    const fd = new FormData(e.target);
    const nickname = String(fd.get('nickname') || '').trim();
    const password = String(fd.get('password') || '');
    const photoFile = fd.get('photo');

    try {
      const user = await window.UserSession.createAndSelect({
        nickname,
        password: password || null,
        photo_path: null,
      });

      if (photoFile && photoFile.size && window.DragonUser?.saveAvatarDataUrl) {
        const dataUrl = await fileToDataUrl(photoFile);
        const photo_path = await window.DragonUser.saveAvatarDataUrl(user.id, dataUrl);
        const updated = await window.UsersApi.update(user.id, { photo_path });
        await window.UserSession.setActiveUser(updated, { reason: 'photo' });
      }

      finish();
    } catch (err) {
      if (formError) {
        formError.textContent = err.message || 'Não foi possível criar o usuário';
        formError.hidden = false;
      }
    }
  }

  function finish() {
    close();
    if (resolveGate) {
      const done = resolveGate;
      resolveGate = null;
      done(window.UserSession.getActiveUser());
    }
  }

  async function open(options = {}) {
    ensureBuilt();
    leaveStage();

    const title = overlayEl.querySelector('[data-role="title"]');
    if (title) {
      title.textContent = options.onboarding ? 'Crie seu perfil' : 'Quem está navegando?';
    }

    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');

    if (options.loading) {
      setStatus(options.statusText || 'Preparando perfis…');
      renderProfiles([]);
    } else {
      const users = options.users || [];
      setStatus(users.length ? '' : 'Toque no + para criar o primeiro perfil');
      if (title && !users.length) title.textContent = 'Quem está navegando?';
      renderProfiles(users);
    }

    if (options.error) {
      setStatus(options.error);
    }

    return new Promise((resolve) => {
      resolveGate = resolve;
    });
  }

  function updateUsers(users, message) {
    if (!overlayEl) return;
    setStatus(message || (users.length ? '' : 'Toque no + para criar o primeiro perfil'));
    renderProfiles(users || []);
  }

  function close() {
    if (!overlayEl) return;
    leaveStage();
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  async function openSwitcher() {
    const users = await window.UsersApi.list();
    return open({ onboarding: false, users });
  }

  window.UserGate = { open, close, openSwitcher, updateUsers, ensureBuilt };
})();
