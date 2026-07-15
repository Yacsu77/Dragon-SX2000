/**
 * Gerenciador de senhas (vault) — MVP com unlock/CRUD.
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Cofre/Cofre.html';
  const CSS_HREF = '../Telas/Cofre/Cofre.css';

  let overlayEl = null;
  let isOpen = false;
  let isBuilt = false;

  function userId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  function ensureCss() {
    if (document.querySelector(`link[href="${CSS_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }

  async function ensureBuilt() {
    if (isBuilt) return;
    ensureCss();

    overlayEl = document.createElement('div');
    overlayEl.className = 'cofre-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    overlayEl.innerHTML = (await response.text()).trim();

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });
    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape') close();
    });

    overlayEl.querySelector('[data-role="unlock"]').addEventListener('click', onUnlock);
    overlayEl.querySelector('[data-role="lock"]').addEventListener('click', onLock);
    overlayEl.querySelector('[data-role="set-pin"]').addEventListener('click', onSetPin);
    overlayEl.querySelector('[data-role="add-form"]').addEventListener('submit', onAdd);

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  function setUnlockedUi(unlocked) {
    overlayEl.querySelector('[data-role="unlock-panel"]').hidden = unlocked;
    overlayEl.querySelector('[data-role="vault-panel"]').hidden = !unlocked;
  }

  async function onUnlock() {
    const errEl = overlayEl.querySelector('[data-role="unlock-error"]');
    errEl.hidden = true;
    const secret = overlayEl.querySelector('[data-role="unlock-secret"]').value;
    const uid = userId();
    try {
      const result = await window.VaultApi.unlock(uid, secret);
      window.UserSession.setVaultToken(result.token);
      setUnlockedUi(true);
      await renderList();
    } catch (err) {
      errEl.textContent = err.message || 'Falha ao desbloquear';
      errEl.hidden = false;
    }
  }

  async function onLock() {
    const uid = userId();
    try {
      await window.VaultApi.lock(uid, window.UserSession.getVaultToken());
    } catch {
      /* ignore */
    }
    window.UserSession.clearVaultToken();
    setUnlockedUi(false);
  }

  async function onSetPin() {
    const pin = prompt('Defina um PIN do cofre (mín. 4 caracteres). Necessário se o perfil não tem senha.');
    if (!pin) return;
    try {
      await window.UsersApi.update(userId(), { vault_pin: pin });
      alert('PIN do cofre salvo.');
    } catch (err) {
      alert(err.message || 'Falha ao salvar PIN');
    }
  }

  async function onAdd(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const uid = userId();
    const token = window.UserSession.getVaultToken();
    try {
      await window.VaultApi.create({
        user_id: uid,
        token,
        origin: String(fd.get('origin') || '').trim(),
        username: String(fd.get('username') || ''),
        password: String(fd.get('password') || ''),
      });
      e.target.reset();
      await renderList();
    } catch (err) {
      alert(err.message || 'Falha ao salvar');
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async function renderList() {
    const uid = userId();
    const list = overlayEl.querySelector('[data-role="list"]');
    list.innerHTML = '';
    const items = await window.VaultApi.list(uid);
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'cofre-screen__item';
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(item.origin)}</strong><br />
          <small>${escapeHtml(item.username || '')}</small>
        </div>
        <div class="cofre-screen__item-actions">
          <button type="button" data-role="reveal">Revelar</button>
          <button type="button" data-role="remove">Apagar</button>
        </div>
      `;
      li.querySelector('[data-role="reveal"]').addEventListener('click', async () => {
        try {
          const full = await window.VaultApi.reveal(
            item.id,
            uid,
            window.UserSession.getVaultToken()
          );
          alert(`Senha: ${full.password}`);
        } catch (err) {
          alert(err.message || 'Falha ao revelar');
        }
      });
      li.querySelector('[data-role="remove"]').addEventListener('click', async () => {
        await window.VaultApi.remove(item.id, uid);
        await renderList();
      });
      list.appendChild(li);
    });
  }

  async function open() {
    await ensureBuilt();
    const unlocked = Boolean(window.UserSession.getVaultToken());
    setUnlockedUi(unlocked);
    if (unlocked) await renderList();
    isOpen = true;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('user:changed', () => {
    if (window.UserSession) window.UserSession.clearVaultToken();
    if (isOpen) setUnlockedUi(false);
  });

  window.CofreScreen = { open, close };
})();
