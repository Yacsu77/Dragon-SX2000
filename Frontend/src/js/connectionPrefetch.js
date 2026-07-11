/**
 * ConnectionPrefetch — aquece DNS/conexão do provável destino enquanto o
 * usuário digita, reduzindo o tempo até o primeiro byte quando ele confirma.
 *
 * Estratégia (padrão, sempre ativo):
 *   - `dns-prefetch` resolve o hostname antecipadamente (cache do resolvedor
 *     do SO, compartilhado com os webviews).
 *   - `preconnect` tenta abrir TCP/TLS antecipadamente (melhor esforço).
 * Debounced e deduplicado; mantém só as dicas mais recentes no <head>.
 *
 * Responsabilidade única: transformar o que está sendo digitado em dicas de
 * conexão. Não navega nem cria abas.
 */
(function () {
  const DEBOUNCE_MS = 220;
  const MAX_HINTS = 6;

  let debounceTimer = null;
  const injected = new Map(); // origin → [linkEls]

  function looksLikeHost(value) {
    return value.includes('.') && !value.includes(' ');
  }

  function toOrigin(raw) {
    const value = (raw || '').trim();
    if (!value || !looksLikeHost(value)) return null;
    try {
      const url = /^https?:\/\//i.test(value) ? new URL(value) : new URL(`https://${value}`);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      if (!url.hostname.includes('.')) return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  function pruneOldest() {
    while (injected.size > MAX_HINTS) {
      const oldestKey = injected.keys().next().value;
      const els = injected.get(oldestKey) || [];
      els.forEach((el) => el.remove());
      injected.delete(oldestKey);
    }
  }

  function addHint(origin) {
    if (injected.has(origin)) return;

    const dns = document.createElement('link');
    dns.rel = 'dns-prefetch';
    dns.href = origin;

    const pre = document.createElement('link');
    pre.rel = 'preconnect';
    pre.href = origin;
    pre.crossOrigin = 'anonymous';

    document.head.appendChild(dns);
    document.head.appendChild(pre);
    injected.set(origin, [dns, pre]);
    pruneOldest();
  }

  function hint(raw) {
    const origin = toOrigin(raw);
    if (origin) addHint(origin);
  }

  function onInput(event) {
    const target = event.target;
    if (!target || target.id !== 'addressInput') return;
    clearTimeout(debounceTimer);
    const value = target.value;
    debounceTimer = setTimeout(() => hint(value), DEBOUNCE_MS);
  }

  function init() {
    // Delegação: cobre a barra do topo (que também é a busca da home).
    document.addEventListener('input', onInput);
  }

  window.ConnectionPrefetch = { init, hint };
})();
