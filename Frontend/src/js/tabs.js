/**
 * Gerenciamento de Abas do Navegador
 */

let tabCount = 0;
let currentActiveTab = null;

/**
 * Cria uma nova aba
 * @param {string} url - URL para carregar na aba
 * @param {string} title - Título opcional da aba
 * @returns {string} ID da aba criada
 */
function createTab(url, title = null, icon = null) {
  tabCount++;
  const tabId = "tab-" + tabCount;
  const displayTitle = title || (url.includes('google.com/search') ? 'Busca' : 'Nova Aba');

  // Criar botão da aba
  const tabButton = document.createElement("div");
  tabButton.classList.add("tab");
  tabButton.dataset.id = tabId;

  // Botão de fechar (lado esquerdo)
  const closeBtn = document.createElement("span");
  closeBtn.classList.add("tab-close");
  closeBtn.innerHTML = "×";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };
  tabButton.appendChild(closeBtn);

  // Ícone da aba
  const iconSpan = document.createElement("span");
  iconSpan.classList.add("tab-icon");
  if (icon) {
    iconSpan.textContent = icon;
  } else {
    // Tentar extrair ícone da URL
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      if (hostname.includes('youtube')) iconSpan.textContent = '▶';
      else if (hostname.includes('github')) iconSpan.textContent = '🐙';
      else if (hostname.includes('whatsapp')) iconSpan.textContent = '💬';
      else if (hostname.includes('google')) iconSpan.textContent = 'G';
      else iconSpan.textContent = '🌐';
    } catch {
      iconSpan.textContent = '🌐';
    }
  }
  tabButton.appendChild(iconSpan);

  // Título da aba
  const titleSpan = document.createElement("span");
  titleSpan.classList.add("tab-title");
  titleSpan.textContent = displayTitle;
  tabButton.appendChild(titleSpan);

  tabButton.onclick = () => activateTab(tabId);
  
  // Adicionar funcionalidade de drag and drop
  setupTabDragAndDrop(tabButton);
  
  document.getElementById("tabs").appendChild(tabButton);

  // Adicionar ponto que vira + na última aba (após adicionar a aba)
  setTimeout(() => {
    updateLastTabDot();
    // Aguardar o layout ser renderizado antes de calcular porcentagens
    requestAnimationFrame(() => {
      setTimeout(() => updateTabsBarVisibility(), 0);
    });
  }, 0);

  // Criar webview
  const webview = document.createElement("webview");
  webview.src = url;
  webview.dataset.id = tabId;

  // Atualizar título quando a página carregar
  webview.addEventListener('page-title-updated', (e) => {
    if (e.title) {
      const titleText = e.title.length > 25 ? e.title.substring(0, 25) + '...' : e.title;
      titleSpan.textContent = titleText;
    }
  });

  // Atualizar ícone baseado no favicon (se disponível)
  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      const faviconUrl = e.favicons[0];
      updateTabIcon(tabId, faviconUrl);
    }
  });
  
  // Atualizar ícone quando a página carregar completamente
  webview.addEventListener('did-finish-load', () => {
    try {
      const currentUrl = webview.getURL();
      if (currentUrl && currentUrl !== 'about:blank' && !currentUrl.includes('google.com/search')) {
        // Tentar obter favicon da URL (não para buscas do Google)
        const urlObj = new URL(currentUrl);
        const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
        updateTabIcon(tabId, faviconUrl);
      }
    } catch (e) {
      // Ignorar erros
    }
  });

  // Configurar listeners de navegação
  if (typeof setupWebviewNavigation === 'function') {
    setupWebviewNavigation(webview);
  }

  document.getElementById("browser").appendChild(webview);
  activateTab(tabId);
  return tabId;
}

/**
 * Atualiza o ponto que vira + em todas as abas
 */
function updateLastTabDot() {
  // Remover todos os pontos existentes
  document.querySelectorAll('.new-tab-dot').forEach(dot => dot.remove());
  
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    const titleSpan = tab.querySelector('.tab-title');
    
    // Verificar se já tem o ponto
    if (!tab.querySelector('.new-tab-dot')) {
      const dotContainer = document.createElement('div');
      dotContainer.classList.add('new-tab-dot');
      dotContainer.onclick = (e) => {
        e.stopPropagation();
        createNewTab();
      };
      
      const dot = document.createElement('span');
      dot.classList.add('dot');
      dotContainer.appendChild(dot);
      
      const plusIcon = document.createElement('span');
      plusIcon.classList.add('plus-icon');
      plusIcon.textContent = '+';
      dotContainer.appendChild(plusIcon);
      
      // Inserir após o título
      if (titleSpan && titleSpan.nextSibling) {
        tab.insertBefore(dotContainer, titleSpan.nextSibling);
      } else {
        tab.appendChild(dotContainer);
      }
    }
  });
}

/**
 * Atualiza a visibilidade da barra de abas
 */
function updateTabsBarVisibility() {
  const tabsBar = document.querySelector('.tabs-bar');
  const tabs = document.querySelectorAll('.tab');
  
  // Se só tem uma aba home, esconder a barra
  if (tabs.length === 1 && tabs[0].dataset.id && tabs[0].dataset.id.startsWith('home-tab')) {
    if (tabsBar) {
      tabsBar.classList.add('hidden');
    }
  } else {
    if (tabsBar) {
      tabsBar.classList.remove('hidden');
    }
  }
  
  // Verificar se há muitas abas baseado em porcentagem
  const tabsContainer = document.querySelector('.tabs');
  if (tabsContainer && tabs.length > 0) {
    // Forçar recálculo do layout
    tabsContainer.offsetHeight;
    
    const activeTab = tabsContainer.querySelector('.tab.active');
    if (activeTab) {
      // Calcular a porcentagem que a aba ativa ocupa
      const containerWidth = tabsContainer.offsetWidth;
      const activeTabWidth = activeTab.offsetWidth;
      const activeTabPercentage = containerWidth > 0 ? (activeTabWidth / containerWidth) * 100 : 0;
      
      // Se a aba ativa ocupa menos de 15% do espaço, há muitas abas
      if (activeTabPercentage < 15 && containerWidth > 0) {
        tabsContainer.classList.add('many-tabs');
        
        // Forçar que a aba ativa tenha exatamente 15% do espaço
        const minWidthPixels = containerWidth * 0.15;
        activeTab.style.minWidth = `${minWidthPixels}px`;
        activeTab.style.flexShrink = '0';
        activeTab.style.flexGrow = '0';
        
        // Garantir que abas inativas não tenham estilos inline que interfiram
        const inactiveTabs = tabsContainer.querySelectorAll('.tab:not(.active)');
        inactiveTabs.forEach(tab => {
          tab.style.minWidth = '';
          tab.style.maxWidth = '';
          tab.style.width = '';
          tab.style.flexGrow = '';
          tab.style.flexShrink = '';
        });
      } else {
        tabsContainer.classList.remove('many-tabs');
        // Remover estilos forçados quando não há muitas abas
        activeTab.style.minWidth = '';
        activeTab.style.flexShrink = '';
        activeTab.style.flexGrow = '';
        
        // Limpar estilos das abas inativas também
        const inactiveTabs = tabsContainer.querySelectorAll('.tab:not(.active)');
        inactiveTabs.forEach(tab => {
          tab.style.minWidth = '';
          tab.style.maxWidth = '';
          tab.style.width = '';
          tab.style.flexGrow = '';
          tab.style.flexShrink = '';
        });
      }
    } else {
      // Se não há aba ativa, verificar pelo número total de abas
      const containerWidth = tabsContainer.offsetWidth;
      if (containerWidth > 0) {
        const estimatedTabWidth = containerWidth / tabs.length;
        const estimatedPercentage = (estimatedTabWidth / containerWidth) * 100;
        
        if (estimatedPercentage < 15) {
          tabsContainer.classList.add('many-tabs');
        } else {
          tabsContainer.classList.remove('many-tabs');
        }
      }
    }
  }
}

/**
 * Ativa uma aba específica com animação
 * @param {string} tabId - ID da aba a ser ativada
 */
function activateTab(tabId) {
  // Se for a aba home, usar função específica
  if (tabId && tabId.startsWith('home-tab')) {
    activateHomeTab(tabId);
    return;
  }

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const currentIndex = tabs.findIndex(tab => tab.classList.contains("active"));
  const targetIndex = tabs.findIndex(tab => tab.dataset.id === tabId);

  if (targetIndex === -1) return;

  // Remover classe active de todas
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
  });

  document.querySelectorAll("webview").forEach(view => {
    view.classList.remove("active");
  });

  const targetTab = tabs[targetIndex];
  const targetWebview = document.querySelector(`webview[data-id="${tabId}"]`);

  if (!targetTab || !targetWebview) return;

  // Se não há aba ativa ou é a mesma, ativar diretamente
  if (currentIndex === -1 || currentIndex === targetIndex) {
    targetTab.classList.add("active");
    targetWebview.classList.add("active");
      
      // Adicionar classe nas abas adjacentes para esconder divisórias
      const prevTab = targetTab.previousElementSibling;
      const nextTab = targetTab.nextElementSibling;
      if (prevTab && prevTab.classList.contains('tab')) {
        prevTab.classList.add('adjacent-to-active');
      }
      if (nextTab && nextTab.classList.contains('tab')) {
        nextTab.classList.add('adjacent-to-active');
      }
      
    currentActiveTab = tabId;
    showBrowser();
    
      // Atualizar barra de endereço e botões de navegação
      if (typeof updateAddressBar === 'function') {
        updateAddressBar();
      }
      if (typeof updateNavigationButtons === 'function') {
        updateNavigationButtons();
    }
    return;
  }

  // Animação de transição passando por todas as abas
  animateTabTransition(currentIndex, targetIndex, tabs, targetTab, targetWebview, tabId);
}

/**
 * Anima a transição entre abas com efeito suave e otimizado
 */
function animateTabTransition(currentIndex, targetIndex, tabs, targetTab, targetWebview, tabId) {
  const direction = targetIndex > currentIndex ? 1 : -1;
  const steps = Math.abs(targetIndex - currentIndex);
  // Duração mais curta e suave: 200ms base + 50ms por passo
  const totalDuration = Math.min(400, 200 + steps * 50);
  const startTime = Date.now();

  // Adicionar classe de transição ao container
  const tabsBar = document.querySelector('.tabs-bar');
  if (tabsBar) {
    tabsBar.classList.add('transitioning-container');
  }

  // Remover active de todas inicialmente, mas manter o webview atual ativo durante a animação
  tabs.forEach(tab => {
    tab.classList.remove("active", "adjacent-to-active");
  });
  // Não remover o webview ativo ainda - só no final para evitar travamentos

  let lastClampedIndex = currentIndex;

  function animateStep() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    
    // Easing suave (ease-out-cubic)
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    if (progress < 1) {
      // Calcular índice intermediário com interpolação suave
      const exactIndex = currentIndex + (direction * steps * easedProgress);
      const clampedIndex = Math.max(0, Math.min(Math.round(exactIndex), tabs.length - 1));
      
      // Só atualizar se o índice mudou (otimização)
      if (clampedIndex !== lastClampedIndex) {
        // Remover active de todas as abas
        tabs.forEach(tab => tab.classList.remove("active"));
        
        // Ativar a aba intermediária
        if (clampedIndex >= 0 && clampedIndex < tabs.length) {
          tabs[clampedIndex].classList.add("active");
        }
        
        lastClampedIndex = clampedIndex;
      }
      
      // Aplicar efeitos visuais suaves em todas as abas
      tabs.forEach((tab, tabIndex) => {
        const distanceFromActive = Math.abs(tabIndex - clampedIndex);
        const maxDistance = Math.max(steps, 1);
        
        // Influência baseada na distância (mais suave)
        const influence = Math.max(0, 1 - (distanceFromActive / (maxDistance + 1)) * 0.6);
        
        // Transformação suave e sutil
        const translateX = (tabIndex - currentIndex) * easedProgress * 3;
        const scale = 0.95 + influence * 0.05;
        tab.style.transform = `translateX(${translateX}px) scale(${scale})`;
        tab.style.transition = 'none';
        
        // Opacidade suave
        tab.style.opacity = 0.6 + influence * 0.4;
        
        // Blur mais sutil para melhor performance
        const blurAmount = Math.min(distanceFromActive * 3, 12);
        const saturation = 180 + (influence * 40);
        const brightness = 105 + (influence * 10);
        tab.style.backdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${saturation}%) brightness(${brightness}%)`;
        tab.style.webkitBackdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${saturation}%) brightness(${brightness}%)`;
      });

      requestAnimationFrame(animateStep);
    } else {
      // Finalizar na aba alvo - limpar todos os estilos inline
      tabs.forEach(tab => {
        tab.style.transform = '';
        tab.style.opacity = '';
        tab.style.backdropFilter = '';
        tab.style.webkitBackdropFilter = '';
        tab.style.transition = '';
        tab.classList.remove("active", "adjacent-to-active");
      });
      
      // Remover active de todos os webviews
      document.querySelectorAll("webview").forEach(view => view.classList.remove("active"));
      
      if (tabsBar) {
        tabsBar.classList.remove('transitioning-container');
      }
      
      // Ativar a aba e webview alvo
      targetTab.classList.add("active");
      targetWebview.classList.add("active");
      
      // Adicionar classe nas abas adjacentes para esconder divisórias
      const prevTab = targetTab.previousElementSibling;
      const nextTab = targetTab.nextElementSibling;
      if (prevTab && prevTab.classList.contains('tab')) {
        prevTab.classList.add('adjacent-to-active');
      }
      if (nextTab && nextTab.classList.contains('tab')) {
        nextTab.classList.add('adjacent-to-active');
      }
      
      currentActiveTab = tabId;
      showBrowser();
      
      // Atualizar barra de endereço e botões de navegação
      if (typeof updateAddressBar === 'function') {
        updateAddressBar();
      }
      if (typeof updateNavigationButtons === 'function') {
        updateNavigationButtons();
      }
    }
  }

  animateStep();
}

/**
 * Easing suave para transições (ease-out-cubic)
 * Função removida - agora usando easing inline mais simples e performático
 */

/**
 * Fecha uma aba
 * @param {string} tabId - ID da aba a ser fechada
 */
function closeTab(tabId) {
  const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
  const webview = document.querySelector(`webview[data-id="${tabId}"]`);
  
  if (tab) tab.remove();
  if (webview) webview.remove();

  // Atualizar ponto na última aba
  updateLastTabDot();
  // Aguardar o layout ser renderizado antes de calcular porcentagens
  requestAnimationFrame(() => {
    setTimeout(() => updateTabsBarVisibility(), 0);
  });

  // Se fechou a aba ativa, mostrar home ou ativar outra
  if (currentActiveTab === tabId) {
    const remainingTabs = document.querySelectorAll('.tab');
    if (remainingTabs.length > 0) {
      const firstTabId = remainingTabs[0].dataset.id;
      activateTab(firstTabId);
    } else {
      // Se não há mais abas, apenas mostrar home sem criar aba
      showHome();
      currentActiveTab = null;
      // Limpar barra de endereço
      const addressInput = document.getElementById('addressInput');
      if (addressInput) {
        addressInput.value = '';
      }
    }
  }
}

/**
 * Cria uma aba especial para a página inicial
 */
function createHomeTab() {
  tabCount++;
  const tabId = "home-tab-" + tabCount;
  
  // Permitir múltiplas New Tab - não verificar se já existe

  // Criar botão da aba
  const tabButton = document.createElement("div");
  tabButton.classList.add("tab");
  tabButton.dataset.id = tabId;

  // Ícone da aba (dragão para página inicial)
  const iconSpan = document.createElement("span");
  iconSpan.classList.add("tab-icon");
  iconSpan.textContent = '🐉';
  tabButton.appendChild(iconSpan);

  // Título da aba
  const titleSpan = document.createElement("span");
  titleSpan.classList.add("tab-title");
  titleSpan.textContent = 'New Tab';
  tabButton.appendChild(titleSpan);

  // Botão de fechar (lado esquerdo)
  const closeBtn = document.createElement("span");
  closeBtn.classList.add("tab-close");
  closeBtn.innerHTML = "×";
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };
  tabButton.appendChild(closeBtn);

  tabButton.onclick = () => activateHomeTab(tabId);
  
  // Adicionar funcionalidade de drag and drop
  setupTabDragAndDrop(tabButton);
  
  document.getElementById("tabs").appendChild(tabButton);

  // Adicionar ponto que vira + na última aba (após adicionar a aba)
  setTimeout(() => {
    updateLastTabDot();
    // Aguardar o layout ser renderizado antes de calcular porcentagens
    requestAnimationFrame(() => {
      setTimeout(() => updateTabsBarVisibility(), 0);
    });
  }, 0);

  // Ativar a aba home
  activateHomeTab(tabId);
  return tabId;
}

/**
 * Ativa a aba da página inicial
 */
function activateHomeTab(tabId) {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const currentIndex = tabs.findIndex(tab => tab.classList.contains("active"));
  const targetIndex = tabs.findIndex(tab => tab.dataset.id === tabId);

  if (targetIndex === -1) return;

  // Remover classe active de todas e classes de adjacência
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active", "adjacent-to-active");
  });

  document.querySelectorAll("webview").forEach(view => {
    view.classList.remove("active");
  });

  const tab = tabs[targetIndex];
  
  if (tab) {
    // Se há transição necessária, animar com efeito suave
    if (currentIndex !== -1 && currentIndex !== targetIndex) {
      const direction = targetIndex > currentIndex ? 1 : -1;
      const steps = Math.abs(targetIndex - currentIndex);
      const totalDuration = Math.min(400, 200 + steps * 50);
      const startTime = Date.now();
      
      const tabsBar = document.querySelector('.tabs-bar');
      if (tabsBar) {
        tabsBar.classList.add('transitioning-container');
      }

      let lastClampedIndex = currentIndex;

      function animateStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        // Easing suave (ease-out-cubic)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        if (progress < 1) {
          const exactIndex = currentIndex + (direction * steps * easedProgress);
          const clampedIndex = Math.max(0, Math.min(Math.round(exactIndex), tabs.length - 1));
          
          // Só atualizar se o índice mudou
          if (clampedIndex !== lastClampedIndex) {
            tabs.forEach(t => t.classList.remove("active", "adjacent-to-active"));
            if (clampedIndex >= 0 && clampedIndex < tabs.length) {
              tabs[clampedIndex].classList.add("active");
            }
            lastClampedIndex = clampedIndex;
          }
          
          tabs.forEach((t, tIndex) => {
            const distanceFromActive = Math.abs(tIndex - clampedIndex);
            const maxDistance = Math.max(steps, 1);
            const influence = Math.max(0, 1 - (distanceFromActive / (maxDistance + 1)) * 0.6);
            const translateX = (tIndex - currentIndex) * easedProgress * 3;
            const scale = 0.95 + influence * 0.05;
            
            t.style.transform = `translateX(${translateX}px) scale(${scale})`;
            t.style.transition = 'none';
            t.style.opacity = 0.6 + influence * 0.4;
            
            const blurAmount = Math.min(distanceFromActive * 3, 12);
            const saturation = 180 + (influence * 40);
            const brightness = 105 + (influence * 10);
            t.style.backdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${saturation}%) brightness(${brightness}%)`;
            t.style.webkitBackdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${saturation}%) brightness(${brightness}%)`;
          });

          requestAnimationFrame(animateStep);
        } else {
          tabs.forEach(t => {
            t.classList.remove("active");
            t.style.transform = '';
            t.style.opacity = '';
            t.style.backdropFilter = '';
            t.style.webkitBackdropFilter = '';
            t.style.transition = '';
          });
          
          if (tabsBar) {
            tabsBar.classList.remove('transitioning-container');
          }
          
          tab.classList.add("active");
          
          // Adicionar classe nas abas adjacentes para esconder divisórias
          const prevTab = tab.previousElementSibling;
          const nextTab = tab.nextElementSibling;
          if (prevTab && prevTab.classList.contains('tab')) {
            prevTab.classList.add('adjacent-to-active');
          }
          if (nextTab && nextTab.classList.contains('tab')) {
            nextTab.classList.add('adjacent-to-active');
          }
          
          currentActiveTab = tabId;
          showHome();
          requestAnimationFrame(() => {
            setTimeout(() => updateTabsBarVisibility(), 0);
          });
          
          // Atualizar barra de endereço e botões de navegação
          const addressInput = document.getElementById('addressInput');
          if (addressInput) {
            addressInput.value = '';
          }
          if (typeof updateNavigationButtons === 'function') {
            updateNavigationButtons();
          }
        }
      }

      animateStep();
    } else {
      tab.classList.add("active");
      
      // Adicionar classe nas abas adjacentes para esconder divisórias
      const prevTab = tab.previousElementSibling;
      const nextTab = tab.nextElementSibling;
      if (prevTab && prevTab.classList.contains('tab')) {
        prevTab.classList.add('adjacent-to-active');
      }
      if (nextTab && nextTab.classList.contains('tab')) {
        nextTab.classList.add('adjacent-to-active');
      }
      
      currentActiveTab = tabId;
      showHome();
      requestAnimationFrame(() => {
        setTimeout(() => updateTabsBarVisibility(), 0);
      });
      
      // Atualizar barra de endereço e botões de navegação
      const addressInput = document.getElementById('addressInput');
      if (addressInput) {
        addressInput.value = '';
      }
      if (typeof updateNavigationButtons === 'function') {
        updateNavigationButtons();
      }
    }
  }
}

/**
 * Atualiza o ícone de uma aba com um favicon
 * @param {string} tabId - ID da aba
 * @param {string} faviconUrl - URL do favicon
 */
function updateTabIcon(tabId, faviconUrl) {
  const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
  if (!tab) return;
  
  const iconSpan = tab.querySelector('.tab-icon');
  if (!iconSpan) return;
  
  // Criar elemento de imagem para o favicon
  let faviconImg = iconSpan.querySelector('img');
  
  if (!faviconImg) {
    faviconImg = document.createElement('img');
    faviconImg.style.width = '14px';
    faviconImg.style.height = '14px';
    faviconImg.style.objectFit = 'contain';
    faviconImg.style.borderRadius = '2px';
    faviconImg.onerror = () => {
      // Se falhar ao carregar, manter o ícone padrão
      if (faviconImg.parentNode) {
        faviconImg.remove();
      }
    };
    iconSpan.textContent = ''; // Limpar emoji/texto
    iconSpan.appendChild(faviconImg);
  }
  
  faviconImg.src = faviconUrl;
}

/**
 * Cria uma nova aba mostrando a página inicial
 */
/**
 * Converte uma home tab em uma aba normal com uma URL
 * @param {string} tabId - ID da home tab
 * @param {string} url - URL para carregar
 * @param {string} title - Título da aba
 */
function convertHomeTabToNormalTab(tabId, url, title = null) {
  const tab = document.querySelector(`.tab[data-id="${tabId}"]`);
  if (!tab) return;
  
  // Atualizar o ID da aba para uma aba normal
  const newTabId = "tab-" + (++tabCount);
  tab.dataset.id = newTabId;
  
  // IMPORTANTE: Atualizar o onclick para usar activateTab em vez de activateHomeTab
  tab.onclick = () => activateTab(newTabId);
  
  // Atualizar título
  const titleSpan = tab.querySelector('.tab-title');
  if (titleSpan) {
    titleSpan.textContent = title || 'Nova Aba';
  }
  
  // Atualizar ícone
  const iconSpan = tab.querySelector('.tab-icon');
  if (iconSpan) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      if (hostname.includes('youtube')) iconSpan.textContent = '▶';
      else if (hostname.includes('github')) iconSpan.textContent = '🐙';
      else if (hostname.includes('whatsapp')) iconSpan.textContent = '💬';
      else if (hostname.includes('google')) iconSpan.textContent = 'G';
      else iconSpan.textContent = '🌐';
    } catch {
      iconSpan.textContent = '🌐';
    }
  }
  
  // Criar webview para esta aba
  const webview = document.createElement("webview");
  webview.src = url;
  webview.dataset.id = newTabId;
  webview.classList.add("active");
  
  // Atualizar título quando a página carregar
  webview.addEventListener('page-title-updated', (e) => {
    if (e.title && titleSpan) {
      const titleText = e.title.length > 25 ? e.title.substring(0, 25) + '...' : e.title;
      titleSpan.textContent = titleText;
    }
  });
  
  // Atualizar ícone baseado no favicon
  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      const faviconUrl = e.favicons[0];
      updateTabIcon(newTabId, faviconUrl);
    }
  });
  
  // Atualizar ícone quando a página carregar completamente
  webview.addEventListener('did-finish-load', () => {
    try {
      const currentUrl = webview.getURL();
      if (currentUrl && currentUrl !== 'about:blank' && !currentUrl.includes('google.com/search')) {
        const urlObj = new URL(currentUrl);
        const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
        updateTabIcon(newTabId, faviconUrl);
      }
    } catch (e) {
      // Ignorar erros
    }
  });
  
  // Configurar listeners de navegação
  if (typeof setupWebviewNavigation === 'function') {
    setupWebviewNavigation(webview);
  }
  
  // Adicionar webview ao container
  document.getElementById("browser").appendChild(webview);
  
  // Atualizar referência da aba ativa
  currentActiveTab = newTabId;
  
  // Mostrar o browser
  showBrowser();
  
  // Atualizar visibilidade da barra de abas
  updateTabsBarVisibility();
  
  // Atualizar barra de endereço e botões de navegação
  if (typeof updateAddressBar === 'function') {
    updateAddressBar();
  }
  if (typeof updateNavigationButtons === 'function') {
    updateNavigationButtons();
  }
}

/**
 * Configura drag and drop para uma aba
 * @param {HTMLElement} tabElement - Elemento da aba
 */
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
    
    // Aplicar efeitos de distorção nas outras abas (sempre, para feedback visual)
    const tabRect = tabElement.getBoundingClientRect();
    const tabCenterX = tabRect.left + tabRect.width / 2;
    
    // Obter todas as abas reais para aplicar efeitos
    const allTabsForEffects = Array.from(tabsContainer.children)
      .filter(child => child.classList.contains('tab') && child !== tabElement);
    
    allTabsForEffects.forEach((tab) => {
      const rect = tab.getBoundingClientRect();
      const tabMidX = rect.left + rect.width / 2;
      const distance = Math.abs(tabCenterX - tabMidX);
      const maxDistance = tabsContainer.offsetWidth;
      const influence = Math.max(0, 1 - (distance / maxDistance) * 2);
      
      const scale = 0.96 + influence * 0.02; // Efeito mais sutil
      const translateX = (tabCenterX - tabMidX) * influence * 0.15; // Movimento mais sutil
      const blur = influence * 6; // Blur mais sutil
      const saturation = 180 + (influence * 30);
      const brightness = 105 + (influence * 8);
      
      tab.style.transform = `translateX(${translateX}px) scale(${scale})`;
      tab.style.backdropFilter = `blur(${blur}px) saturate(${saturation}%) brightness(${brightness}%)`;
      tab.style.webkitBackdropFilter = `blur(${blur}px) saturate(${saturation}%) brightness(${brightness}%)`;
      tab.style.opacity = 0.75 + influence * 0.25;
      tab.classList.add('drag-affected');
    });
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
    
    // Limpar efeitos das outras abas
    tabsContainer.classList.remove('dragging-tabs');
    const tabs = Array.from(tabsContainer.querySelectorAll('.tab'));
    tabs.forEach(tab => {
      tab.style.transform = '';
      tab.style.backdropFilter = '';
      tab.style.webkitBackdropFilter = '';
      tab.style.opacity = '';
      tab.classList.remove('drag-affected');
    });
    
    // Atualizar visibilidade
    requestAnimationFrame(() => {
      setTimeout(() => updateTabsBarVisibility(), 0);
    });
    
    tabsContainer = null;
  };
  
  // Adicionar event listeners
  tabElement.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

/**
 * Cria uma nova aba mostrando a página inicial
 */
function createNewTab() {
  // Criar aba especial para página inicial
  createHomeTab();
}

// Adicionar listener para recalcular quando a janela for redimensionada
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    updateTabsBarVisibility();
  }, 150);
});

// Exportar funções para uso global
window.createTab = createTab;
window.activateTab = activateTab;
window.closeTab = closeTab;
window.createNewTab = createNewTab;
window.createHomeTab = createHomeTab;
window.activateHomeTab = activateHomeTab;
window.updateTabsBarVisibility = updateTabsBarVisibility;
window.updateTabIcon = updateTabIcon;
window.convertHomeTabToNormalTab = convertHomeTabToNormalTab;
