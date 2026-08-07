/**
 * Reordenação de abas por drag-and-drop.
 * Um único pointermove/up no document (não por aba) + processamento 1× por frame.
 */
(function () {
  const DRAG_THRESHOLD = 5;

  /** @type {null | object} */
  let session = null;
  let listenersBound = false;
  let moveRaf = 0;
  let pendingMoveEvent = null;

  function ensureGlobalListeners() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener('pointermove', onGlobalPointerMove, { passive: true });
    document.addEventListener('pointerup', onGlobalPointerUp);
    document.addEventListener('pointercancel', onGlobalPointerUp);
  }

  function onGlobalPointerMove(e) {
    if (!session) return;
    pendingMoveEvent = e;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(() => {
      moveRaf = 0;
      const ev = pendingMoveEvent;
      pendingMoveEvent = null;
      if (ev && session) processPointerMove(ev);
    });
  }

  function onGlobalPointerUp(e) {
    if (!session) return;
    if (
      session.activePointerId != null &&
      e.pointerId != null &&
      e.pointerId !== session.activePointerId &&
      session.hasStartedDrag
    ) {
      return;
    }
    finishPointerUp();
  }

  function clearInlineDragStyles(tabElement) {
    tabElement.classList.remove('dragging');
    tabElement.style.zIndex = '';
    tabElement.style.position = '';
    tabElement.style.left = '';
    tabElement.style.top = '';
    tabElement.style.width = '';
    tabElement.style.height = '';
    tabElement.style.pointerEvents = '';
    tabElement.style.opacity = '';
    tabElement.style.visibility = '';
  }

  function positionGhost(s, clientX, clientY) {
    if (!s.dragGhost) return;
    s.dragGhost.style.left = `${clientX - s.mouseOffsetX}px`;
    s.dragGhost.style.top = `${clientY - s.mouseOffsetY}px`;
  }

  function ensureDragShield(s, pointerId) {
    if (s.dragShield) return s.dragShield;
    s.dragShield = document.createElement('div');
    s.dragShield.className = 'janelas-drag-shield';
    s.dragShield.setAttribute('aria-hidden', 'true');
    document.body.appendChild(s.dragShield);
    if (pointerId != null && s.dragShield.setPointerCapture) {
      try {
        s.dragShield.setPointerCapture(pointerId);
        s.activePointerId = pointerId;
      } catch (_) {
        /* ignore */
      }
    }
    return s.dragShield;
  }

  function removeDragShield(s) {
    if (!s?.dragShield) return;
    if (s.activePointerId != null && s.dragShield.releasePointerCapture) {
      try {
        s.dragShield.releasePointerCapture(s.activePointerId);
      } catch (_) {
        /* ignore */
      }
    }
    s.activePointerId = null;
    s.dragShield.remove();
    s.dragShield = null;
  }

  function startOsGhost(s, tabId, mode) {
    const tabElement = s.tabElement;
    const titleSpan = tabElement.querySelector('.tab-title');
    const faviconImg = tabElement.querySelector('.tab-icon img');
    const thumb = window.JanelasNS?.ThumbnailCache?.getCached?.(tabId) || null;
    const nextMode = mode || 'tab';
    s.usingOsGhost = !!window.JanelasNS?.OsDragGhost?.start?.({
      title: titleSpan?.textContent?.trim() || 'Aba',
      favicon: faviconImg?.src || null,
      thumbnail: thumb,
      mode: nextMode,
      width: nextMode === 'detach' ? 168 : s.ghostWidth,
      height: nextMode === 'detach' ? 128 : s.ghostHeight,
      offsetX: s.mouseOffsetX,
      offsetY: s.mouseOffsetY,
    });
  }

  function syncOsGhostMode(s, clientX, clientY) {
    const hovering = Boolean(
      window.JanelasNS?.TransferController?.isHoveringTarget?.()
    );
    const armed = Boolean(window.JanelasNS?.DetachController?.isArmed?.());
    const outside = Boolean(
      window.JanelasNS?.DetachThreshold?.isOutsideViewport?.(clientX, clientY)
    );
    const inLocalTabs = Boolean(
      window.JanelasNS?.DetachThreshold?.isInLocalTabsZone?.(clientX, clientY)
    );

    let mode = 'tab';
    if (hovering) mode = 'transfer';
    else if (armed) mode = 'detach';

    const needOs = !inLocalTabs || outside || hovering;
    const tabId = s.tabElement.dataset.id;
    const titleSpan = s.tabElement.querySelector('.tab-title');
    const faviconImg = s.tabElement.querySelector('.tab-icon img');
    const payload = {
      thumbnail: window.JanelasNS?.ThumbnailCache?.getCached?.(tabId) || null,
      title: titleSpan?.textContent?.trim() || 'Aba',
      favicon: faviconImg?.src || null,
      width: mode === 'detach' ? 168 : s.ghostWidth,
      height: mode === 'detach' ? 128 : s.ghostHeight,
    };

    if (needOs) {
      if (!s.usingOsGhost) startOsGhost(s, tabId, mode);
      else window.JanelasNS?.OsDragGhost?.setMode?.(mode, payload);
      if (s.dragGhost) {
        s.dragGhost.style.opacity = '0';
        s.dragGhost.style.pointerEvents = 'none';
      }
    } else {
      if (s.usingOsGhost) endOsGhost(s);
      if (s.dragGhost) {
        s.dragGhost.style.opacity = '1';
      }
    }
  }

  function endOsGhost(s) {
    if (!s?.usingOsGhost) return;
    window.JanelasNS?.OsDragGhost?.end?.();
    s.usingOsGhost = false;
  }

  function beginDragVisual(s, e) {
    const tabElement = s.tabElement;
    window.JanelasNS?.TabPreview?.hide?.();
    window.JanelasNS?.DetachController?.reset?.();
    window.JanelasNS?.ThumbnailCache?.pause?.();
    window.JanelasNS?.TransferController?.beginDrag?.();
    ensureDragShield(s, e.pointerId != null ? e.pointerId : s.activePointerId);

    tabElement.classList.add('dragging');

    s.dragGhost = document.createElement('div');
    s.dragGhost.classList.add('tab-drag-ghost');

    const iconSpan = tabElement.querySelector('.tab-icon');
    const titleSpan = tabElement.querySelector('.tab-title');

    const ghostIcon = document.createElement('span');
    ghostIcon.classList.add('tab-icon');
    if (iconSpan) {
      const img = iconSpan.querySelector('img');
      if (img) ghostIcon.appendChild(img.cloneNode(true));
      else ghostIcon.textContent = iconSpan.textContent;
    }

    const ghostTitle = document.createElement('span');
    ghostTitle.classList.add('tab-title');
    if (titleSpan) ghostTitle.textContent = titleSpan.textContent;

    s.dragGhost.appendChild(ghostIcon);
    s.dragGhost.appendChild(ghostTitle);
    s.dragGhost.style.width = `${s.ghostWidth}px`;
    s.dragGhost.style.height = `${s.ghostHeight}px`;
    s.dragGhost.style.opacity = '1';
    positionGhost(s, e.clientX, e.clientY);
    document.body.appendChild(s.dragGhost);

    syncOsGhostMode(s, e.clientX, e.clientY);

    s.placeholder = document.createElement('div');
    s.placeholder.classList.add('tab-placeholder');
    s.placeholder.style.width = `${s.ghostWidth}px`;
    s.placeholder.style.height = `${s.ghostHeight}px`;
    s.tabsContainer.insertBefore(s.placeholder, tabElement);
    s.tabsContainer.classList.add('dragging-tabs');
  }

  /** Uma passada de getBoundingClientRect por aba (por frame). */
  function buildVisibleTabMetrics(s, containerRect) {
    const tabElement = s.tabElement;
    return s.tabsOrder
      .filter((tab) => tab !== tabElement)
      .map((tab) => {
        const rect = tab.getBoundingClientRect();
        return {
          element: tab,
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          mid: (rect.left + rect.right) / 2 - containerRect.left,
          orderIndex: s.tabsOrder.indexOf(tab),
        };
      })
      .sort((a, b) => a.left - b.left);
  }

  function processPointerMove(e) {
    const s = session;
    if (!s) return;

    if (!s.hasStartedDrag && s.tabsContainer) {
      const deltaX = Math.abs(e.clientX - s.dragStartX);
      const deltaY = Math.abs(e.clientY - s.dragStartY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > DRAG_THRESHOLD) {
        s.hasStartedDrag = true;
        s.isDragging = true;
        beginDragVisual(s, e);
      } else {
        return;
      }
    }

    if (!s.isDragging) return;

    const tabElement = s.tabElement;
    const tabsContainer = s.tabsContainer;
    const containerRect = tabsContainer.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const tabId = tabElement.dataset.id;

    positionGhost(s, e.clientX, e.clientY);
    s.lastClientX = e.clientX;
    s.lastClientY = e.clientY;

    const hoveringTransfer = Boolean(
      window.JanelasNS?.TransferController?.isHoveringTarget?.()
    );
    const inLocalTabs = Boolean(
      window.JanelasNS?.DetachThreshold?.isInLocalTabsZone?.(e.clientX, e.clientY)
    );
    const splitSide = window.JanelasNS?.SplitDropController?.onDragMove?.({
      clientX: e.clientX,
      clientY: e.clientY,
      tabId,
    });

    if (window.JanelasNS?.DetachController) {
      window.JanelasNS.DetachController.onDragMove({
        clientX: e.clientX,
        clientY: e.clientY,
        tabId,
        ghostEl: s.dragGhost,
        hoveringTransfer,
      });
    }

    if (window.JanelasNS?.TransferController?.onDragMove) {
      window.JanelasNS.TransferController.onDragMove({
        tabId,
        ghostEl: s.dragGhost,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }

    syncOsGhostMode(s, e.clientX, e.clientY);

    if (!inLocalTabs || hoveringTransfer || splitSide) {
      if (s.placeholder) s.placeholder.classList.add('tab-placeholder--hidden');
      return;
    }

    if (s.placeholder) s.placeholder.classList.remove('tab-placeholder--hidden');

    const visibleTabs = buildVisibleTabMetrics(s, containerRect);
    let newIndex = s.currentIndex;

    if (visibleTabs.length === 0) {
      newIndex = 0;
    } else if (mouseX < visibleTabs[0].left) {
      newIndex = 0;
    } else if (mouseX > visibleTabs[visibleTabs.length - 1].right) {
      newIndex = s.tabsOrder.length - 1;
    } else {
      for (let i = 0; i < visibleTabs.length; i++) {
        const tab = visibleTabs[i];
        if (mouseX >= tab.left && mouseX <= tab.right) {
          newIndex = mouseX < tab.mid ? tab.orderIndex : tab.orderIndex + 1;
          break;
        }
        if (
          i < visibleTabs.length - 1 &&
          mouseX > tab.right &&
          mouseX < visibleTabs[i + 1].left
        ) {
          newIndex = tab.orderIndex + 1;
          break;
        }
      }
    }

    newIndex = Math.max(0, Math.min(newIndex, s.tabsOrder.length - 1));

    if (newIndex !== s.currentIndex) {
      s.tabsOrder.splice(s.currentIndex, 1);
      s.tabsOrder.splice(newIndex, 0, tabElement);
      s.currentIndex = newIndex;

      if (s.placeholder && s.placeholder.parentNode) {
        s.placeholder.remove();
      }

      if (!s.placeholder) {
        s.placeholder = document.createElement('div');
        s.placeholder.classList.add('tab-placeholder');
        s.placeholder.style.width = `${s.ghostWidth}px`;
        s.placeholder.style.height = `${s.ghostHeight}px`;
      }

      if (newIndex === 0) {
        tabsContainer.insertBefore(s.placeholder, tabsContainer.firstChild);
      } else if (newIndex < s.tabsOrder.length - 1) {
        const nextTab = s.tabsOrder[newIndex + 1];
        if (nextTab && nextTab.parentNode === tabsContainer) {
          tabsContainer.insertBefore(s.placeholder, nextTab);
        } else {
          tabsContainer.appendChild(s.placeholder);
        }
      } else {
        tabsContainer.appendChild(s.placeholder);
      }

      s.tabsOrder.forEach((tab, index) => {
        if (tab !== tabElement && tab.parentNode === tabsContainer) {
          const currentPos = Array.from(tabsContainer.children).indexOf(tab);
          if (currentPos !== index) {
            if (!tab.style.transition || !tab.style.transition.includes('transform')) {
              tab.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }

            if (index === 0) {
              if (
                tabsContainer.firstChild !== tab &&
                tabsContainer.firstChild !== s.placeholder
              ) {
                tabsContainer.insertBefore(tab, tabsContainer.firstChild);
              }
            } else {
              let referenceNode = null;
              for (let i = index - 1; i >= 0; i--) {
                const prevTab = s.tabsOrder[i];
                if (prevTab === s.placeholder && s.placeholder.parentNode) {
                  referenceNode = s.placeholder.nextSibling;
                  break;
                } else if (prevTab !== tabElement && prevTab.parentNode === tabsContainer) {
                  referenceNode = prevTab.nextSibling;
                  break;
                }
              }
              if (referenceNode && tab.nextSibling !== referenceNode) {
                tabsContainer.insertBefore(tab, referenceNode);
              } else if (!referenceNode) {
                tabsContainer.appendChild(tab);
              }
            }
          }
        }
      });
    }

    if (window.TabsAnim) {
      window.TabsAnim.applyDragEffects(tabsContainer, tabElement, e.clientX);
    }
  }

  function cleanupSessionUi(s, handled) {
    if (!s) return;
    const tabElement = s.tabElement;
    const tabsContainer = s.tabsContainer;

    if (s.placeholder) {
      if (s.placeholder.parentNode && !handled && tabsContainer) {
        tabsContainer.insertBefore(tabElement, s.placeholder);
      }
      s.placeholder.remove();
      s.placeholder = null;
    }

    if (s.dragGhost) {
      s.dragGhost.remove();
      s.dragGhost = null;
    }

    removeDragShield(s);
    endOsGhost(s);
    window.JanelasNS?.WindowBridge?.clearDragHover?.();
    window.JanelasNS?.DropIndicator?.hide?.();
    window.JanelasNS?.SplitDropController?.endDrag?.();
    window.JanelasNS?.DetachController?.reset?.();
    window.JanelasNS?.TransferController?.endDrag?.();
    window.JanelasNS?.ThumbnailCache?.resume?.();
    clearInlineDragStyles(tabElement);

    if (tabsContainer) {
      tabsContainer.classList.remove('dragging-tabs');
      if (window.TabsAnim) {
        window.TabsAnim.clearDragEffects(tabsContainer);
      }
    }

    if (window.TabsVisibility) {
      window.TabsVisibility.scheduleVisibilityUpdate();
    }
  }

  async function finishPointerUp() {
    const s = session;
    if (!s) return;

    if (!s.hasStartedDrag) {
      session = null;
      pendingMoveEvent = null;
      return;
    }

    if (!s.isDragging) {
      session = null;
      return;
    }

    s.isDragging = false;
    s.hasStartedDrag = false;
    // Impede novos moves enquanto await transfer/detach
    session = null;
    pendingMoveEvent = null;

    const tabElement = s.tabElement;
    const tabsContainer = s.tabsContainer;
    const tabId = tabElement.dataset.id;
    let handled = false;

    if (window.JanelasNS?.TransferController?.onDragEnd) {
      try {
        handled = await window.JanelasNS.TransferController.onDragEnd({ tabId });
      } catch (_) {
        handled = false;
      }
    }

    // Split drop (antes do detach): swap com painel E/D
    if (!handled && window.JanelasNS?.SplitDropController?.onDragEnd) {
      try {
        handled = Boolean(
          window.JanelasNS.SplitDropController.onDragEnd({
            tabId,
            clientX: s.lastClientX,
            clientY: s.lastClientY,
          })
        );
      } catch (_) {
        handled = false;
      }
    }

    if (!handled && window.JanelasNS?.DetachController) {
      try {
        handled = await window.JanelasNS.DetachController.onDragEnd({ tabId });
      } catch (_) {
        handled = false;
      }
    }

    if (handled) {
      cleanupSessionUi(s, true);
      return;
    }

    if (s.placeholder && s.placeholder.parentNode && tabsContainer) {
      tabsContainer.insertBefore(tabElement, s.placeholder);
      s.placeholder.remove();
      s.placeholder = null;
    }

    s.tabsOrder.forEach((tab, index) => {
      if (tab !== tabElement && tab.parentNode === tabsContainer) {
        const currentPos = Array.from(tabsContainer.children).indexOf(tab);
        if (currentPos !== index) {
          if (index === 0) {
            tabsContainer.insertBefore(tab, tabsContainer.firstChild);
          } else {
            const prevTab = s.tabsOrder[index - 1];
            if (prevTab && prevTab.parentNode === tabsContainer) {
              tabsContainer.insertBefore(tab, prevTab.nextSibling);
            }
          }
        }
      }
    });

    const finalIndex = s.tabsOrder.indexOf(tabElement);
    if (finalIndex !== -1) {
      const webview = document.querySelector(`webview[data-id="${tabId}"]`);
      const browserContainer = document.getElementById('browser');

      if (webview && browserContainer) {
        const webviews = Array.from(browserContainer.children).filter(
          (child) => child.tagName === 'WEBVIEW'
        );

        const webviewOldIndex = webviews.findIndex((w) => w.dataset.id === tabId);
        if (webviewOldIndex !== -1 && webviewOldIndex !== finalIndex) {
          const targetWebviewIndex =
            finalIndex < webviews.length ? finalIndex : webviews.length - 1;
          const targetWebview = webviews[targetWebviewIndex];

          if (targetWebview && webview !== targetWebview) {
            if (finalIndex > webviewOldIndex) {
              browserContainer.insertBefore(webview, targetWebview.nextSibling);
            } else {
              browserContainer.insertBefore(webview, targetWebview);
            }
          }
        }
      }
    }

    cleanupSessionUi(s, false);
  }

  function setupTabDragAndDrop(tabElement) {
    if (!tabElement || tabElement.dataset.tabDragBound === '1') return;
    tabElement.dataset.tabDragBound = '1';
    ensureGlobalListeners();

    tabElement.addEventListener('pointerdown', (e) => {
      const t = e.target;
      if (
        t &&
        typeof t.closest === 'function' &&
        (t.closest('.tab-close') || t.closest('.new-tab-dot'))
      ) {
        return;
      }
      if (e.button != null && e.button !== 0) return;

      // Novo pointerdown cancela sessão pendente sem drag
      if (session && !session.hasStartedDrag) {
        session = null;
      }
      if (session?.isDragging) return;

      const tabsContainer = tabElement.parentElement;
      if (!tabsContainer) return;

      const tabsOrder = Array.from(tabsContainer.children)
        .filter(
          (child) =>
            child.classList.contains('tab') &&
            !child.classList.contains('janelas-tab-in-pane')
        )
        .map((tab) => tab);

      const rect = tabElement.getBoundingClientRect();

      session = {
        tabElement,
        tabsContainer,
        tabsOrder,
        currentIndex: tabsOrder.indexOf(tabElement),
        isDragging: false,
        hasStartedDrag: false,
        dragStartX: e.clientX,
        dragStartY: e.clientY,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        mouseOffsetX: rect.width / 2,
        mouseOffsetY: rect.height / 2,
        ghostWidth: rect.width,
        ghostHeight: rect.height,
        placeholder: null,
        dragGhost: null,
        dragShield: null,
        activePointerId: e.pointerId != null ? e.pointerId : null,
        usingOsGhost: false,
      };

      e.preventDefault();
    });
  }

  window.TabsReorder = { setupTabDragAndDrop };
  window.setupTabDragAndDrop = setupTabDragAndDrop;
})();
