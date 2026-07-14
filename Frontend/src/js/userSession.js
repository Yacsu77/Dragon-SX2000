/**
 * Contexto do usuário ativo + isolamento de sessão.
 */
(function () {
  const ACTIVE_META_KEY = 'dsx.activeUserId';
  let activeUser = null;
  let vaultToken = null;
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

  async function setActiveUser(user, options = {}) {
    const previousId = activeUser?.id || null;
    activeUser = user ? { ...user } : null;
    clearVaultToken();

    if (activeUser?.id) {
      localStorage.setItem(ACTIVE_META_KEY, activeUser.id);
      try {
        await window.UsersApi.touch(activeUser.id);
      } catch {
        /* ignore */
      }
    } else {
      localStorage.removeItem(ACTIVE_META_KEY);
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
      await setActiveUser(result.user, { reason: 'unlock' });
      return result.user;
    }

    await window.UsersApi.unlock(user.id, null);
    await setActiveUser(user, { reason: 'select' });
    return user;
  }

  async function createAndSelect(payload) {
    const user = await window.UsersApi.create(payload);
    await setActiveUser(user, { reason: 'create' });
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