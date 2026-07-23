/**
 * Gate de usuários — login/cadastro separados, senha inline, delete, fundo parallax.
 */
(function () {
  const AVATAR_COLORS = ['#e50914', '#1a6cff', '#2ecc71', '#f39c12', '#9b59b6', '#16a085', '#e67e22'];

  const GATE_HTML = `
    <div class="user-gate-bg" aria-hidden="true">
      <div class="user-gate-bg__layer user-gate-bg__layer--a"></div>
      <div class="user-gate-bg__layer user-gate-bg__layer--b"></div>
      <div class="user-gate-bg__layer user-gate-bg__layer--c"></div>
      <div class="user-gate-bg__glow"></div>
    </div>

    <div class="user-gate" data-role="user-gate">
      <div class="user-gate__brand" data-role="brand">DSX</div>

      <section class="user-gate__view" data-role="view-select">
        <h1 class="user-gate__title">Quem está navegando?</h1>
        <p class="user-gate__status" data-role="status" hidden></p>
        <div class="user-gate__profiles" data-role="profiles"></div>
      </section>

      <section class="user-gate__view" data-role="view-register" hidden>
        <button type="button" class="user-gate__back" data-role="back-register" aria-label="Voltar">←</button>
        <h1 class="user-gate__title">Criar perfil</h1>
        <form class="user-gate__register" data-role="create-form">
          <button type="button" class="user-gate__photo-pick" data-role="photo-pick" aria-label="Escolher foto">
            <div class="user-gate__photo-preview" data-role="photo-preview">+</div>
            <span>Adicionar foto</span>
          </button>
          <input type="file" name="photo" accept="image/*" hidden data-role="photo-input" />
          <label>
            Nickname
            <input type="text" name="nickname" maxlength="32" required autocomplete="username" placeholder="Seu apelido" />
          </label>
          <label>
            Senha <span class="user-gate__optional">(opcional)</span>
            <input type="password" name="password" autocomplete="new-password" placeholder="Vazio = acesso livre" />
          </label>
          <button type="submit" class="user-gate__enter">Criar perfil</button>
          <p class="user-gate__error" data-role="form-error" hidden></p>
        </form>
      </section>
    </div>

    <div class="user-boot-loader" data-role="boot-loader" hidden>
      <div class="user-boot-loader__orb"></div>
      <div class="user-boot-loader__brand">DSX</div>
      <p class="user-boot-loader__text" data-role="boot-loader-text">Carregando seu espaço…</p>
    </div>
  `;

  let overlayEl = null;
  let isBuilt = false;
  let unlockTarget = null;
  let unlockTileEl = null;
  let resolveGate = null;
  let currentUsers = [];
  let pendingPhotoDataUrl = null;

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
    faceEl.textContent = (user?.nickname || '+').slice(0, 1).toUpperCase();
    if (user?.nickname) faceEl.style.background = colorFor(user.nickname);
  }

  function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'user-gate-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.innerHTML = GATE_HTML.trim();
    document.body.appendChild(overlayEl);

    overlayEl.querySelector('[data-role="back-register"]').addEventListener('click', showSelectView);
    overlayEl.querySelector('[data-role="create-form"]').addEventListener('submit', onCreateSubmit);
    overlayEl.querySelector('[data-role="photo-pick"]').addEventListener('click', () => {
      overlayEl.querySelector('[data-role="photo-input"]').click();
    });
    overlayEl.querySelector('[data-role="photo-input"]').addEventListener('change', onPhotoPick);

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

  function showSelectView() {
    clearUnlockInline();
    pendingPhotoDataUrl = null;
    overlayEl.classList.remove('is-register');
    overlayEl.querySelector('[data-role="view-select"]').hidden = false;
    overlayEl.querySelector('[data-role="view-register"]').hidden = true;
  }

  function showRegisterView() {
    clearUnlockInline();
    pendingPhotoDataUrl = null;
    overlayEl.classList.add('is-register');
    overlayEl.querySelector('[data-role="view-select"]').hidden = true;
    const register = overlayEl.querySelector('[data-role="view-register"]');
    register.hidden = false;
    const form = overlayEl.querySelector('[data-role="create-form"]');
    form.reset();
    const preview = overlayEl.querySelector('[data-role="photo-preview"]');
    preview.innerHTML = '+';
    preview.style.background = '';
    overlayEl.querySelector('[data-role="form-error"]').hidden = true;
    setTimeout(() => form.querySelector('input[name="nickname"]')?.focus(), 80);
  }

  function clearUnlockInline() {
    unlockTarget = null;
    if (unlockTileEl) {
      unlockTileEl.classList.remove('is-unlocking');
      const form = unlockTileEl.querySelector('[data-role="inline-unlock"]');
      if (form) form.remove();
      unlockTileEl = null;
    }
    overlayEl.classList.remove('is-unlocking');
    overlayEl.querySelectorAll('.user-gate__tile.is-dimmed').forEach((el) => {
      el.classList.remove('is-dimmed');
    });
  }

  function startUnlockInline(user, tileEl) {
    clearUnlockInline();
    unlockTarget = user;
    unlockTileEl = tileEl;
    overlayEl.classList.add('is-unlocking');

    overlayEl.querySelectorAll('.user-gate__tile').forEach((el) => {
      if (el !== tileEl) el.classList.add('is-dimmed');
    });
    tileEl.classList.add('is-unlocking');

    const form = document.createElement('form');
    form.className = 'user-gate__inline-unlock';
    form.setAttribute('data-role', 'inline-unlock');
    form.innerHTML = `
      <input type="password" name="password" autocomplete="current-password" placeholder="Senha" required />
      <button type="submit" class="user-gate__enter user-gate__enter--compact">Entrar</button>
      <p class="user-gate__error" data-role="unlock-error" hidden></p>
    `;
    form.addEventListener('submit', onUnlockSubmit);
    tileEl.appendChild(form);
    setTimeout(() => form.querySelector('input[name="password"]')?.focus(), 180);
  }

  function renderProfiles(users) {
    const grid = overlayEl.querySelector('[data-role="profiles"]');
    if (!grid) return;
    clearUnlockInline();
    grid.innerHTML = '';
    currentUsers = users.slice();

    users.forEach((user) => {
      const wrap = document.createElement('div');
      wrap.className = 'user-gate__tile';
      wrap.dataset.userId = user.id;
      wrap.innerHTML = `
        <button type="button" class="user-gate__tile-main" data-role="pick">
          <div class="user-gate__tile-face" data-role="face"></div>
          <p class="user-gate__tile-nick"></p>
        </button>
        <button type="button" class="user-gate__delete" data-role="delete" aria-label="Excluir usuário" title="Excluir">×</button>
      `;
      wrap.querySelector('.user-gate__tile-nick').textContent = user.nickname;
      fillFace(wrap.querySelector('[data-role="face"]'), user);
      wrap.querySelector('[data-role="pick"]').addEventListener('click', () => onPickUser(user, wrap));
      wrap.querySelector('[data-role="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        onDeleteUser(user);
      });
      grid.appendChild(wrap);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'user-gate__tile user-gate__tile--add';
    addBtn.setAttribute('aria-label', 'Adicionar usuário');
    addBtn.innerHTML = `
      <div class="user-gate__tile-face">+</div>
      <p class="user-gate__tile-nick">${users.length ? 'Adicionar' : 'Criar perfil'}</p>
    `;
    addBtn.addEventListener('click', showRegisterView);
    grid.appendChild(addBtn);
  }

  async function onPickUser(user, tileEl) {
    if (user.has_password) {
      startUnlockInline(user, tileEl);
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
    const form = e.target;
    const unlockError = form.querySelector('[data-role="unlock-error"]');
    if (unlockError) unlockError.hidden = true;
    const password = new FormData(form).get('password');
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

  async function onDeleteUser(user) {
    const ok = window.confirm(
      `Excluir o perfil "${user.nickname}"?\n\nIsso apaga histórico, favoritos, downloads, senhas e personalizações desse usuário.`
    );
    if (!ok) return;
    try {
      await window.UserSession.deleteUserCascade(user.id);
      const users = await window.UsersApi.list();
      updateUsers(users, users.length ? '' : 'Toque no + para criar o primeiro perfil');
      showSelectView();
    } catch (err) {
      setStatus(err.message || 'Não foi possível excluir o usuário');
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

  async function onPhotoPick(e) {
    const file = e.target.files && e.target.files[0];
    const preview = overlayEl.querySelector('[data-role="photo-preview"]');
    if (!file) {
      pendingPhotoDataUrl = null;
      preview.innerHTML = '+';
      return;
    }
    pendingPhotoDataUrl = await fileToDataUrl(file);
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = pendingPhotoDataUrl;
    img.alt = '';
    preview.appendChild(img);
  }

  async function onCreateSubmit(e) {
    e.preventDefault();
    const formError = overlayEl.querySelector('[data-role="form-error"]');
    if (formError) formError.hidden = true;
    const fd = new FormData(e.target);
    const nickname = String(fd.get('nickname') || '').trim();
    const password = String(fd.get('password') || '');

    try {
      const user = await window.UserSession.createAndSelect({
        nickname,
        password: password || null,
        photo_path: null,
      });

      if (pendingPhotoDataUrl && window.DragonUser?.saveAvatarDataUrl) {
        const photo_path = await window.DragonUser.saveAvatarDataUrl(user.id, pendingPhotoDataUrl);
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
    clearUnlockInline();
    showBootLoader('Carregando seu espaço…');
    if (resolveGate) {
      const done = resolveGate;
      resolveGate = null;
      done(window.UserSession.getActiveUser());
    }
  }

  function showBootLoader(text) {
    ensureBuilt();
    const loader = overlayEl.querySelector('[data-role="boot-loader"]');
    const label = overlayEl.querySelector('[data-role="boot-loader-text"]');
    if (label && text) label.textContent = text;
    if (loader) loader.hidden = false;
    overlayEl.classList.add('is-booting');
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');
  }

  function hideBootLoader() {
    if (!overlayEl) return;
    const loader = overlayEl.querySelector('[data-role="boot-loader"]');
    if (loader) loader.hidden = true;
    overlayEl.classList.remove('is-booting');
  }

  async function open(options = {}) {
    ensureBuilt();
    hideBootLoader();
    showSelectView();

    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');

    if (options.loading) {
      showBootLoader(options.statusText || 'Preparando perfis…');
      renderProfiles([]);
    } else {
      const users = options.users || [];
      setStatus(users.length ? '' : 'Toque no + para criar o primeiro perfil');
      renderProfiles(users);
      if (!users.length && options.onboarding) {
        // Mantém select com +; não força register automático.
      }
    }

    if (options.error) setStatus(options.error);

    return new Promise((resolve) => {
      resolveGate = resolve;
    });
  }

  function updateUsers(users, message) {
    if (!overlayEl) return;
    hideBootLoader();
    showSelectView();
    setStatus(message || (users.length ? '' : 'Toque no + para criar o primeiro perfil'));
    renderProfiles(users || []);
  }

  function close() {
    if (!overlayEl) return;
    clearUnlockInline();
    hideBootLoader();
    overlayEl.classList.remove('is-open', 'is-register', 'is-unlocking');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  async function openSwitcher() {
    const users = await window.UsersApi.list();
    const user = await open({ onboarding: false, users });
    close();
    return user;
  }

  window.UserGate = {
    open,
    close,
    openSwitcher,
    updateUsers,
    ensureBuilt,
    showBootLoader,
    hideBootLoader,
  };
})();
