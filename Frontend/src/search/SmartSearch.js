(function () {
  if (window.SmartSearch) return;

  const controllers = new Set();
  let accessSignalsCache = { at: 0, items: [] };

  function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }

  function looksLikeUrl(value) {
    const raw = String(value || '').trim();
    return /^https?:\/\//i.test(raw) || (raw.includes('.') && !raw.includes(' '));
  }

  function googleUrl(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(String(query || '').trim())}`;
  }

  function siteName(url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, '');
    } catch (_) {
      return String(url || '');
    }
  }

  function originKey(url) {
    try {
      return new URL(url).origin;
    } catch (_) {
      return String(url || '');
    }
  }

  /**
   * Navega na aba atual (padrão do buscador do topo). Converte a aba Home em
   * aba normal quando necessário; sem aba ativa, retorna false para fallback.
   */
  function navigateCurrentTab(url, title) {
    const activeTab = document.querySelector('.tab.active');
    const isHomeTab = Boolean(activeTab?.dataset.id?.startsWith('home-tab'));
    if (isHomeTab && typeof window.convertHomeTabToNormalTab === 'function') {
      window.convertHomeTabToNormalTab(activeTab.dataset.id, url, title || undefined);
      return true;
    }
    const activeWebview = document.querySelector('webview.active');
    if (activeWebview) {
      activeWebview.src = url;
      return true;
    }
    return false;
  }

  function navigate(value, options = {}) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    const isUrl = options.kind === 'site' || looksLikeUrl(raw);
    const url = isUrl ? normalizeUrl(options.url || raw) : googleUrl(options.query || raw);
    const title = isUrl ? null : `Busca: ${raw}`;
    if (isUrl) window.PasswordManager?.armAutoLogin?.(url);
    if (typeof window.setHistoryTransitionType === 'function') {
      window.setHistoryTransitionType(isUrl ? 'typed' : 'search');
    }
    if (typeof options.onNavigate === 'function') {
      options.onNavigate(url, title);
    } else if (options.newTab && typeof window.createTab === 'function') {
      window.createTab(url, title || undefined);
    } else if (navigateCurrentTab(url, title)) {
      // navegou na aba atual
    } else if (typeof window.createTab === 'function') {
      window.createTab(url, title || undefined);
    } else {
      window.open(url, '_blank');
    }
    return true;
  }

  async function loadAccessSignals() {
    if (Date.now() - accessSignalsCache.at < 30000) return accessSignalsCache.items;
    const [cookieOrigins, vaultItems] = await Promise.all([
      window.DragonSession?.listKnownOrigins
        ? window.DragonSession.listKnownOrigins().catch(() => [])
        : Promise.resolve([]),
      window.PasswordVaultAdapter?.listSafe
        ? window.PasswordVaultAdapter.listSafe().catch(() => [])
        : Promise.resolve([]),
    ]);
    const map = new Map();
    cookieOrigins.forEach((url) => {
      map.set(url, {
        type: 'session',
        url,
        title: siteName(url),
        has_session: true,
        has_saved_login: false,
      });
    });
    vaultItems.forEach((item) => {
      const url = item.origin;
      if (!url) return;
      const existing = map.get(url);
      map.set(url, {
        type: existing ? 'session' : 'login',
        url,
        title: siteName(url),
        has_session: Boolean(existing),
        has_saved_login: true,
      });
    });
    accessSignalsCache = { at: Date.now(), items: Array.from(map.values()) };
    return accessSignalsCache.items;
  }

  async function localSignals(query) {
    const term = query.toLowerCase();
    const values = await loadAccessSignals();
    return values.filter((item) => {
      const host = siteName(item.url).toLowerCase();
      const title = String(item.title || '').toLowerCase();
      const url = String(item.url || '').toLowerCase();
      if (host.includes(term) || title.includes(term) || url.includes(term)) return true;
      // Prefixo em labels do domínio (ex.: "sen" → senac.br / autenticacao.sp.senac.br)
      return host.split('.').some((part) => part.startsWith(term));
    });
  }

  async function suggestions(query) {
    const raw = String(query || '').trim();
    if (!raw) return { sites: [], google: [] };
    // Google em paralelo; não espera sinais locais para começar.
    const remotePromise = window.HistoryApi?.smartSuggestions
      ? window.HistoryApi.smartSuggestions(raw).catch(() => ({ sites: [], google: [] }))
      : Promise.resolve({ sites: [], google: [] });
    const signalsPromise = localSignals(raw);
    const [remote, signals] = await Promise.all([remotePromise, signalsPromise]);
    const sites = new Map();
    (remote.sites || []).forEach((item) => sites.set(originKey(item.url), item));
    signals.forEach((item) => {
      const key = originKey(item.url);
      const existing = sites.get(key);
      sites.set(
        key,
        existing
          ? {
              ...item,
              ...existing,
              has_session: item.has_session || existing.has_session,
              has_saved_login: item.has_saved_login || existing.has_saved_login,
            }
          : item
      );
    });
    const ranked = Array.from(sites.values()).sort((a, b) => {
      const aScore =
        (a.visit_count || 0) +
        (a.has_session ? 40 : 0) +
        (a.has_saved_login ? 20 : 0);
      const bScore =
        (b.visit_count || 0) +
        (b.has_session ? 40 : 0) +
        (b.has_saved_login ? 20 : 0);
      return bScore - aScore;
    });
    const local = ranked.slice(0, 6);
    const googleLimit = local.length ? 6 : 8;
    const google = Array.from(new Set(remote.google || [])).slice(0, googleLimit);
    if (!google.length) google.push(raw);
    return { sites: local, google };
  }

  function readPanelSettings() {
    const defaults = {
      animation: 'descida',
      border: 'rgb',
      borderColor: '#7a8cff',
      backgroundOpacity: 82,
      fontScale: 100,
    };
    try {
      const raw = window.UserStorage
        ? window.UserStorage.getItem('customiseSettings')
        : localStorage.getItem('customiseSettings');
      if (!raw) return defaults;
      const record = JSON.parse(raw)?.['dragonsx.smart-search'];
      if (!record || typeof record !== 'object') return defaults;
      const num = (value, min, max, fallback) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.max(min, Math.min(max, parsed));
      };
      return {
        animation: record.animation === 'none' ? 'none' : 'descida',
        border: record.border === 'solid' ? 'solid' : 'rgb',
        borderColor: /^#[0-9a-f]{6}$/i.test(record.borderColor || '')
          ? record.borderColor
          : defaults.borderColor,
        backgroundOpacity: num(record.backgroundOpacity, 40, 100, defaults.backgroundOpacity),
        fontScale: num(record.fontScale, 90, 140, defaults.fontScale),
      };
    } catch (_) {
      return defaults;
    }
  }

  function hexToRgbTriplet(hex) {
    const int = parseInt(String(hex || '').replace('#', ''), 16);
    return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
  }

  function applyPanelSettings(panel, settings) {
    panel.classList.toggle('smart-search-panel--rgb', settings.border === 'rgb');
    panel.style.setProperty('--smart-bg-alpha', String(settings.backgroundOpacity / 100));
    panel.style.setProperty('--smart-font-scale', String(settings.fontScale / 100));
    if (settings.border === 'solid') {
      panel.style.setProperty('--smart-led-rgb', hexToRgbTriplet(settings.borderColor));
    } else {
      panel.style.removeProperty('--smart-led-rgb');
    }
  }

  function attach(input, options = {}) {
    if (!input) return null;
    const mount = options.mount || input.parentElement;
    const panel = document.createElement('div');
    panel.className = `smart-search-panel ${options.className || ''}`.trim();
    panel.hidden = true;
    panel.setAttribute('role', 'listbox');
    mount.appendChild(panel);

    let timer = null;
    let requestId = 0;
    let items = [];
    let activeIndex = -1;
    let inlineItem = null;
    let deleting = false;
    let lastFetchedLen = 0;
    let lastFetchedQuery = '';

    function close() {
      panel.classList.remove('is-open');
      panel.hidden = true;
      items = [];
      activeIndex = -1;
      inlineItem = null;
    }

    /**
     * Posiciona o painel abaixo de um elemento de referência (ex.: a barra de
     * abas no Top), para nunca abrir por cima dele.
     */
    function positionBelowAvoid() {
      if (!options.avoid) return;
      const target =
        typeof options.avoid === 'string'
          ? document.querySelector(options.avoid)
          : options.avoid;
      if (!target) return;
      const targetRect = target.getBoundingClientRect();
      const mountRect = mount.getBoundingClientRect();
      if (targetRect.height <= 0) return;
      const offset = targetRect.bottom - mountRect.top + 12;
      if (offset > 0) panel.style.top = `${offset}px`;
    }

    /**
     * Texto de completação observando o domínio: casa o que foi digitado com
     * o começo do host OU com o início de um label interno. Ex.: digitando
     * "senac" com host "autenticacao.sp.senac.br" completa como "senac.br";
     * digitando "yo" com host "youtube.com" completa como "youtube.com".
     */
    function inlineCompletionFor(host, typed) {
      if (!host || !typed || host === typed) return '';
      if (host.startsWith(typed)) return host;
      const boundary = host.indexOf(`.${typed}`);
      if (boundary >= 0) return host.slice(boundary + 1);
      return '';
    }

    /**
     * Autocomplete inline: completa o input com o domínio do site sugerido,
     * mantendo o trecho completado selecionado (estilo omnibox). Enter entra
     * no site; mudar o texto digitado descarta a recomendação.
     */
    function applyInlineCompletion(query, sites) {
      inlineItem = null;
      if (deleting) return;
      if (document.activeElement !== input) return;
      if (input.value.trim() !== query) return;
      if (input.selectionStart !== input.value.length) return;
      const typed = query.toLowerCase();
      if (!typed) return;
      for (const site of sites || []) {
        const host = siteName(site.url).toLowerCase();
        const completion = inlineCompletionFor(host, typed);
        if (!completion) continue;
        inlineItem = site;
        input.value = query + completion.slice(typed.length);
        input.setSelectionRange(query.length, input.value.length);
        return;
      }
    }

    function activate(index) {
      if (!items.length) return;
      activeIndex = Math.max(0, Math.min(items.length - 1, index));
      panel.querySelectorAll('[data-smart-index]').forEach((el, current) => {
        el.classList.toggle('is-active', current === activeIndex);
        el.setAttribute('aria-selected', current === activeIndex ? 'true' : 'false');
      });
    }

    function select(item) {
      if (!item) return false;
      close();
      input.value = '';
      return navigate(item.type === 'google' ? item.query : item.url, {
        kind: item.type === 'google' ? 'query' : 'site',
        url: item.url,
        query: item.query,
        onNavigate: options.onNavigate,
        newTab: options.newTab,
      });
    }

    function addSection(label, sectionItems) {
      if (!sectionItems.length) return;
      const section = document.createElement('section');
      section.className = 'smart-search-section';
      const heading = document.createElement('div');
      heading.className = 'smart-search-section__title';
      heading.textContent = label;
      section.appendChild(heading);
      sectionItems.forEach((item) => {
        const index = items.length;
        items.push(item);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'smart-search-item';
        button.dataset.smartIndex = String(index);
        button.setAttribute('role', 'option');
        const main = document.createElement('span');
        main.className = 'smart-search-item__main';
        main.textContent = item.title || item.query || item.url;
        const host = item.type !== 'google' && item.url ? siteName(item.url) : '';
        if (host && host !== (item.title || '')) {
          const urlHint = document.createElement('span');
          urlHint.className = 'smart-search-item__url';
          urlHint.textContent = host;
          main.appendChild(urlHint);
        }
        const meta = document.createElement('span');
        meta.className = 'smart-search-item__meta';
        if (item.type === 'google') meta.textContent = 'Google';
        else if (item.has_session) meta.textContent = 'Sessão salva';
        else if (item.has_saved_login) meta.textContent = 'Login salvo';
        else meta.textContent = `${item.visit_count || 1} acessos`;
        button.append(main, meta);
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => select(item));
        section.appendChild(button);
      });
      panel.appendChild(section);
    }

    async function refresh() {
      const query = input.value.trim();
      const id = ++requestId;
      if (!query) {
        lastFetchedLen = 0;
        lastFetchedQuery = '';
        close();
        return;
      }
      lastFetchedLen = query.length;
      lastFetchedQuery = query;
      const result = await suggestions(query);
      // Aceita resultado se ainda for o request mais recente OU se o texto
      // atual ainda começa com a query pedida (digitação rápida).
      const current = input.value.trim();
      if (id !== requestId && !(current.startsWith(query) && query.length >= 3)) return;
      if (id === requestId && current !== query && !current.startsWith(query)) return;
      const settings = readPanelSettings();
      const wasOpen = panel.classList.contains('is-open');
      panel.innerHTML = '';
      items = [];
      activeIndex = -1;
      addSection('Sites visitados e acessos', result.sites || []);
      addSection('Sugestões do Google', (result.google || []).map((value) => ({
        type: 'google',
        query: value,
        title: value,
      })));

      applyPanelSettings(panel, settings);
      // Animação "descida": itens se constroem de cima para baixo, escalonados.
      if (settings.animation === 'descida' && !wasOpen) {
        panel.querySelectorAll('.smart-search-item, .smart-search-section__title').forEach(
          (el, index) => {
            el.classList.add('smart-search-descida');
            el.style.animationDelay = `${Math.min(index * 26, 260)}ms`;
          }
        );
      }

      if (items.length) {
        positionBelowAvoid();
        if (panel.hidden) {
          panel.hidden = false;
          // Reflow para a transição de abertura rodar ao sair de display:none.
          void panel.offsetHeight;
        }
        panel.classList.add('is-open');
      } else {
        close();
      }
      applyInlineCompletion(query, result.sites || []);
    }

    function schedule() {
      clearTimeout(timer);
      const query = input.value.trim();
      if (!query) {
        timer = setTimeout(refresh, 40);
        return;
      }
      const len = query.length;
      if (len < 3) {
        timer = setTimeout(refresh, 120);
        return;
      }
      // A cada 3 letras (3/6/9…): quase imediato; entre marcos: debounce curto.
      const atMilestone = len % 3 === 0 || len - lastFetchedLen >= 3;
      timer = setTimeout(refresh, atMilestone ? 28 : 75);
    }

    function submit() {
      if (activeIndex >= 0 && items[activeIndex]) return select(items[activeIndex]);
      // Enter com autocomplete inline ativo navega para o primeiro site sugerido.
      if (inlineItem && input.selectionEnd === input.value.length && input.selectionStart < input.selectionEnd) {
        return select(inlineItem);
      }
      const raw = input.value.trim();
      close();
      input.value = '';
      return navigate(raw, { onNavigate: options.onNavigate, newTab: options.newTab });
    }

    input.addEventListener('beforeinput', (event) => {
      deleting = typeof event.inputType === 'string' && event.inputType.startsWith('delete');
    });
    input.addEventListener('input', schedule);
    input.addEventListener('focus', () => {
      if (input.value.trim()) schedule();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' && items.length) {
        event.preventDefault();
        activate(activeIndex + 1);
      } else if (event.key === 'ArrowUp' && items.length) {
        event.preventDefault();
        activate(activeIndex <= 0 ? items.length - 1 : activeIndex - 1);
      } else if (event.key === 'Escape') {
        close();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    });
    input.addEventListener('blur', () => setTimeout(close, 120));

    const controller = { close, refresh, submit, destroy: () => panel.remove() };
    controllers.add(controller);
    return controller;
  }

  window.SmartSearch = { attach, suggestions, navigate, googleUrl };
  document.addEventListener('user:changed', () => {
    accessSignalsCache = { at: 0, items: [] };
  });
})();
