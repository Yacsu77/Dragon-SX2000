window.AutoTuneWidgets = window.AutoTuneWidgets || {};
window.AutoTuneWidgetMeta = window.AutoTuneWidgetMeta || {};

(function () {
  const SETTINGS_KEY = "autotuneClockSettings";
  const DEFAULTS = {
    enabled: true,
    x: 20,
    y: 20,
    w: 140,
    h: 100,
    format: "digital", // or "analog"
    timezone: "local",
    showSeconds: true,
    showDate: true,
    dateFormat: "DD/MM/YYYY",
    theme: "dark",
    colors: {
      background: "rgba(0,0,0,0.7)",
      foreground: "#ffffff",
      accent: "#ff6b6b"
    }
  };

  function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || DEFAULTS[value]));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      // Merge with defaults to ensure all properties exist
      return { ...DEFAULTS, ...parsed };
    } catch (_err) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function formatDate(date, format) {
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: format.includes("12h")
    };
    
    if (format === "DD/MM/YYYY") {
      return date.toLocaleDateString("pt-BR");
    } else if (format === "MM/DD/YYYY") {
      return date.toLocaleDateString("en-US");
    } else if (format === "YYYY-MM-DD") {
      return date.toISOString().split("T")[0];
    } else {
      return date.toLocaleString();
    }
  }

  function formatTime(date, format, showSeconds) {
    if (format === "digital") {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      
      if (format.includes("12h")) {
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        const timeString = `${displayHours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}${showSeconds ? `:${seconds.toString().padStart(2, "0")}` : ""} ${period}`;
        return timeString;
      } else {
        const timeString = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}${showSeconds ? `:${seconds.toString().padStart(2, "0")}` : ""}`;
        return timeString;
      }
    } else {
      // For analog, we don't return a formatted string
      return null;
    }
  }

  window.AutoTuneWidgets.clock = function initClockWidget(bodyEl) {
    let settings = loadSettings();
    let animationFrame = null;
    let clockElement = null;
    let dateElement = null;
    let timezoneOffset = 0;

    // Create clock container
    const container = document.createElement("div");
    container.className = "autotune-clock-widget";
    container.style.position = "fixed";
    container.style.left = `${settings.x}px`;
    container.style.top = `${settings.y}px`;
    container.style.width = `${settings.w}px`;
    container.style.height = `${settings.h}px`;
    container.style.background = settings.colors.background;
    container.style.color = settings.colors.foreground;
    container.style.borderRadius = "8px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    container.style.zIndex = "1000";
    container.style.cursor = "default";
    container.style.userSelect = "none";
    container.style.transition = "all 0.3s ease";

    // Create time display
    clockElement = document.createElement("div");
    clockElement.className = "autotune-clock-time";
    clockElement.style.fontSize = "24px";
    clockElement.style.fontWeight = "bold";
    clockElement.style.marginBottom = "4px";

    // Create date display (if enabled)
    if (settings.showDate) {
      dateElement = document.createElement("div");
      dateElement.className = "autotune-clock-date";
      dateElement.style.fontSize = "14px";
      dateElement.style.opacity = "0.8";
    }

    // Assemble widget
    container.appendChild(clockElement);
    if (settings.showDate && dateElement) {
      container.appendChild(dateElement);
    }
    bodyEl.appendChild(container);

    // Update clock function
    function updateClock() {
      const now = new Date();
      
      // Apply timezone offset if needed
      if (settings.timezone !== "local") {
        // For simplicity, we'll just use local time for now
        // A proper implementation would use timezone libraries
      }

      // Update time display
      if (clockElement) {
        const timeString = formatTime(now, settings.format, settings.showSeconds);
        if (timeString) {
          clockElement.textContent = timeString;
        }
        // For analog clock, we would update CSS transformations here
      }

      // Update date display
      if (settings.showDate && dateElement) {
        dateElement.textContent = formatDate(now, settings.dateFormat);
      }

      // Request next frame
      animationFrame = requestAnimationFrame(updateClock);
    }

    // Start the clock
    updateClock();

    // Return cleanup function
    return function destroy() {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (container && container.parentNode) {
        bodyEl.removeChild(container);
      }
    };
  };

  // Widget metadata for the AutoTune system
  window.AutoTuneWidgetMeta.clock = {
    label: "AutoTune Clock",
    description: "Widget para exibir relógios personalizáveis",
    category: "utility",
    icon: "clock", // Assuming lucide icon exists
    defaultSettings: DEFAULTS,
    persistent: false, // Not persistent like music
    mediaGated: false // Not media gated like music
  };
})();
