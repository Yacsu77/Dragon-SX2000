/**
 * Autoscroll com botão do meio do mouse.
 */
(function () {
  const NEUTRAL_ZONE = 12;
  const MAX_SPEED = 28;
  const ACCEL_FACTOR = 0.15;

  let active = false;
  let anchorY = 0;
  let anchorX = 0;
  let currentWebview = null;
  let rafId = null;
  let velocityY = 0;
  let indicatorEl = null;
  let overlayEl = null;

  function createIndicator() {
    if (indicatorEl) return indicatorEl;
    indicatorEl = document.createElement('div');
    indicatorEl.className = 'cursor-autoscroll-indicator';
    indicatorEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(indicatorEl);
    return indicatorEl;
  }

  function createOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.className = 'cursor-autoscroll-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function removeIndicator() {
    if (indicatorEl) {
      indicatorEl.remove();
      indicatorEl = null;
    }
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    document.body.classList.remove('cursor-autoscroll-active');
  }

  function scrollWebview(deltaY) {
    if (!currentWebview || !deltaY) return;
    try {
      currentWebview.executeJavaScript(
        `window.scrollBy({ top: ${deltaY}, behavior: 'auto' });`,
        false,
      ).catch(() => {});
    } catch {
      // webview pode ter sido destruído
    }
  }

  function tick() {
    if (!active) return;
    if (Math.abs(velocityY) > 0.1) {
      scrollWebview(velocityY);
    }
    rafId = requestAnimationFrame(tick);
  }

  function updateVelocity(clientY) {
    const delta = clientY - anchorY;
    if (Math.abs(delta) <= NEUTRAL_ZONE) {
      velocityY = 0;
      return;
    }
    const direction = delta > 0 ? 1 : -1;
    const distance = Math.abs(delta) - NEUTRAL_ZONE;
    const target = direction * Math.min(MAX_SPEED, distance * ACCEL_FACTOR);
    velocityY += (target - velocityY) * 0.2;
  }

  function onMouseMove(e) {
    if (!active) return;
    updateVelocity(e.clientY);
    if (indicatorEl) {
      indicatorEl.style.left = `${anchorX}px`;
      indicatorEl.style.top = `${anchorY}px`;
    }
  }

  function stop() {
    active = false;
    velocityY = 0;
    currentWebview = null;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousedown', onMouseDownCancel, true);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('blur', stop);
    removeIndicator();
  }

  function onMouseDownCancel(e) {
    if (e.button === 0 || e.button === 1) {
      stop();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') stop();
  }

  function start(webview, clientX, clientY) {
    if (!webview) return;
    if (active) {
      stop();
      return;
    }

    active = true;
    currentWebview = webview;
    anchorX = clientX;
    anchorY = clientY;

    createOverlay();
    createIndicator();
    indicatorEl.style.left = `${anchorX}px`;
    indicatorEl.style.top = `${anchorY}px`;
    document.body.classList.add('cursor-autoscroll-active');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDownCancel, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', stop);

    rafId = requestAnimationFrame(tick);
  }

  function isActive() {
    return active;
  }

  window.CursorMiddleMouseScroll = {
    start,
    stop,
    isActive,
    NEUTRAL_ZONE,
    MAX_SPEED,
  };
})();
