'use strict';

/**
 * GuestWebviewAttach — wiring de <webview> guest: prefs, OAuth popup, UA no filho.
 *
 * Atalhos globais no guest ficam injetados via deps (DIP) — domínio shortcuts
 * ainda vive na main até a Fase 6.
 *
 * Não faz: createBrowserWindow, IPC de Janelas.
 */
class GuestWebviewAttach {
  /**
   * @param {{
   *   sessionHardener: import('./SessionHardener').SessionHardener,
   *   userAgentPolicy: import('./UserAgentPolicy').UserAgentPolicy,
   *   popupPolicy: import('./AuthPopupPolicy').AuthPopupPolicy,
   * }} deps
   */
  constructor({ sessionHardener, userAgentPolicy, popupPolicy }) {
    this._hardener = sessionHardener;
    this._ua = userAgentPolicy;
    this._popup = popupPolicy;
  }

  /**
   * @param {Electron.BrowserWindow} win
   * @param {{
   *   getPressCombos?: (hostWcId: number) => Set<string>|undefined,
   *   getHoldCombos?: (hostWcId: number) => Set<string>|undefined,
   *   comboFromInput?: (input: object) => string,
   * }} [shortcutDeps]
   */
  attach(win, shortcutDeps = {}) {
    if (!win || win.isDestroyed()) return;

    win.webContents.on('will-attach-webview', (_event, webPreferences) => {
      try {
        webPreferences.plugins = true;
        webPreferences.backgroundThrottling = false;
        webPreferences.autoplayPolicy = 'no-user-gesture-required';
      } catch (_) {
        /* ignore */
      }
    });

    win.webContents.on('did-attach-webview', (_event, guestWebContents) => {
      try {
        if (typeof guestWebContents.setMaxListeners === 'function') {
          guestWebContents.setMaxListeners(32);
        }
      } catch (_) {
        /* ignore */
      }

      guestWebContents.setWindowOpenHandler((details) => {
        const { url } = details || {};

        if (this._popup.shouldAllowNative(details)) {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: this._popup.windowOptions(win),
          };
        }

        if (this._popup.isAllowedNavigationUrl(url) && !win.isDestroyed()) {
          win.webContents.send('browser:open-url', url);
        }
        return { action: 'deny' };
      });

      guestWebContents.on('did-create-window', (childWindow, details) => {
        try {
          if (!childWindow || childWindow.isDestroyed()) return;
          const childWc = childWindow.webContents;
          this._hardener.harden(childWc.session);
          if (typeof childWc.setMaxListeners === 'function') {
            childWc.setMaxListeners(32);
          }
          const applyUa = (navUrl) => {
            try {
              if (navUrl && typeof childWc.setUserAgent === 'function') {
                childWc.setUserAgent(this._ua.forUrl(navUrl));
              }
            } catch (_) {
              /* ignore */
            }
          };
          applyUa(details?.url || childWc.getURL());
          childWc.on(
            'did-start-navigation',
            (_e, navUrl, _inPlace, isMainFrame) => {
              if (isMainFrame) applyUa(navUrl);
            }
          );
        } catch (err) {
          console.warn('[DSX] oauth popup hook:', err?.message || err);
        }
      });

      const {
        getPressCombos,
        getHoldCombos,
        comboFromInput,
      } = shortcutDeps;

      if (
        typeof getPressCombos === 'function' &&
        typeof getHoldCombos === 'function' &&
        typeof comboFromInput === 'function'
      ) {
        guestWebContents.on('before-input-event', (inputEvent, input) => {
          if (win.isDestroyed()) return;

          const combos = getPressCombos(win.webContents.id);
          const holdCombos = getHoldCombos(win.webContents.id);
          if (
            (!combos || combos.size === 0) &&
            (!holdCombos || holdCombos.size === 0)
          ) {
            return;
          }

          const combo = comboFromInput(input);
          if (!combo) return;

          const isHold = holdCombos && holdCombos.has(combo);
          const isPress = combos && combos.has(combo);

          if (input.type === 'keyDown' && (isPress || isHold)) {
            inputEvent.preventDefault();
            win.webContents.send('shortcuts:global-combo', {
              combo,
              phase: 'down',
            });
            return;
          }

          if (input.type === 'keyUp' && isHold) {
            inputEvent.preventDefault();
            win.webContents.send('shortcuts:global-combo', {
              combo,
              phase: 'up',
            });
          }
        });
      }
    });
  }
}

module.exports = { GuestWebviewAttach };
