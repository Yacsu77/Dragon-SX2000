/**
 * Factory — registry de editores Customise por chave.
 * Padrão Factory Method: openFactory(key) → create(key).render(...)
 */
(function () {
  const NS = (window.CustomiseNS = window.CustomiseNS || {});
  if (NS.EditorFactory) return;

  const editors = new Map();

  NS.EditorFactory = {
    /**
     * @param {string} key
     * @param {{ render: Function, teardown?: Function, label?: string }} editor
     */
    register(key, editor) {
      if (!key || !editor || typeof editor.render !== "function") {
        throw new Error("Customise Editor inválido: " + key);
      }
      editors.set(key, editor);
    },

    has(key) {
      return editors.has(key);
    },

    create(key) {
      return editors.get(key) || null;
    },

    keys() {
      return Array.from(editors.keys());
    },
  };
})();
