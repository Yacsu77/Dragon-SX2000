/**
 * Ações do menu para campos de texto editáveis.
 */
(function () {
  /**
   * @param {import('../types/cursorControll.types').CursorContext} context
   * @returns {import('../types/cursorControll.types').CursorMenuAction[]}
   */
  function getActions(context) {
    const webview = context.webview;
    const hasSelection = Boolean(context.selectedText && context.selectedText.trim());
    const isReadOnly = Boolean(context.isReadOnly || context.isDisabled);

    const actions = [
      {
        id: 'paste',
        label: 'Colar',
        icon: 'clipboard-paste',
        shortcut: 'Ctrl+V',
        disabled: isReadOnly,
        execute: async () => {
          await window.CursorClipboardActions?.pasteIntoWebview(webview);
        },
      },
    ];

    if (hasSelection) {
      actions.push(
        {
          id: 'copy-field',
          label: 'Copiar',
          icon: 'copy',
          shortcut: 'Ctrl+C',
          execute: async () => {
            if (context.selectedText?.trim()) {
              await window.CursorClipboardActions?.copyText(context.selectedText);
            } else {
              await window.CursorClipboardActions?.copyFromWebview(webview);
            }
          },
        },
        {
          id: 'cut-field',
          label: 'Cortar',
          icon: 'scissors',
          shortcut: 'Ctrl+X',
          disabled: isReadOnly,
          execute: async () => {
            await window.CursorClipboardActions?.cutFromWebview(webview);
          },
        },
      );
    } else {
      actions.push({
        id: 'copy-field',
        label: 'Copiar',
        icon: 'copy',
        shortcut: 'Ctrl+C',
        disabled: true,
        execute: async () => {},
      });
    }

    actions.push({
      id: 'paste-and-go',
      label: 'Colar e ir',
      icon: 'external-link',
      separatorBefore: true,
      disabled: isReadOnly,
      execute: async () => {
        await window.CursorSearchActions?.pasteAndGo(webview);
      },
    });

    return actions;
  }

  window.CursorTextInputContext = { getActions };
})();
