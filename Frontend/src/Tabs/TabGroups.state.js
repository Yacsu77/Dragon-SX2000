/**
 * Estado compartilhado de grupos de abas.
 */
(function () {
  if (window.TabGroupsState) return;

  const DEFAULT_GROUP = {
    name: 'Principal',
    color: '#7a8cff',
    icon: 'folder',
    position: 0,
    tabs: [],
  };

  let groups = [];
  let activeGroupId = null;
  let ready = false;

  function cloneGroup(group) {
    return {
      ...group,
      tabs: Array.isArray(group.tabs) ? group.tabs.map((tab) => ({ ...tab })) : [],
    };
  }

  function emit(type, detail = {}) {
    document.dispatchEvent(new CustomEvent(`tab-groups:${type}`, { detail }));
  }

  function sortGroups(list) {
    return list
      .slice()
      .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
  }

  function getGroups() {
    return groups.map(cloneGroup);
  }

  function getGroup(id) {
    const group = groups.find((item) => item.id === id);
    return group ? cloneGroup(group) : null;
  }

  function getActiveGroup() {
    return getGroup(activeGroupId);
  }

  function getActiveGroupId() {
    return activeGroupId;
  }

  function setGroups(nextGroups, nextActiveGroupId = activeGroupId) {
    groups = sortGroups(Array.isArray(nextGroups) ? nextGroups.map(cloneGroup) : []);
    activeGroupId = nextActiveGroupId || groups[0]?.id || null;
    ready = true;
    emit('changed', { groups: getGroups(), activeGroupId });
  }

  function setActiveGroupId(id) {
    if (!id || activeGroupId === id) return;
    activeGroupId = id;
    emit('active-changed', { activeGroupId, group: getActiveGroup() });
    emit('changed', { groups: getGroups(), activeGroupId });
  }

  function upsertGroup(group) {
    if (!group?.id) return;
    const index = groups.findIndex((item) => item.id === group.id);
    if (index >= 0) {
      groups[index] = cloneGroup(group);
    } else {
      groups.push(cloneGroup(group));
    }
    groups = sortGroups(groups);
    if (!activeGroupId) activeGroupId = group.id;
    emit('changed', { groups: getGroups(), activeGroupId });
  }

  function removeGroup(id) {
    groups = groups.filter((group) => group.id !== id);
    if (activeGroupId === id) {
      activeGroupId = groups[0]?.id || null;
    }
    emit('changed', { groups: getGroups(), activeGroupId });
  }

  function replaceGroupTabs(id, tabs) {
    const index = groups.findIndex((group) => group.id === id);
    if (index < 0) return;
    groups[index] = {
      ...groups[index],
      tabs: Array.isArray(tabs) ? tabs.map((tab, position) => ({ ...tab, position })) : [],
    };
    emit('changed', { groups: getGroups(), activeGroupId });
  }

  window.TabGroupsState = {
    DEFAULT_GROUP,
    getGroups,
    getGroup,
    getActiveGroup,
    getActiveGroupId,
    isReady: () => ready,
    setGroups,
    setActiveGroupId,
    upsertGroup,
    removeGroup,
    replaceGroupTabs,
  };
})();
