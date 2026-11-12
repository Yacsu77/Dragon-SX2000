/**
 * Idioma da interface.
 *
 * A lista é lida uma vez no arranque da sessão e fica em memória.
 * Frase faltando, lista quebrada ou idioma desconhecido usam o inglês.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.Idioma = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const NATIVOS = ["en", "pt", "es"];
  const CHAVE = "dsx.locale";
  const PASTA = "../i18n/listas";

  let ingles = {};
  let ativo = {};
  let codigo = "en";

  function sugerir(language) {
    const base = String(language || "").toLowerCase().split("-")[0];
    return NATIVOS.includes(base) ? base : "en";
  }

  function t(chave) {
    if (ativo && typeof ativo[chave] === "string" && ativo[chave]) return ativo[chave];
    if (ingles && typeof ingles[chave] === "string") return ingles[chave];
    return chave;
  }

  function lerGuardadoPadrao() {
    try {
      return localStorage.getItem(CHAVE);
    } catch {
      return null;
    }
  }

  function guardarPadrao(valor) {
    try {
      localStorage.setItem(CHAVE, valor);
    } catch {
      /* a sessão segue mesmo sem gravar */
    }
  }

  async function lerPadrao(codigoLista) {
    const resposta = await fetch(`${PASTA}/${codigoLista}.json`);
    if (!resposta.ok) throw new Error("lista");
    return resposta.json();
  }

  function avisar() {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("idioma:changed", { detail: { codigo } }));
  }

  function htmlLang(valor) {
    if (valor === "pt") return "pt-BR";
    if (valor === "es") return "es";
    return "en";
  }

  function aplicarDocumento() {
    if (typeof document === "undefined") return;
    document.documentElement.lang = htmlLang(codigo);
  }

  function botoes(container, atual, aoEscolher) {
    if (!container) return;
    container.innerHTML = "";
    [
      ["en", "idioma.ingles"],
      ["pt", "idioma.portugues"],
      ["es", "idioma.espanhol"],
    ].forEach(([id, chave]) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "idioma-escolha__opcao";
      botao.dataset.idioma = id;
      botao.textContent = t(chave);
      if (id === atual) botao.classList.add("is-suggested");
      botao.addEventListener("click", () => aoEscolher(id));
      container.appendChild(botao);
    });
  }

  async function usar(codigoNovo, ler) {
    if (codigoNovo === "en") {
      ativo = ingles;
      codigo = "en";
      return;
    }
    try {
      const mapa = await ler(codigoNovo);
      if (!mapa || typeof mapa !== "object" || Array.isArray(mapa)) throw new Error("lista");
      ativo = mapa;
      codigo = codigoNovo;
    } catch {
      ativo = ingles;
      codigo = "en";
    }
  }

  function aplicar(root) {
    if (typeof document === "undefined") return;
    const base = root && root.querySelectorAll ? root : document;
    base.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    base.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.getAttribute("data-i18n-title"));
    });
    base.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    base.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
  }

  async function preparar(opcoes) {
    const ler = (opcoes && opcoes.ler) || lerPadrao;
    const lerGuardado = (opcoes && opcoes.lerGuardado) || lerGuardadoPadrao;

    try {
      const mapa = await ler("en");
      ingles = mapa && typeof mapa === "object" && !Array.isArray(mapa) ? mapa : {};
    } catch {
      ingles = {};
    }
    ativo = ingles;
    codigo = "en";

    let guardado = lerGuardado();
    if (!guardado || !NATIVOS.includes(guardado)) guardado = "en";
    if (guardado !== "en") await usar(guardado, ler);
    aplicarDocumento();
    aplicar(typeof document !== "undefined" ? document : null);
    return { codigo };
  }

  async function reiniciar(novo) {
    const anterior = codigo;
    const proximo = await definir(novo);
    if (proximo === anterior) return proximo;
    if (typeof window !== "undefined" && window.DragonApp && typeof window.DragonApp.relaunch === "function") {
      await window.DragonApp.relaunch();
    }
    return proximo;
  }

  async function definir(novo, opcoes) {
    const ler = (opcoes && opcoes.ler) || lerPadrao;
    const codigoNovo = NATIVOS.includes(novo) ? novo : "en";
    await usar(codigoNovo, ler);
    if (!opcoes || opcoes.guardar !== false) {
      const guardar = (opcoes && opcoes.guardar) || guardarPadrao;
      guardar(codigo);
    }
    aplicarDocumento();
    avisar();
    return codigo;
  }

  return {
    NATIVOS,
    sugerir,
    t,
    aplicar,
    botoes,
    preparar,
    definir,
    reiniciar,
    codigo: () => codigo,
    guardado: lerGuardadoPadrao,
  };
});
