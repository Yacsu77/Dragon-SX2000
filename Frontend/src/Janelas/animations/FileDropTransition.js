/**
 * Arquivo descendo (leve) / float-drop (flutuante).
 */
(function () {
  const NS = (window.JanelasNS = window.JanelasNS || {});

  function runClassAnimation(el, className, ms) {
    if (!el) return Promise.resolve();
    el.classList.remove(
      'janelas-anim-flip-left',
      'janelas-anim-flip-right',
      'janelas-anim-float-in',
      'janelas-anim-file-drop',
      'janelas-anim-float-drop'
    );
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

  NS.AnimationRegistry?.register('file-drop', {
    id: 'file-drop',
    async play({ floating, surface }) {
      const el = surface || NS.AnimationRegistry.getSurface?.();
      if (!el) return;
      await runClassAnimation(
        el,
        floating ? 'janelas-anim-float-drop' : 'janelas-anim-file-drop',
        280
      );
    },
  });
})();
