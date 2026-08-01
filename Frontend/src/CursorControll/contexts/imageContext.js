/**
 * Ações do menu para imagens.
 */
(function () {
  /**
   * @param {import('../types/cursorControll.types').CursorContext} context
   * @returns {import('../types/cursorControll.types').CursorMenuAction[]}
   */
  function getActions(context) {
    const imageUrl = context.imageUrl || '';
    const hasImage = Boolean(imageUrl);

    return [
      {
        id: 'download-image',
        label: 'Baixar imagem',
        icon: 'download',
        disabled: !hasImage,
        execute: async () => {
          await window.CursorDownloadActions?.downloadImage({
            url: imageUrl,
            mode: 'downloads',
            context,
            position: context.position,
          });
        },
      },
      {
        id: 'download-image-as',
        label: 'Baixar como…',
        icon: 'folder-down',
        disabled: !hasImage,
        execute: async () => {
          await window.CursorDownloadActions?.downloadImage({
            url: imageUrl,
            mode: 'save-as',
            context,
            position: context.position,
          });
        },
      },
      {
        id: 'copy-image-address',
        label: 'Copiar endereço da imagem',
        icon: 'link',
        separatorBefore: true,
        disabled: !hasImage,
        execute: async () => {
          await window.CursorClipboardActions?.copyText(imageUrl);
        },
      },
      {
        id: 'open-image-new-tab',
        label: 'Abrir imagem em nova aba',
        icon: 'square-plus',
        disabled: !hasImage,
        execute: async () => {
          await window.CursorLinkActions?.openInNewTab(
            context.tabId || '',
            imageUrl,
            'Imagem'
          );
        },
      },
    ];
  }

  window.CursorImageContext = { getActions };
})();
