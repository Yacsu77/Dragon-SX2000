/**
 * Layout do Topo Global.
 * Valores fixos no código. O programador altera DEFAULTS; não há preferência por usuário.
 */
(function () {
  if (window.ChromeLayoutSettings) return;

  const DEFAULT_RIGHT_ORDER = [
    'downloadBtn',
    'arquivosBtn',
    'newTabBtn',
    'configBtn',
    'editarBtn',
  ];

  const DEFAULTS = {
    tabsPosition: 'middle',
    searchSlot: 'center',
    searchWidth: 520,
    rightSlot: 'right',
    rightOrder: DEFAULT_RIGHT_ORDER.slice(),
    rightItems: {
      downloadBtn: true,
      arquivosBtn: true,
      newTabBtn: true,
      configBtn: true,
      editarBtn: true,
    },
    musicPosition: 'right',
    borderColor: '#ffffff',
    borderOpacity: 15,
    activeTabOpacity: 48,
    activeTabLedBorder: false,
  };

  function read() {
    return {
      ...DEFAULTS,
      rightOrder: DEFAULT_RIGHT_ORDER.slice(),
      rightItems: { ...DEFAULTS.rightItems },
    };
  }

  window.ChromeLayoutSettings = {
    DEFAULTS,
    DEFAULT_RIGHT_ORDER,
    read,
    write: read,
    update: read,
    reset: read,
  };
})();
