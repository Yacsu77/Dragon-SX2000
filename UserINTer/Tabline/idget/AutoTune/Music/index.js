/**
 * AutoTune Music Widget
 *
 * Card horizontal de Now Playing alimentado pelo Dragon Media SDK
 * (`window.DragonMedia`). Comportamento especial:
 *   - Aparece em qualquer tela (home/browser) — flag `persistent`
 *   - Só renderiza quando há mídia ativa; some quando não há
 *   - Toggle do AutoTune controla "deve aparecer" (intenção do usuário);
 *     a presença real depende de ter snapshot do SDK.
 */
window.AutoTuneWidgets = window.AutoTuneWidgets || {};
window.AutoTuneWidgetMeta = window.AutoTuneWidgetMeta || {};

window.AutoTuneWidgetMeta.music = {
  persistent: true,
  defaultWidth: 360,
  defaultHeight: 150,
  minWidth: 280,
  minHeight: 110,
  showWhen: "media-active",
};

(function () {
  const FALLBACK_TITLE = "Sem mídia";
  const FALLBACK_ARTIST = "Aguardando reprodução…";

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  window.AutoTuneWidgets.music = function initMusicWidget(bodyEl) {
    bodyEl.innerHTML = `
      <div class="autotune-music-card" data-role="card">
        <div class="autotune-music-cover" data-role="coverWrap">
          <div class="autotune-music-cover-fallback" data-role="coverFallback">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor"
                 stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <img class="autotune-music-cover-img" data-role="coverImg" alt="" />
        </div>

        <div class="autotune-music-info">
          <div class="autotune-music-text">
            <h3 class="autotune-music-title" data-role="title">${FALLBACK_TITLE}</h3>
            <p class="autotune-music-artist" data-role="artist">${FALLBACK_ARTIST}</p>
          </div>

          <div class="autotune-music-progress">
            <span class="autotune-music-time" data-role="position">0:00</span>
            <div class="autotune-music-bar"><div class="autotune-music-fill" data-role="fill"></div></div>
            <span class="autotune-music-time" data-role="duration">0:00</span>
          </div>

          <div class="autotune-music-controls">
            <button type="button" class="autotune-music-btn" data-action="prev" title="Anterior" aria-label="Faixa anterior">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M6 5h2v14H6zM20 5v14L9 12z"/>
              </svg>
            </button>
            <button type="button" class="autotune-music-btn autotune-music-btn--play" data-action="play_pause" title="Play/Pause" aria-label="Play/Pause">
              <svg data-icon="play" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg data-icon="pause" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:none">
                <path d="M6 5h4v14H6zm8 0h4v14h-4z"/>
              </svg>
            </button>
            <button type="button" class="autotune-music-btn" data-action="next" title="Próxima" aria-label="Próxima faixa">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M16 5h2v14h-2zM4 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const refs = {
      coverImg: bodyEl.querySelector('[data-role="coverImg"]'),
      coverFallback: bodyEl.querySelector('[data-role="coverFallback"]'),
      title: bodyEl.querySelector('[data-role="title"]'),
      artist: bodyEl.querySelector('[data-role="artist"]'),
      position: bodyEl.querySelector('[data-role="position"]'),
      duration: bodyEl.querySelector('[data-role="duration"]'),
      fill: bodyEl.querySelector('[data-role="fill"]'),
      iconPlay: bodyEl.querySelector('[data-icon="play"]'),
      iconPause: bodyEl.querySelector('[data-icon="pause"]'),
    };

    function render(snapshot) {
      const widgetEl = bodyEl.closest('.floating-widget');

      if (!snapshot || !snapshot.title) {
        if (widgetEl) widgetEl.classList.add("floating-widget--idle");
        refs.title.textContent = FALLBACK_TITLE;
        refs.artist.textContent = FALLBACK_ARTIST;
        refs.position.textContent = "0:00";
        refs.duration.textContent = "0:00";
        refs.fill.style.width = "0%";
        refs.iconPlay.style.display = "";
        refs.iconPause.style.display = "none";
        refs.coverImg.src = "";
        refs.coverImg.style.display = "none";
        refs.coverFallback.style.display = "";
        return;
      }

      if (widgetEl) widgetEl.classList.remove("floating-widget--idle");

      refs.title.textContent = snapshot.title;
      refs.artist.textContent = [snapshot.artist, snapshot.album].filter(Boolean).join(" — ") || snapshot.app || "";
      refs.position.textContent = fmtTime(snapshot.position);
      refs.duration.textContent = fmtTime(snapshot.duration);

      const pct = snapshot.duration > 0
        ? Math.max(0, Math.min(100, (snapshot.position / snapshot.duration) * 100))
        : 0;
      refs.fill.style.width = `${pct}%`;

      if (snapshot.paused) {
        refs.iconPlay.style.display = "";
        refs.iconPause.style.display = "none";
      } else {
        refs.iconPlay.style.display = "none";
        refs.iconPause.style.display = "";
      }

      if (snapshot.cover) {
        if (refs.coverImg.src !== snapshot.cover) refs.coverImg.src = snapshot.cover;
        refs.coverImg.style.display = "";
        refs.coverFallback.style.display = "none";
      } else {
        refs.coverImg.removeAttribute("src");
        refs.coverImg.style.display = "none";
        refs.coverFallback.style.display = "";
      }
    }

    function flashButton(target) {
      if (!target) return;
      target.classList.add("autotune-music-btn--flash");
      setTimeout(() => target.classList.remove("autotune-music-btn--flash"), 180);
    }

    bodyEl.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.getAttribute("data-action");
      if (!action) return;

      flashButton(target);

      // Otimista: alterna o ícone play/pause imediatamente para responsividade
      if (action === "play_pause" && window.DragonMedia && window.DragonMedia.snapshot) {
        const snap = window.DragonMedia.snapshot;
        const optimistic = { ...snap, paused: !snap.paused };
        render(optimistic);
      }

      if (window.DragonMedia && typeof window.DragonMedia.command === "function") {
        try {
          const result = await window.DragonMedia.command(action);
          if (!result || !result.ok) {
            console.warn("[Music] comando falhou:", action, result);
            refresh();
          } else {
            console.debug("[Music] comando ok:", action);
          }
        } catch (err) {
          console.warn("[Music] comando erro:", action, err);
          refresh();
        }
      } else {
        console.warn("[Music] DragonMedia.command indisponível");
      }
    });

    function refresh() {
      render(window.DragonMedia ? window.DragonMedia.snapshot : null);
    }

    if (window.DragonMedia && typeof window.DragonMedia.on === "function") {
      const cleanups = [
        window.DragonMedia.on("media_change", refresh),
        window.DragonMedia.on("media_play", refresh),
        window.DragonMedia.on("media_pause", refresh),
        window.DragonMedia.on("media_progress", refresh),
        window.DragonMedia.on("media_stop", refresh),
        window.DragonMedia.on("hello", refresh),
        window.DragonMedia.on("connected", refresh),
        window.DragonMedia.on("disconnected", refresh),
      ];
      bodyEl._dragonMediaCleanup = () => cleanups.forEach((fn) => fn && fn());
    }

    refresh();
  };
})();
