/**
 * Animações leves: só opacity + translate curto (sem blur/3D pesado).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});

  function tabIndex(tabId) {
    const tabs = Array.from(document.querySelectorAll('#tabs .tab'));
    return tabs.findIndex((t) => t.dataset.id === tabId);
  }

  function runClassAnimation(el, className, ms) {
    if (!el) return Promise.resolve();
    const classes = [
      'janelas-anim-flip-left',
      'janelas-anim-flip-right',
      'janelas-anim-float-in',
      'janelas-anim-file-drop',
      'janelas-anim-float-drop',
    ];
    el.classList.remove(...classes);
    void el.offsetWidth;
    el.classList.add(className);
    return new Promise((resolve) => {
      const done = () => {
        el.classList.remove(className);
        resolve();
      };
      el.addEventListener('animationend', done, { once: true });
      setTimeout(done, ms);
    });
  }

  NS.AnimationRegistry?.register('flip', {
    id: 'flip',
    async play({ fromId, toId, floating, surface }) {
      const el = surface || NS.AnimationRegistry.getSurface?.();
      if (!el) return;

      if (floating) {
        await runClassAnimation(el, 'janelas-anim-float-in', 280);
        return;
      }

      const from = tabIndex(fromId);
      const to = tabIndex(toId);
      const dir = to >= from ? 'right' : 'left';
      await runClassAnimation(
        el,
        dir === 'right' ? 'janelas-anim-flip-right' : 'janelas-anim-flip-left',
        260
      );
    },
  });
})();
