/**
 * Reordenação de abas por drag-and-drop.
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
  let dragGhost = null; // Clone visual com informações da aba
  let tabsOrder = []; // Array que mantém a ordem das abas
  const DRAG_THRESHOLD = 5; // Pixels que o mouse precisa se mover para iniciar o drag
  
  const handleMouseDown = (e) => {
    // Não iniciar drag se clicar no botão de fechar
    if (e.target.classList.contains('tab-close') || e.target.closest('.tab-close')) {
      return;
    }
    
    // Não iniciar drag se clicar no ponto de nova aba
    if (e.target.classList.contains('new-tab-dot') || e.target.closest('.new-tab-dot')) {
      return;
    }
    
    // Preparar para possível drag, mas não iniciar ainda
    hasStartedDrag = false;
    tabsContainer = tabElement.parentElement;
    
    // Criar array com a ordem inicial de todas as abas
    tabsOrder = Array.from(tabsContainer.children)
      .filter(child => child.classList.contains('tab'))
      .map(tab => tab);
    
    currentIndex = tabsOrder.indexOf(tabElement);
    
    const rect = tabElement.getBoundingClientRect();
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    // Usar offset menor para aba ficar mais próxima do cursor (centro da aba)
    mouseOffsetX = rect.width / 2;
    mouseOffsetY = rect.height / 2;
    
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    // Se ainda não começou o drag, verificar se passou do threshold
    if (!hasStartedDrag && tabsContainer) {
      const deltaX = Math.abs(e.clientX - dragStartX);
      const deltaY = Math.abs(e.clientY - dragStartY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > DRAG_THRESHOLD) {
        // Iniciar o drag
        hasStartedDrag = true;
        isDragging = true;
        
        const rect = tabElement.getBoundingClientRect();
        const containerRect = tabsContainer.getBoundingClientRect();
        
        // Adicionar classe de arraste
        tabElement.classList.add('dragging');
        tabElement.style.zIndex = '1000';
        tabElement.style.position = 'fixed';
        tabElement.style.left = `${e.clientX - mouseOffsetX}px`;
        // Manter a aba no mesmo nível Y ou ligeiramente acima (nunca abaixo)
        const originalTop = containerRect.top;
        const maxTop = originalTop - 5; // Permitir apenas 5px acima
        tabElement.style.top = `${Math.max(maxTop, e.clientY - mouseOffsetY)}px`;
        tabElement.style.width = `${rect.width}px`;
        tabElement.style.pointerEvents = 'none';
        // Esconder o conteúdo da aba original
        tabElement.style.opacity = '0.3';
        
        // Criar clone visual (ghost) com informações da aba
        dragGhost = document.createElement('div');
        dragGhost.classList.add('tab-drag-ghost');
        
        // Copiar informações da aba
        const iconSpan = tabElement.querySelector('.tab-icon');
        const titleSpan = tabElement.querySelector('.tab-title');
        
        // Criar estrutura do clone
        const ghostIcon = document.createElement('span');
        ghostIcon.classList.add('tab-icon');
        if (iconSpan) {
          if (iconSpan.querySelector('img')) {
            const img = iconSpan.querySelector('img').cloneNode(true);
            ghostIcon.appendChild(img);
          } else {
            ghostIcon.textContent = iconSpan.textContent;
          }
        }
        
        const ghostTitle = document.createElement('span');
        ghostTitle.classList.add('tab-title');
        if (titleSpan) {
          ghostTitle.textContent = titleSpan.textContent;
        }
        
        dragGhost.appendChild(ghostIcon);
        dragGhost.appendChild(ghostTitle);
        
        // Posicionar o clone
        dragGhost.style.left = `${e.clientX - mouseOffsetX}px`;
        dragGhost.style.top = `${Math.max(maxTop, e.clientY - mouseOffsetY)}px`;
        dragGhost.style.width = `${rect.width}px`;
        dragGhost.style.height = `${rect.height}px`;
        
        document.body.appendChild(dragGhost);
        
        // Criar placeholder (bolha)
        placeholder = document.createElement('div');
        placeholder.classList.add('tab-placeholder');
        placeholder.style.width = `${rect.width}px`;
        placeholder.style.height = `${rect.height}px`;
        tabsContainer.insertBefore(placeholder, tabElement);
        
        // Adicionar classe ao container para efeitos nas outras abas
        tabsContainer.classList.add('dragging-tabs');
      } else {
        // Ainda não passou do threshold, não fazer nada
        return;
      }
    }
    
    if (!isDragging) return;
    
    // Calcular posição do mouse relativa ao container de abas
    const containerRect = tabsContainer.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    
    // Atualizar posição da aba arrastada seguindo o mouse (X) e limitando Y
    tabElement.style.left = `${e.clientX - mouseOffsetX}px`;
    // Manter a aba no mesmo nível Y ou ligeiramente acima (nunca abaixo)
    const originalTop = containerRect.top;
    const maxTop = originalTop - 5; // Permitir apenas 5px acima
    const calculatedTop = e.clientY - mouseOffsetY;
    const finalTop = Math.max(maxTop, calculatedTop);
    tabElement.style.top = `${finalTop}px`;
    
    // Atualizar posição do clone visual (ghost)
    if (dragGhost) {
      dragGhost.style.left = `${e.clientX - mouseOffsetX}px`;
      dragGhost.style.top = `${finalTop}px`;
    }
    
    // Obter todas as abas visíveis (exceto a arrastada) ordenadas por posição visual atual
    const visibleTabs = tabsOrder
      .filter(tab => tab !== tabElement)
      .map(tab => ({
        element: tab,
        left: tab.getBoundingClientRect().left - containerRect.left,
        right: tab.getBoundingClientRect().right - containerRect.left,
        mid: (tab.getBoundingClientRect().left + tab.getBoundingClientRect().right) / 2 - containerRect.left,
        orderIndex: tabsOrder.indexOf(tab)
      }))
      .sort((a, b) => a.left - b.left);
    
    // Calcular novo índice baseado na posição X do mouse
    let newIndex = currentIndex;
    
    if (visibleTabs.length === 0) {
      newIndex = 0;
    } else {
      // Verificar se o mouse está antes da primeira aba
      if (mouseX < visibleTabs[0].left) {
        newIndex = 0;
      }
      // Verificar se o mouse está depois da última aba
      else if (mouseX > visibleTabs[visibleTabs.length - 1].right) {
        newIndex = tabsOrder.length - 1;
      }
      // Verificar sobre qual aba o mouse está
      else {
        for (let i = 0; i < visibleTabs.length; i++) {
          const tab = visibleTabs[i];
          
          // Se o mouse está sobre esta aba
          if (mouseX >= tab.left && mouseX <= tab.right) {
            // Usar o índice original no array tabsOrder
            if (mouseX < tab.mid) {
              newIndex = tab.orderIndex;
            } else {
              newIndex = tab.orderIndex + 1;
            }
            break;
          }
          // Se o mouse está entre duas abas
          else if (i < visibleTabs.length - 1 && mouseX > tab.right && mouseX < visibleTabs[i + 1].left) {
            newIndex = tab.orderIndex + 1;
            break;
          }
        }
      }
    }
    
    // Limitar newIndex ao range válido
    newIndex = Math.max(0, Math.min(newIndex, tabsOrder.length - 1));
    
    // Sistema de array: reorganizar o array e aplicar ao DOM em tempo real
    if (newIndex !== currentIndex) {
      // Remover a aba arrastada do array
      tabsOrder.splice(currentIndex, 1);
      
      // Inserir na nova posição
      tabsOrder.splice(newIndex, 0, tabElement);
      
      // Atualizar currentIndex
      currentIndex = newIndex;
      
      // Aplicar a nova ordem ao DOM em tempo real
      // Remover placeholder se existir
      if (placeholder && placeholder.parentNode) {
        placeholder.remove();
      }
      
      // Criar placeholder na nova posição
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.classList.add('tab-placeholder');
        const rect = tabElement.getBoundingClientRect();
        placeholder.style.width = `${rect.width}px`;
        placeholder.style.height = `${rect.height}px`;
      }
      
      // Inserir placeholder na posição correta
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
      
      // Reorganizar todas as abas no DOM de acordo com o array
      tabsOrder.forEach((tab, index) => {
        if (tab !== tabElement && tab.parentNode === tabsContainer) {
          const currentPos = Array.from(tabsContainer.children).indexOf(tab);
          if (currentPos !== index) {
            // Aplicar transição suave
            if (!tab.style.transition || !tab.style.transition.includes('transform')) {
              tab.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }
            
            // Encontrar onde inserir
            if (index === 0) {
              if (tabsContainer.firstChild !== tab && tabsContainer.firstChild !== placeholder) {
                tabsContainer.insertBefore(tab, tabsContainer.firstChild);
              }
            } else {
              // Encontrar o item anterior no array que já está no DOM
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
    
    const tabRect = tabElement.getBoundingClientRect();
    const tabCenterX = tabRect.left + tabRect.width / 2;

    if (window.TabsAnim) {
      window.TabsAnim.applyDragEffects(tabsContainer, tabElement, tabCenterX);
    }
  };
  
  const handleMouseUp = () => {
    // Se não iniciou o drag, permitir o clique normal
    if (!hasStartedDrag) {
      tabsContainer = null;
      return;
    }
    
    if (!isDragging) return;
    
    isDragging = false;
    hasStartedDrag = false;
    
    // A aba já está na posição correta no array tabsOrder
    // Apenas remover placeholder e inserir a aba arrastada no lugar
    if (placeholder && placeholder.parentNode) {
      tabsContainer.insertBefore(tabElement, placeholder);
      placeholder.remove();
    }
    
    // Garantir que todas as abas estejam na ordem correta do array
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
    
    // Reordenar webviews correspondentes usando o array tabsOrder
    const finalIndex = tabsOrder.indexOf(tabElement);
    if (finalIndex !== -1) {
      const tabId = tabElement.dataset.id;
      const webview = document.querySelector(`webview[data-id="${tabId}"]`);
      const browserContainer = document.getElementById('browser');
      
      if (webview && browserContainer) {
        const webviews = Array.from(browserContainer.children).filter(child => 
          child.tagName === 'WEBVIEW'
        );
        
        const webviewOldIndex = webviews.findIndex(w => w.dataset.id === tabId);
        if (webviewOldIndex !== -1 && webviewOldIndex !== finalIndex) {
          const targetWebviewIndex = finalIndex < webviews.length ? finalIndex : webviews.length - 1;
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
    
    // Remover placeholder
    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }
    
    // Remover clone visual (ghost)
    if (dragGhost) {
      dragGhost.remove();
      dragGhost = null;
    }
    
    // Limpar estilos de arraste
    tabElement.classList.remove('dragging');
    tabElement.style.zIndex = '';
    tabElement.style.position = '';
    tabElement.style.left = '';
    tabElement.style.top = '';
    tabElement.style.width = '';
    tabElement.style.pointerEvents = '';
    tabElement.style.opacity = '';
    
    if (window.TabsAnim) {
      window.TabsAnim.clearDragEffects(tabsContainer);
    }

    if (window.TabsVisibility) {
      window.TabsVisibility.scheduleVisibilityUpdate();
    }

    tabsContainer = null;
  };
  
  // Adicionar event listeners
  tabElement.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

  window.TabsReorder = { setupTabDragAndDrop };
  window.setupTabDragAndDrop = setupTabDragAndDrop;
})();
