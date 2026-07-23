/**
 * Runtime de grupos: snapshot, troca e restauração de abas.
 */
(function () {
  if (window.TabGroupsRuntime) return;

  const SAVE_DEBOUNCE_MS = 500;
  let initialized = false;
  let switching = false;
  let saveTimer = null;

  function activeGroupId() {
    return window.TabGroupsState?.getActiveGroupId?.() || null;
  }

  function activeGroup() {
    return window.TabGroupsState?.getActiveGroup?.() || null;
  }

  function normalizeTabs(tabs) {
    const list = Array.isArray(tabs) ? tabs.map((tab, position) => ({ ...tab, position })) : [];
    const activeIndex = list.findIndex((tab) => tab.active);
    return list.map((tab, index) => ({
      ...tab,
      active: activeIndex >= 0 ? index === activeIndex : index === list.length - 1,
    }));
  }

  function collectCurrentTabs() {
    if (typeof window.getOpenTabSnapshots !== 'function') return [];
    return normalizeTabs(window.getOpenTabSnapshots());
  }

  async function saveActiveGroupNow() {
    if (!initialized || switching) return null;
    const groupId = activeGroupId();
    if (!groupId || !window.TabGroupsService) return null;
    const tabs = collectCurrentTabs();
    window.TabGroupsState.replaceGroupTabs(groupId, tabs);
    try {
      return await window.TabGroupsService.replaceTabs(groupId, tabs);
    } catch (err) {
      console.warn('[TabGroups] falha ao salvar snapshot:', err);
      return null;
    }
  }

  function scheduleSave() {
    if (!initialized || switching) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveActiveGroupNow();
    }, SAVE_DEBOUNCE_MS);
  }

  function applyActiveGroupStyle() {
    const group = activeGroup();
    document.body.dataset.activeTabGroupId = group?.id || '';
    document.body.style.setProperty('--active-tab-group-color', group?.color || '#7a8cff');
  }

  async function recreateTabsFromGroup(group) {
    const tabs = normalizeTabs(group?.tabs || []);
    let lastId = null;
    let activeId = null;

    switching = true;
    try {
      window.clearTabsForGroupSwitch?.(false);

      for (const snapshot of tabs) {
        const id = window.createTabFromSnapshot?.(snapshot, false, lastId);
        if (!id) continue;
        lastId = id;
        if (snapshot.active) activeId = id;
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      }

      const targetId = activeId || lastId;
      if (targetId) {
        if (targetId.startsWith('home-tab')) {
          window.activateHomeTab?.(targetId);
        } else {
          window.activateTab?.(targetId);
        }
        window.TabWarmth?.warmDeferredQueue?.(targetId);
        return true;
      }

      return false;
    } finally {
      switching = false;
      applyActiveGroupStyle();
      window.TabsVisibility?.scheduleVisibilityUpdate?.();
    }
  }

  async function restoreActiveGroup() {
    const group = activeGroup();
    if (!group) return false;
    return recreateTabsFromGroup(group);
  }

  async function switchToGroup(groupId) {
    if (!groupId || groupId === activeGroupId() || switching) return activeGroup();
    await saveActiveGroupNow();
    const group = window.TabGroupsState.getGroup(groupId);
    if (!group) return activeGroup();

    window.TabGroupsState.setActiveGroupId(groupId);
    const restored = await restoreActiveGroup();
    if (!restored) {
      window.AppShell?.showHome?.();
      window.createHomeTab?.();
    }
    return activeGroup();
  }

  async function createGroup(data = {}, options = {}) {
    await saveActiveGroupNow();
    const group = await window.TabGroupsService.createGroup({
      name: data.name || `Grupo ${window.TabGroupsState.getGroups().length + 1}`,
      color: data.color || '#7a8cff',
      icon: data.icon || 'folder',
      position: Number.isFinite(Number(data.position))
        ? Number(data.position)
        : window.TabGroupsState.getGroups().length,
    });

    if (options.activate !== false) {
      await switchToGroup(group.id);
    }
    return group;
  }

  async function updateGroup(groupId, patch) {
    const group = await window.TabGroupsService.updateGroup(groupId, patch);
    applyActiveGroupStyle();
    return group;
  }

  async function deleteGroup(groupId) {
    const groups = window.TabGroupsState.getGroups();
    if (groups.length <= 1) return null;

    const wasActive = groupId === activeGroupId();
    await window.TabGroupsService.deleteGroup(groupId);
    const next = window.TabGroupsState.getGroups()[0];
    if (wasActive && next) {
      window.TabGroupsState.setActiveGroupId(next.id);
      const restored = await restoreActiveGroup();
      if (!restored) {
        window.AppShell?.showHome?.();
        window.createHomeTab?.();
      }
    }
    return { id: groupId, deleted: true };
  }

  async function addTabToGroup(tabId, groupId) {
    const snapshot = window.TabsCore?.getTabSnapshot?.(tabId);
    if (!snapshot || !groupId) return { ok: false, error: 'invalid-tab' };

    if (groupId === activeGroupId()) {
      await saveActiveGroupNow();
      return { ok: true, copied: false };
    }

    const group = window.TabGroupsState.getGroup(groupId);
    if (!group) return { ok: false, error: 'group-not-found' };

    const tabs = normalizeTabs([...(group.tabs || []), { ...snapshot, active: false }]);
    await window.TabGroupsService.replaceTabs(groupId, tabs);
    return { ok: true, copied: true };
  }

  async function moveTabToGroup(tabId, groupId) {
    const result = await addTabToGroup(tabId, groupId);
    if (!result.ok || groupId === activeGroupId()) return result;

    window.closeTab?.(tabId);
    await saveActiveGroupNow();
    return { ...result, moved: true };
  }

  async function createGroupFromTab(tabId, data = {}) {
    const snapshot = window.TabsCore?.getTabSnapshot?.(tabId);
    if (!snapshot) return null;

    const group = await createGroup(data, { activate: false });
    await window.TabGroupsService.replaceTabs(group.id, [{ ...snapshot, active: true, position: 0 }]);
    return group;
  }

  async function load() {
    if (!window.TabGroupsService || !window.TabGroupsState) return false;
    const groups = await window.TabGroupsService.loadForActiveUser();
    applyActiveGroupStyle();
    return groups.length > 0;
  }

  async function reload() {
    initialized = false;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    await load();
    initialized = true;
    return restoreActiveGroup();
  }

  async function init() {
    if (initialized) return true;
    await load();

    ['app:tab-created', 'app:tab-closed', 'app:tab-changed', 'app:webview-navigated'].forEach((name) => {
      document.addEventListener(name, scheduleSave);
    });
    window.addEventListener('beforeunload', () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      saveActiveGroupNow();
    });
    document.addEventListener('tab-groups:changed', applyActiveGroupStyle);

    initialized = true;
    return true;
  }

  window.TabGroupsRuntime = {
    init,
    reload,
    restoreActiveGroup,
    switchToGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    addTabToGroup,
    moveTabToGroup,
    createGroupFromTab,
    saveActiveGroupNow,
    scheduleSave,
    collectCurrentTabs,
    isEnabled: () => initialized,
    isSwitching: () => switching,
  };
})();
