/**
 * Hooks de export/import (stubs). Implementação real fica para fase futura.
 * Contrato: Backend/API-DSX/Docs/UserBundle.md
 */
(function () {
  async function exportUserBundle(userId) {
    throw new Error('exportUserBundle ainda não implementado (ver UserBundle.md)');
  }

  async function importUserBundle(_bundle) {
    throw new Error('importUserBundle ainda não implementado (ver UserBundle.md)');
  }

  window.UserBundleHooks = {
    exportUserBundle,
    importUserBundle,
  };
})();
