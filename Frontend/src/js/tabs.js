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
  document.getElementById("tabs").appendChild(tabButton);

  // Adicionar ponto que vira + na última aba (após adicionar a aba)
  setTimeout(() => {
    updateLastTabDot();
    updateTabsBarVisibility();
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
      // Aqui você poderia carregar o favicon real, por enquanto mantemos o emoji
    }
  });

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
    currentActiveTab = tabId;
    showBrowser();
    
    const addressInput = document.getElementById('addressInput');
    if (addressInput) {
      addressInput.value = targetWebview.src;
    }
    return;
  }

  // Animação de transição passando por todas as abas
  animateTabTransition(currentIndex, targetIndex, tabs, targetTab, targetWebview, tabId);
}

/**
 * Anima a transição entre abas com efeito WhatsApp iOS 26
 */
function animateTabTransition(currentIndex, targetIndex, tabs, targetTab, targetWebview, tabId) {
  const direction = targetIndex > currentIndex ? 1 : -1;
  const steps = Math.abs(targetIndex - currentIndex);
  const totalDuration = Math.max(300, steps * 80); // Duração baseada no número de passos
  const startTime = Date.now();

  // Adicionar classe de transição ao container
  const tabsBar = document.querySelector('.tabs-bar');
  if (tabsBar) {
    tabsBar.classList.add('transitioning-container');
  }

  // Remover active de todas inicialmente
  tabs.forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll("webview").forEach(view => view.classList.remove("active"));

  function animateStep() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);
    
    // Spring easing (cubic-bezier para efeito de mola)
    const springProgress = springEasing(progress);
    
    if (progress < 1) {
      // Calcular índice intermediário baseado no progresso
      const currentIntermediateIndex = Math.round(currentIndex + (direction * steps * springProgress));
      const clampedIndex = Math.max(0, Math.min(currentIntermediateIndex, tabs.length - 1));
      
      // Aplicar efeitos em todas as abas
      tabs.forEach((tab, tabIndex) => {
        const distanceFromCurrent = Math.abs(tabIndex - currentIndex);
        const distanceFromTarget = Math.abs(tabIndex - targetIndex);
        const distanceFromActive = Math.abs(tabIndex - clampedIndex);
        
        // Influência baseada na distância da aba ativa
        const influence = Math.max(0, 1 - (distanceFromActive / (steps + 1)) * 0.5);
        
        // Transformação suave (translateX com spring) - efeito mais pronunciado
        const translateX = (tabIndex - currentIndex) * springProgress * 5;
        const scale = 0.92 + influence * 0.08;
        tab.style.transform = `translateX(${translateX}px) scale(${scale})`;
        tab.style.transition = 'none';
        
        // Opacidade baseada na distância - mais dramática
        tab.style.opacity = 0.5 + influence * 0.5;
        
        // Blur reativo - mais blur nas abas mais distantes
        const blurAmount = distanceFromActive * 6;
        const saturation = 170 + (influence * 50);
        const brightness = 100 + (influence * 15);
        tab.style.backdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${saturation}%) brightness(${brightness}%)`;
        tab.style.webkitBackdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${saturation}%) brightness(${brightness}%)`;
        
        // Adicionar classe transitioning para abas intermediárias
        if (tabIndex === clampedIndex) {
          tab.classList.add("transitioning");
        } else {
          tab.classList.remove("transitioning");
        }
      });
      
      // Ativar webview da aba intermediária
      if (clampedIndex >= 0 && clampedIndex < tabs.length) {
        const intermediateTab = tabs[clampedIndex];
        const intermediateWebview = document.querySelector(`webview[data-id="${intermediateTab.dataset.id}"]`);
        
        if (intermediateWebview) {
          intermediateWebview.classList.add("active");
        }
      }

      requestAnimationFrame(animateStep);
    } else {
      // Finalizar na aba alvo
      tabs.forEach(tab => {
        tab.classList.remove("transitioning");
        tab.style.transform = '';
        tab.style.opacity = '';
        tab.style.backdropFilter = '';
        tab.style.webkitBackdropFilter = '';
        tab.style.transition = '';
      });
      
      if (tabsBar) {
        tabsBar.classList.remove('transitioning-container');
      }
      
      targetTab.classList.add("active");
      targetWebview.classList.add("active");
      currentActiveTab = tabId;
      showBrowser();
      
      const addressInput = document.getElementById('addressInput');
      if (addressInput) {
        addressInput.value = targetWebview.src;
      }
    }
  }

  animateStep();
}

/**
 * Spring easing function (cubic-bezier para efeito de mola - iOS 26 style)
 */
function springEasing(t) {
  // Efeito de mola mais pronunciado (cubic-bezier(0.34, 1.56, 0.64, 1))
  // Simula o efeito de "bounce" suave do iOS
  const c1 = 0.34;
  const c2 = 1.56;
  const c3 = 0.64;
  const c4 = 1;
  
  // Aproximação do cubic-bezier com overshoot
  if (t === 0) return 0;
  if (t === 1) return 1;
  
  // Overshoot suave
  if (t > 0.7) {
    const overshoot = (t - 0.7) / 0.3;
    return 1 + (overshoot * overshoot * 0.05) * (1 - overshoot);
  }
  
  // Curva principal
  return t * t * (3 - 2 * t) + Math.sin(t * Math.PI * 2) * 0.02;
}

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
  updateTabsBarVisibility();

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
  document.getElementById("tabs").appendChild(tabButton);

  // Adicionar ponto que vira + na última aba (após adicionar a aba)
  setTimeout(() => {
    updateLastTabDot();
    updateTabsBarVisibility();
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

  // Remover classe active de todas
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
  });

  document.querySelectorAll("webview").forEach(view => {
    view.classList.remove("active");
  });

  const tab = tabs[targetIndex];
  
  if (tab) {
    // Se há transição necessária, animar com efeito spring
    if (currentIndex !== -1 && currentIndex !== targetIndex) {
      const direction = targetIndex > currentIndex ? 1 : -1;
      const steps = Math.abs(targetIndex - currentIndex);
      const totalDuration = Math.max(300, steps * 80);
      const startTime = Date.now();
      
      const tabsBar = document.querySelector('.tabs-bar');
      if (tabsBar) {
        tabsBar.classList.add('transitioning-container');
      }

      function animateStep() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        const springProgress = springEasing(progress);
        
        if (progress < 1) {
          const clampedIndex = Math.max(0, Math.min(Math.round(currentIndex + (direction * steps * springProgress)), tabs.length - 1));
          
          tabs.forEach((t, tIndex) => {
            const distanceFromActive = Math.abs(tIndex - clampedIndex);
            const influence = Math.max(0, 1 - (distanceFromActive / (steps + 1)) * 0.5);
            const translateX = (tIndex - currentIndex) * springProgress * 3;
            const scale = 0.94 + influence * 0.06;
            
            t.style.transform = `translateX(${translateX}px) scale(${scale})`;
            t.style.transition = 'none';
            t.style.opacity = 0.5 + influence * 0.5;
            
            const blurAmount = distanceFromActive * 6;
            t.style.backdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${170 + influence * 50}%) brightness(${100 + influence * 15}%)`;
            t.style.webkitBackdropFilter = `blur(${Math.max(15, 15 + blurAmount)}px) saturate(${170 + influence * 50}%) brightness(${100 + influence * 15}%)`;
            
            if (tIndex === clampedIndex) {
              t.classList.add("transitioning");
            } else {
              t.classList.remove("transitioning");
            }
          });

          requestAnimationFrame(animateStep);
        } else {
          tabs.forEach(t => {
            t.classList.remove("transitioning");
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
          currentActiveTab = tabId;
          showHome();
          updateTabsBarVisibility();
          
          const addressInput = document.getElementById('addressInput');
          if (addressInput) {
            addressInput.value = '';
          }
        }
      }

      animateStep();
    } else {
      tab.classList.add("active");
      currentActiveTab = tabId;
      showHome();
      updateTabsBarVisibility();
      
      const addressInput = document.getElementById('addressInput');
      if (addressInput) {
        addressInput.value = '';
      }
    }
  }
}

/**
 * Cria uma nova aba mostrando a página inicial
 */
function createNewTab() {
  // Criar aba especial para página inicial
  createHomeTab();
}

// Exportar funções para uso global
window.createTab = createTab;
window.activateTab = activateTab;
window.closeTab = closeTab;
window.createNewTab = createNewTab;
window.createHomeTab = createHomeTab;
window.activateHomeTab = activateHomeTab;
window.updateTabsBarVisibility = updateTabsBarVisibility;
