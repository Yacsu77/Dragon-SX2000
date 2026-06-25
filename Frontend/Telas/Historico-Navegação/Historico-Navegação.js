/**
 * Tela completa de Histórico de Navegação.
 */
(function () {
  const TEMPLATE_PATH = '../Telas/Historico-Navegação/Historico-Navegação.html';
  const PAGE_SIZE = 20;

  let overlayEl = null;
  let screenEl = null;
  let tbodyEl = null;
  let loadingEl = null;
  let errorEl = null;
  let emptyEl = null;
  let tableWrapEl = null;
  let footerEl = null;
  let paginationEl = null;
  let countEl = null;
  let searchEl = null;
  let selectAllEl = null;
  let deleteSelectedBtn = null;
  let confirmEl = null;
  let isOpen = false;
  let isBuilt = false;

  let allItems = [];
  let filteredItems = [];
  let currentPage = 1;
  let searchQuery = '';
  let selectedIds = new Set();
  let lastSelectedIndex = null;

  function formatDateTime(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function getFaviconMarkup(item) {
    if (item.favicon_url) {
      return `<img class="history-screen__favicon" src="${item.favicon_url}" alt="" loading="lazy" />`;
    }
    return '<span class="history-screen__favicon history-screen__favicon--fallback" aria-hidden="true">🌐</span>';
  }

  async function ensureBuilt() {
    if (isBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'history-screen-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');

    const response = await fetch(TEMPLATE_PATH);
    const html = await response.text();
    overlayEl.innerHTML = html.trim();
    screenEl = overlayEl.querySelector('[data-role="history-screen"]');

    tbodyEl = overlayEl.querySelector('[data-role="tbody"]');
    loadingEl = overlayEl.querySelector('[data-role="loading"]');
    errorEl = overlayEl.querySelector('[data-role="error"]');
    emptyEl = overlayEl.querySelector('[data-role="empty"]');
    tableWrapEl = overlayEl.querySelector('[data-role="table-wrap"]');
    footerEl = overlayEl.querySelector('[data-role="footer"]');
    paginationEl = overlayEl.querySelector('[data-role="pagination"]');
    countEl = overlayEl.querySelector('[data-role="count"]');
    searchEl = overlayEl.querySelector('[data-role="search"]');
    selectAllEl = overlayEl.querySelector('[data-role="select-all"]');
    deleteSelectedBtn = overlayEl.querySelector('[data-role="delete-selected"]');
    confirmEl = overlayEl.querySelector('[data-role="confirm"]');

    overlayEl.querySelector('[data-role="close"]').addEventListener('click', close);
    overlayEl.querySelector('[data-role="clear-all"]').addEventListener('click', () => {
      showConfirmDialog(true);
    });
    overlayEl.querySelector('[data-role="confirm-cancel"]').addEventListener('click', () => {
      showConfirmDialog(false);
    });
    overlayEl.querySelector('[data-role="confirm-ok"]').addEventListener('click', async () => {
      showConfirmDialog(false);
      await clearAllHistory();
    });

    confirmEl.addEventListener('click', (e) => {
      if (e.target === confirmEl) showConfirmDialog(false);
    });
    confirmEl.querySelector('.history-screen__confirm-card').addEventListener('click', (e) => {
      e.stopPropagation();
    });

    deleteSelectedBtn.addEventListener('click', deleteSelectedHistoryItems);

    selectAllEl.addEventListener('change', () => {
      const pageItems = getPageItems();
      if (selectAllEl.checked) {
        pageItems.forEach((item) => selectedIds.add(item.id));
      } else {
        pageItems.forEach((item) => selectedIds.delete(item.id));
      }
      updateSelectionUI();
      renderHistoryTable(getPageItems());
    });

    let searchTimeout;
    searchEl.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        searchQuery = searchEl.value.trim();
        currentPage = 1;
        lastSelectedIndex = null;
        await refreshList();
      }, 280);
    });

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });

    document.addEventListener('keydown', (e) => {
      if (isOpen && e.key === 'Escape' && confirmEl && !confirmEl.hidden) {
        e.preventDefault();
        showConfirmDialog(false);
        return;
      }
      if (isOpen && e.key === 'Escape') close();
    });

    document.body.appendChild(overlayEl);
    isBuilt = true;
  }

  function showConfirmDialog(visible) {
    if (!confirmEl) return;
    confirmEl.hidden = !visible;
  }

  function setViewState(state, message) {
    loadingEl.hidden = state !== 'loading';
    errorEl.hidden = state !== 'error';
    emptyEl.hidden = state !== 'empty';
    tableWrapEl.hidden = state !== 'ready';
    footerEl.hidden = state !== 'ready';

    if (state === 'error') errorEl.textContent = message;
  }

  async function fetchHistory() {
    if (!window.HistoryApi) throw new Error('Cliente da API indisponível.');
    return window.HistoryApi.fetchHistory({ page: currentPage, limit: PAGE_SIZE });
  }

  async function fetchHistoryPage(page, limit = PAGE_SIZE) {
    currentPage = page;
    return fetchHistory();
  }

  async function searchHistory(query) {
    if (!window.HistoryApi) throw new Error('Cliente da API indisponível.');
    if (!query) return fetchHistory();
    return window.HistoryApi.searchHistory(query);
  }

  function sortByLastVisit(items) {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.last_visit_time || 0).getTime();
      const bTime = new Date(b.last_visit_time || 0).getTime();
      return bTime - aTime;
    });
  }

  function getPageItems() {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }

  function getTotalPages() {
    return Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  }

  function updateSelectionUI() {
    const pageItems = getPageItems();
    const selectedOnPage = pageItems.filter((item) => selectedIds.has(item.id)).length;
    deleteSelectedBtn.disabled = selectedIds.size === 0;
    selectAllEl.indeterminate = selectedOnPage > 0 && selectedOnPage < pageItems.length;
    selectAllEl.checked = pageItems.length > 0 && selectedOnPage === pageItems.length;
  }

  function renderHistoryTable(historyItems) {
    tbodyEl.innerHTML = '';

    historyItems.forEach((item, indexInPage) => {
      const globalIndex = (currentPage - 1) * PAGE_SIZE + indexInPage;
      const tr = document.createElement('tr');
      tr.className = 'history-screen__row';
      tr.dataset.index = String(globalIndex);
      tr.dataset.id = String(item.id);

      tr.innerHTML = `
        <td class="history-screen__td history-screen__td--check">
          <input type="checkbox" data-role="row-check" data-id="${item.id}" data-index="${globalIndex}"
            ${selectedIds.has(item.id) ? 'checked' : ''} aria-label="Selecionar registro" />
        </td>
        <td class="history-screen__td history-screen__td--icon">${getFaviconMarkup(item)}</td>
        <td class="history-screen__td">
          <button type="button" class="history-screen__link" data-role="open-url" data-url="${item.url}">
            ${item.title || 'Sem título'}
          </button>
        </td>
        <td class="history-screen__td">
          <button type="button" class="history-screen__link history-screen__link--url" data-role="open-url" data-url="${item.url}">
            ${item.url}
          </button>
        </td>
        <td class="history-screen__td">${item.visit_count ?? 0}</td>
        <td class="history-screen__td"><span class="history-screen__badge">${item.transition_type || 'link'}</span></td>
        <td class="history-screen__td">${formatDateTime(item.last_visit_time)}</td>
        <td class="history-screen__td history-screen__td--actions">
          <button type="button" class="history-screen__delete-one" data-role="delete-one" data-id="${item.id}" title="Apagar">×</button>
        </td>
      `;

      const checkbox = tr.querySelector('[data-role="row-check"]');
      checkbox.addEventListener('click', (e) => handleShiftSelection(globalIndex, e));

      tr.querySelectorAll('[data-role="open-url"]').forEach((btn) => {
        btn.addEventListener('click', () => openUrlFromHistory(btn.dataset.url));
      });

      tr.querySelector('[data-role="delete-one"]').addEventListener('click', () => {
        deleteHistoryItem(item.id);
      });

      tbodyEl.appendChild(tr);
    });

    updateSelectionUI();
  }

  function renderPagination() {
    const totalPages = getTotalPages();
    paginationEl.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'history-screen__page-btn';
    prevBtn.textContent = '‹';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    paginationEl.appendChild(prevBtn);

    for (let page = 1; page <= totalPages; page += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-screen__page-btn';
      if (page === currentPage) btn.classList.add('is-active');
      btn.textContent = String(page);
      btn.addEventListener('click', () => goToPage(page));
      paginationEl.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'history-screen__page-btn';
    nextBtn.textContent = '›';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    paginationEl.appendChild(nextBtn);

    const start = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, filteredItems.length);
    countEl.textContent = `Mostrando ${start}–${end} de ${filteredItems.length} registros`;
  }

  async function goToPage(page) {
    const totalPages = getTotalPages();
    currentPage = Math.min(Math.max(page, 1), totalPages);
    renderHistoryTable(getPageItems());
    renderPagination();
  }

  function toggleHistorySelection(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    updateSelectionUI();
  }

  function handleShiftSelection(currentIndex, event) {
    const checkbox = event.target;
    const id = Number(checkbox.dataset.id);

    if (event.shiftKey && lastSelectedIndex !== null) {
      event.preventDefault();
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);

      for (let i = start; i <= end; i += 1) {
        const item = filteredItems[i];
        if (item) selectedIds.add(item.id);
      }

      renderHistoryTable(getPageItems());
      updateSelectionUI();
    } else {
      if (checkbox.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      updateSelectionUI();
    }

    lastSelectedIndex = currentIndex;
  }

  async function deleteHistoryItem(id) {
    try {
      await window.HistoryApi.deleteHistoryItem(id);
      selectedIds.delete(id);
      await refreshList();
    } catch (err) {
      setViewState('error', err.message);
    }
  }

  async function deleteSelectedHistoryItems() {
    if (selectedIds.size === 0) return;

    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => window.HistoryApi.deleteHistoryItem(id)));
      selectedIds.clear();
      lastSelectedIndex = null;
      await refreshList();
    } catch (err) {
      setViewState('error', err.message);
    }
  }

  async function clearAllHistory() {
    try {
      await window.HistoryApi.clearAllHistory();
      selectedIds.clear();
      lastSelectedIndex = null;
      await refreshList();
    } catch (err) {
      setViewState('error', err.message);
    }
  }

  function openUrlFromHistory(url) {
    if (typeof window.openUrlFromHistory === 'function') {
      window.openUrlFromHistory(url);
    }
  }

  async function refreshList() {
    setViewState('loading');

    try {
      allItems = searchQuery ? await searchHistory(searchQuery) : await fetchHistory();
      filteredItems = sortByLastVisit(allItems);

      if (filteredItems.length === 0) {
        setViewState('empty');
        return;
      }

      const totalPages = getTotalPages();
      if (currentPage > totalPages) currentPage = totalPages;

      setViewState('ready');
      renderHistoryTable(getPageItems());
      renderPagination();
    } catch (err) {
      setViewState('error', err.message);
    }
  }

  async function open() {
    await ensureBuilt();
    isOpen = true;
    showConfirmDialog(false);
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');
    searchQuery = '';
    searchEl.value = '';
    currentPage = 1;
    selectedIds.clear();
    lastSelectedIndex = null;
    await refreshList();
    searchEl.focus();
  }

  function focus() {
    if (!isOpen) return open();
    searchEl.focus();
  }

  function close() {
    if (!overlayEl) return;
    isOpen = false;
    showConfirmDialog(false);
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
  }

  function isOpenScreen() {
    return isOpen;
  }

  window.HistoryScreen = {
    open,
    close,
    focus,
    isOpen: isOpenScreen,
    fetchHistory,
    fetchHistoryPage,
    searchHistory,
    renderHistoryTable,
    renderPagination,
    toggleHistorySelection,
    deleteHistoryItem,
    deleteSelectedHistoryItems,
    clearAllHistory,
    openUrlFromHistory,
    handleShiftSelection,
  };
})();
