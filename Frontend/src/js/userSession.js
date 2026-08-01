/**
 * Contexto do usuário ativo + isolamento de sessão.
 */
(function () {
  const ACTIVE_META_KEY = 'dsx.activeUserId';
  let activeUser = null;
  let vaultToken = null;
  let profileSecret = null;
  let bootResolved = false;

  function getActiveUserId() {
    return activeUser?.id || null;
  }

  function getActiveUser() {
    return activeUser;
  }

  function getVaultToken() {
    return vaultToken;
  }

  function setVaultToken(token) {
    vaultToken = token || null;
  }

  function clearVaultToken() {
    vaultToken = null;
  }

  /** Senha do perfil em memória (auto-unlock do vault no fluxo de senhas). */
  function getProfileSecret() {
    return profileSecret;
  }

  function setProfileSecret(secret) {
    profileSecret = secret || null;
  }

  function clearProfileSecret() {
    profileSecret = null;
  }

  function getPartition() {
    const id = getActiveUserId();
    return id ? `persist:dragon-${id}` : 'persist:dragon-pending';
  }

  async function notifyMainActiveUser(userId) {
    if (window.DragonUser && typeof window.DragonUser.setActive === 'function') {
      try {
        await window.DragonUser.setActive(userId);
      } catch (err) {
        console.warn('[UserSession] falha ao notificar main:', err);
      }
    }
  }

  async function unlockVaultWithSecret(userId, secret) {
    if (!userId || !secret || !window.VaultApi?.unlock) return false;
    try {
      const result = await window.VaultApi.unlock(userId, secret);
      setVaultToken(result.token);
      try {
        window.PasswordBus?.notify?.('vault:unlocked', {});
      } catch (_) { /* ignore */ }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function setActiveUser(user, options = {}) {
    const previousId = activeUser?.id || null;
    activeUser = user ? { ...user } : null;
    clearVaultToken();
    if (!options.keepProfileSecret) clearProfileSecret();

    if (activeUser?.id) {
      localStorage.setItem(ACTIVE_META_KEY, activeUser.id);
      try {
        await window.UsersApi.touch(activeUser.id);
      } catch {
        /* ignore */
      }
    } else {
      localStorage.removeItem(ACTIVE_META_KEY);
      clearProfileSecret();
    }

    await notifyMainActiveUser(activeUser?.id || null);

    document.dispatchEvent(
      new CustomEvent('user:changed', {
        detail: {
          user: activeUser,
          previousUserId: previousId,
          reason: options.reason || 'switch',
        },
      })
    );
  }

  async function lockVaultOnSwitch() {
    if (!activeUser?.id) return;
    try {
      await window.VaultApi.lock(activeUser.id, vaultToken);
    } catch {
      /* ignore */
    }
    clearVaultToken();
    clearProfileSecret();
  }

  /**
   * Resolve usuário no boot. Retorna true se já há usuário ativo.
   * Caso contrário a UI de switcher/onboarding deve ser mostrada.
   */
  async function resolveForBoot() {
    const online = await window.DsxApi.waitForApi(60, 250);
    if (!online) {
      throw new Error('API-DSX offline no boot');
    }

    const users = await window.UsersApi.list();
    bootResolved = true;

    if (!users.length) {
      activeUser = null;
      localStorage.removeItem(ACTIVE_META_KEY);
      await notifyMainActiveUser(null);
      return { needsOnboarding: true, needsSwitcher: false, users: [] };
    }

    const savedId = localStorage.getItem(ACTIVE_META_KEY);
    return { needsOnboarding: false, needsSwitcher: true, users, savedId };
  }

  async function selectUser(user, password) {
    if (!user?.id) throw new Error('Usuário inválido');

    if (user.has_password) {
      const result = await window.UsersApi.unlock(user.id, password);
      setProfileSecret(password);
      await setActiveUser(result.user, { reason: 'unlock', keepProfileSecret: true });
      // Sistema de senhas segue direto; Cofre visual permanece trancado.
      await unlockVaultWithSecret(result.user.id, password);
      return result.user;
    }

    await window.UsersApi.unlock(user.id, null);
    clearProfileSecret();
    await setActiveUser(user, { reason: 'select' });
    // Perfil sem senha: unlock silencioso do vault (chave de dispositivo).
    await unlockVaultWithSecret(user.id, '');
    return user;
  }

  async function createAndSelect(payload) {
    const user = await window.UsersApi.create(payload);
    if (payload?.password) setProfileSecret(payload.password);
    await setActiveUser(user, { reason: 'create', keepProfileSecret: Boolean(payload?.password) });
    // Sempre sobe o vault em silêncio (senha do perfil ou chave de dispositivo).
    await unlockVaultWithSecret(user.id, payload?.password || '');
    try {
      if (window.DragonWallpaper?.seedDefault) {
        await window.DragonWallpaper.seedDefault(user.id);
      }
      if (typeof window.WallpaperUserReload === 'function') {
        await window.WallpaperUserReload();
      }
    } catch (_) { /* ignore wallpaper seed errors */ }
    return user;
  }

  async function switchUser(user, password) {
    await lockVaultOnSwitch();
    return selectUser(user, password);
  }

  async function deleteUserCascade(userId) {
    if (!userId) return null;
    const wasActive = activeUser?.id === userId;
    await window.UsersApi.remove(userId);
    if (window.UserStorage) window.UserStorage.clearUserNamespace(userId);
    if (window.DragonUser && typeof window.DragonUser.deleteUserData === 'function') {
      await window.DragonUser.deleteUserData(userId);
    }
    if (wasActive) {
      activeUser = null;
      localStorage.removeItem(ACTIVE_META_KEY);
      clearVaultToken();
      clearProfileSecret();
      await notifyMainActiveUser(null);
    }
    return { id: userId, deleted: true };
  }

  async function deleteActiveUserCascade() {
    const id = getActiveUserId();
    if (!id) return null;
    return deleteUserCascade(id);
  }

  window.UserSession = {
    getActiveUserId,
    getActiveUser,
    getPartition,
    getVaultToken,
    setVaultToken,
    clearVaultToken,
    getProfileSecret,
    setActiveUser,
    resolveForBoot,
    selectUser,
    createAndSelect,
    switchUser,
    deleteUserCascade,
    deleteActiveUserCascade,
    lockVaultOnSwitch,
    isBootResolved: () => bootResolved,
  };
})();
