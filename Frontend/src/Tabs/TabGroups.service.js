/**
 * Persistência de grupos de abas via API-DSX.
 */
(function () {
  if (window.TabGroupsService) return;

  function activeUserId() {
    return window.UserSession?.getActiveUserId?.() || null;
  }

  function requireActiveUserId() {
    const userId = activeUserId();
    if (!userId) throw new Error('Usuário ativo não encontrado');
    return userId;
  }

  async function list() {
    const userId = requireActiveUserId();
    return window.TabGroupsApi.list(userId);
  }

  async function createGroup(data = {}) {
    const userId = requireActiveUserId();
    const group = await window.TabGroupsApi.create({
      ...window.TabGroupsState.DEFAULT_GROUP,
      ...data,
      user_id: userId,
    });
    window.TabGroupsState.upsertGroup(group);
    return group;
  }

  async function updateGroup(id, patch) {
    const userId = requireActiveUserId();
    const group = await window.TabGroupsApi.update(id, userId, patch);
    window.TabGroupsState.upsertGroup(group);
    return group;
  }

  async function deleteGroup(id) {
    const userId = requireActiveUserId();
    await window.TabGroupsApi.remove(id, userId);
    window.TabGroupsState.removeGroup(id);
  }

  async function replaceTabs(groupId, tabs) {
    const userId = requireActiveUserId();
    const group = await window.TabGroupsApi.replaceTabs(groupId, {
      user_id: userId,
      tabs: Array.isArray(tabs) ? tabs : [],
    });
    window.TabGroupsState.upsertGroup(group);
    return group;
  }

  async function loadForActiveUser() {
    const groups = await list();
    if (groups.length) {
      window.TabGroupsState.setGroups(groups, groups[0].id);
      return groups;
    }

    const group = await createGroup(window.TabGroupsState.DEFAULT_GROUP);
    window.TabGroupsState.setGroups([group], group.id);
    return [group];
  }

  window.TabGroupsService = {
    list,
    loadForActiveUser,
    createGroup,
    updateGroup,
    deleteGroup,
    replaceTabs,
  };
})();
