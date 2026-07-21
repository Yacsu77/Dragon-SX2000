/**
 * Reordenação de abas por drag-and-drop.
 * Ghost único segue o cursor livremente (X/Y) — sem trava vertical.
 */
(function () {
function setupTabDragAndDrop(tabElement) {
  let isDragging = false;
  let hasStartedDrag = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let mouseOffsetX = 0;
  let mouseOffsetY = 0;
  let currentIndex = 0;
  let tabsContainer = null;
  let placeholder = null;
  let dragGhost = null;
  let tabsOrder = [];
  let ghostWidth = 0;
  let ghostHeight = 0;
  let dragShield = null;
  let activePointerId = null;
  let usingOsGhost = false;
  const DRAG_THRESHOLD = 5;

  function clearInlineDragStyles() {
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

  function positionGhost(clientX, clientY) {
    if (!dragGhost) return;
    dragGhost.style.left = `${clientX - mouseOffsetX}px`;
    dragGhost.style.top = `${clientY - mouseOffsetY}px`;
  }

  /** Impede o <webview> de roubar o mouse ao arrastar para baixo / fora. */
  function ensureDragShield(pointerId) {
    if (dragShield) return dragShield;
    dragShield = document.createElement('div');
    dragShield.className = 'janelas-drag-shield';
    dragShield.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dragShield);
    if (pointerId != null && dragShield.setPointerCapture) {
      try {
        dragShield.setPointerCapture(pointerId);
        activePointerId = pointerId;
      } catch (_) {
        /* ignore */
      }
    }
    return dragShield;
  }

  function removeDragShield() {
    if (!dragShield) return;
    if (activePointerId != null && dragShield.releasePointerCapture) {
      try {
        dragShield.releasePointerCapture(activePointerId);
      } catch (_) {
        /* ignore */
      }
    }
    activePointerId = null;
    dragShield.remove();
    dragShield = null;
  }

  function startOsGhost(tabId, mode) {
    const titleSpan = tabElement.querySelector('.tab-title');
    const faviconImg = tabElement.querySelector('.tab-icon img');
    const thumb = window.JanelasNS?.ThumbnailCache?.getCached?.(tabId) || null;
    const nextMode = mode || 'tab';
    usingOsGhost = !!window.JanelasNS?.OsDragGhost?.start?.({
      title: titleSpan?.textContent?.trim() || 'Aba',
      favicon: faviconImg?.src || null,
      thumbnail: thumb,
      mode: nextMode,
      width: nextMode === 'detach' ? 168 : ghostWidth,
      height: nextMode === 'detach' ? 128 : ghostHeight,
      offsetX: mouseOffsetX,
      offsetY: mouseOffsetY,
    });
    // Ghost local permanece SEMPRE visível (dentro da janela).
    // OS ghost só cobre monitores externos — não ocultamos o local.
  }

  function syncOsGhostMode(clientX, clientY) {
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

    // Fora da barra local o ghost OS precisa existir (outra janela / desktop).
    // Senão o ghost local some ao sair desta BrowserWindow.
    const needOs = !inLocalTabs || outside || hovering;

    const tabId = tabElement.dataset.id;
    const titleSpan = tabElement.querySelector('.tab-title');
    const faviconImg = tabElement.querySelector('.tab-icon img');
    const payload = {
      thumbnail: window.JanelasNS?.ThumbnailCache?.getCached?.(tabId) || null,
      title: titleSpan?.textContent?.trim() || 'Aba',
      favicon: faviconImg?.src || null,
      width: mode === 'detach' ? 168 : ghostWidth,
      height: mode === 'detach' ? 128 : ghostHeight,
    };

    if (needOs) {
      if (!usingOsGhost) startOsGhost(tabId, mode);
      else window.JanelasNS?.OsDragGhost?.setMode?.(mode, payload);
      if (dragGhost) {
        dragGhost.style.opacity = '0';
        dragGhost.style.pointerEvents = 'none';
      }
    } else {
      if (usingOsGhost) endOsGhost();
      if (dragGhost) {
        dragGhost.style.opacity = '1';
      }
    }
  }

  function endOsGhost() {
    if (!usingOsGhost) return;
    window.JanelasNS?.OsDragGhost?.end?.();
    usingOsGhost = false;
  }

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('tab-close') || e.target.closest('.tab-close')) {
      return;
    }
    if (e.target.classList.contains('new-tab-dot') || e.target.closest('.new-tab-dot')) {
      return;
    }
    if (e.button != null && e.button !== 0) return;

    hasStartedDrag = false;
    activePointerId = e.pointerId != null ? e.pointerId : null;
    tabsContainer = tabElement.parentElement;

    tabsOrder = Array.from(tabsContainer.children)
      .filter((child) => child.classList.contains('tab'))
      .map((tab) => tab);

    currentIndex = tabsOrder.indexOf(tabElement);

    const rect = tabElement.getBoundingClientRect();
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    mouseOffsetX = rect.width / 2;
    mouseOffsetY = rect.height / 2;
    ghostWidth = rect.width;
    ghostHeight = rect.height;

    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!hasStartedDrag && tabsContainer) {
      const deltaX = Math.abs(e.clientX - dragStartX);
      const deltaY = Math.abs(e.clientY - dragStartY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > DRAG_THRESHOLD) {
        hasStartedDrag = true;
        isDragging = true;

        window.JanelasNS?.TabPreview?.hide?.();
        window.JanelasNS?.DetachController?.reset?.();
        window.JanelasNS?.ThumbnailCache?.pause?.();
        ensureDragShield(e.pointerId != null ? e.pointerId : activePointerId);

        // Aba original some; ghost local fica oculto — o ghost OS segue o cursor entre monitores
        tabElement.classList.add('dragging');

        dragGhost = document.createElement('div');
        dragGhost.classList.add('tab-drag-ghost');

        const iconSpan = tabElement.querySelector('.tab-icon');
        const titleSpan = tabElement.querySelector('.tab-title');

        const ghostIcon = document.createElement('span');
        ghostIcon.classList.add('tab-icon');
        if (iconSpan) {
          if (iconSpan.querySelector('img')) {
            ghostIcon.appendChild(iconSpan.querySelector('img').cloneNode(true));
          } else {
            ghostIcon.textContent = iconSpan.textContent;
          }
        }

        const ghostTitle = document.createElement('span');
        ghostTitle.classList.add('tab-title');
        if (titleSpan) ghostTitle.textContent = titleSpan.textContent;

        dragGhost.appendChild(ghostIcon);
        dragGhost.appendChild(ghostTitle);

        dragGhost.style.width = `${ghostWidth}px`;
        dragGhost.style.height = `${ghostHeight}px`;
        dragGhost.style.opacity = '1';
        positionGhost(e.clientX, e.clientY);
        document.body.appendChild(dragGhost);

        // OS ghost só quando sair da viewport / modo janela / transfer
        syncOsGhostMode(e.clientX, e.clientY);

        placeholder = document.createElement('div');
        placeholder.classList.add('tab-placeholder');
        placeholder.style.width = `${ghostWidth}px`;
        placeholder.style.height = `${ghostHeight}px`;
        tabsContainer.insertBefore(placeholder, tabElement);

        tabsContainer.classList.add('dragging-tabs');
      } else {
        return;
      }
    }

    if (!isDragging) return;

    const containerRect = tabsContainer.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const tabId = tabElement.dataset.id;

    // Movimento livre em X e Y (sem trava na barra de abas)
    positionGhost(e.clientX, e.clientY);

    const hoveringTransfer = Boolean(
      window.JanelasNS?.TransferController?.isHoveringTarget?.()
    );
    const inLocalTabs = Boolean(
      window.JanelasNS?.DetachThreshold?.isInLocalTabsZone?.(e.clientX, e.clientY)
    );

    if (window.JanelasNS?.DetachController) {
      window.JanelasNS.DetachController.onDragMove({
        clientX: e.clientX,
        clientY: e.clientY,
        tabId,
        ghostEl: dragGhost,
        hoveringTransfer,
      });
    }

    if (window.JanelasNS?.TransferController?.onDragMove) {
      window.JanelasNS.TransferController.onDragMove({
        tabId,
        ghostEl: dragGhost,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }

    syncOsGhostMode(e.clientX, e.clientY);

    // Só reordena dentro da barra local; fora = modo janela / transfer
    if (!inLocalTabs || hoveringTransfer) {
      if (placeholder) {
        placeholder.classList.add('tab-placeholder--hidden');
      }
      return;
    }

    if (placeholder) {
      placeholder.classList.remove('tab-placeholder--hidden');
    }

    const visibleTabs = tabsOrder
      .filter((tab) => tab !== tabElement)
      .map((tab) => ({
        element: tab,
        left: tab.getBoundingClientRect().left - containerRect.left,
        right: tab.getBoundingClientRect().right - containerRect.left,
        mid:
          (tab.getBoundingClientRect().left + tab.getBoundingClientRect().right) / 2 -
          containerRect.left,
        orderIndex: tabsOrder.indexOf(tab),
      }))
      .sort((a, b) => a.left - b.left);

    let newIndex = currentIndex;

    if (visibleTabs.length === 0) {
      newIndex = 0;
    } else if (mouseX < visibleTabs[0].left) {
      newIndex = 0;
    } else if (mouseX > visibleTabs[visibleTabs.length - 1].right) {
      newIndex = tabsOrder.length - 1;
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

    newIndex = Math.max(0, Math.min(newIndex, tabsOrder.length - 1));

    if (newIndex !== currentIndex) {
      tabsOrder.splice(currentIndex, 1);
      tabsOrder.splice(newIndex, 0, tabElement);
      currentIndex = newIndex;

      if (placeholder && placeholder.parentNode) {
        placeholder.remove();
      }

      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.classList.add('tab-placeholder');
        placeholder.style.width = `${ghostWidth}px`;
        placeholder.style.height = `${ghostHeight}px`;
      }

      if (newIndex === 0) {
        tabsContainer.insertBefore(placeholder, tabsContainer.firstChild);
      } else if (newIndex < tabsOrder.length - 1) {
        const nextTab = tabsOrder[newIndex + 1];
        if (nextTab && nextTab.parentNode === tabsContainer) {
          tabsContainer.insertBefore(placeholder, nextTab);
        } else {
          tabsContainer.appendChild(placeholder);
        }
      } else {
        tabsContainer.appendChild(placeholder);
      }

      tabsOrder.forEach((tab, index) => {
        if (tab !== tabElement && tab.parentNode === tabsContainer) {
          const currentPos = Array.from(tabsContainer.children).indexOf(tab);
          if (currentPos !== index) {
            if (!tab.style.transition || !tab.style.transition.includes('transform')) {
              tab.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }

            if (index === 0) {
              if (tabsContainer.firstChild !== tab && tabsContainer.firstChild !== placeholder) {
                tabsContainer.insertBefore(tab, tabsContainer.firstChild);
              }
            } else {
              let referenceNode = null;
              for (let i = index - 1; i >= 0; i--) {
                const prevTab = tabsOrder[i];
                if (prevTab === placeholder && placeholder.parentNode) {
                  referenceNode = placeholder.nextSibling;
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
  };

  const handleMouseUp = async () => {
    if (!hasStartedDrag) {
      tabsContainer = null;
      return;
    }

    if (!isDragging) return;

    isDragging = false;
    hasStartedDrag = false;

    const tabId = tabElement.dataset.id;
    let handled = false;

    // 1) Transferência para outra janela (prioridade sobre detach)
    if (window.JanelasNS?.TransferController?.onDragEnd) {
      try {
        handled = await window.JanelasNS.TransferController.onDragEnd({ tabId });
      } catch (_) {
        handled = false;
      }
    }

    // 2) Detach → nova janela
    if (!handled && window.JanelasNS?.DetachController) {
      try {
        handled = await window.JanelasNS.DetachController.onDragEnd({ tabId });
      } catch (_) {
        handled = false;
      }
    }

    const cleanupDragUi = () => {
      if (placeholder) {
        if (placeholder.parentNode && !handled) {
          tabsContainer.insertBefore(tabElement, placeholder);
        }
        placeholder.remove();
        placeholder = null;
      }

      if (dragGhost) {
        dragGhost.remove();
        dragGhost = null;
      }

      removeDragShield();
      endOsGhost();
      window.JanelasNS?.WindowBridge?.clearDragHover?.();
      window.JanelasNS?.DropIndicator?.hide?.();
      window.JanelasNS?.DetachController?.reset?.();
      window.JanelasNS?.ThumbnailCache?.resume?.();
      clearInlineDragStyles();

      if (tabsContainer) {
        tabsContainer.classList.remove('dragging-tabs');
        if (window.TabsAnim) {
          window.TabsAnim.clearDragEffects(tabsContainer);
        }
      }

      if (window.TabsVisibility) {
        window.TabsVisibility.scheduleVisibilityUpdate();
      }

      tabsContainer = null;
    };

    if (handled) {
      cleanupDragUi();
      return;
    }

    if (placeholder && placeholder.parentNode) {
      tabsContainer.insertBefore(tabElement, placeholder);
      placeholder.remove();
    }

    tabsOrder.forEach((tab, index) => {
      if (tab !== tabElement && tab.parentNode === tabsContainer) {
        const currentPos = Array.from(tabsContainer.children).indexOf(tab);
        if (currentPos !== index) {
          if (index === 0) {
            tabsContainer.insertBefore(tab, tabsContainer.firstChild);
          } else {
            const prevTab = tabsOrder[index - 1];
            if (prevTab && prevTab.parentNode === tabsContainer) {
              tabsContainer.insertBefore(tab, prevTab.nextSibling);
            }
          }
        }
      }
    });

    const finalIndex = tabsOrder.indexOf(tabElement);
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

    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }

    if (dragGhost) {
      dragGhost.remove();
      dragGhost = null;
    }

    removeDragShield();
    endOsGhost();
    window.JanelasNS?.WindowBridge?.clearDragHover?.();
    window.JanelasNS?.DropIndicator?.hide?.();
    window.JanelasNS?.DetachController?.reset?.();
    window.JanelasNS?.ThumbnailCache?.resume?.();
    clearInlineDragStyles();

    if (window.TabsAnim) {
      window.TabsAnim.clearDragEffects(tabsContainer);
    }

    if (tabsContainer) {
      tabsContainer.classList.remove('dragging-tabs');
    }

    if (window.TabsVisibility) {
      window.TabsVisibility.scheduleVisibilityUpdate();
    }

    tabsContainer = null;
  };

  // Pointer events + capture: mantém o drag mesmo fora da janela / monitor
  tabElement.addEventListener('pointerdown', handleMouseDown);
  document.addEventListener('pointermove', handleMouseMove);
  document.addEventListener('pointerup', handleMouseUp);
  document.addEventListener('pointercancel', handleMouseUp);
}

  window.TabsReorder = { setupTabDragAndDrop };
  window.setupTabDragAndDrop = setupTabDragAndDrop;
})();
