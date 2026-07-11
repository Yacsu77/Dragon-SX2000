/**
 * @typedef {'selected-text' | 'tab' | 'text-input' | 'page' | 'link' | 'unknown'} CursorContextType
 */

/**
 * @typedef {Object} CursorPosition
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} CursorContext
 * @property {CursorContextType} type
 * @property {CursorPosition} position
 * @property {string} [selectedText]
 * @property {string} [linkUrl]
 * @property {string} [linkText]
 * @property {string} [currentUrl]
 * @property {string} [tabId]
 * @property {string} [tabTitle]
 * @property {boolean} [isEditable]
 * @property {boolean} [isReadOnly]
 * @property {boolean} [isDisabled]
 * @property {boolean} [canGoBack]
 * @property {boolean} [canGoForward]
 * @property {boolean} [isMuted]
 * @property {boolean} [isFavorite]
 * @property {import('electron').Electron.WebviewTag} [webview]
 * @property {HTMLElement} [targetElement]
 */

/**
 * @typedef {Object} CursorMenuAction
 * @property {string} id
 * @property {string} label
 * @property {string} [icon]
 * @property {string} [shortcut]
 * @property {boolean} [disabled]
 * @property {boolean} [visible]
 * @property {boolean} [destructive]
 * @property {boolean} [separatorBefore]
 * @property {boolean} [comingSoon]
 * @property {() => void | Promise<void>} execute
 */

/**
 * @typedef {Object} CursorMenuState
 * @property {boolean} isOpen
 * @property {CursorContext | null} context
 * @property {CursorMenuAction[]} actions
 * @property {CursorPosition} position
 */

window.CursorControllTypes = {};
